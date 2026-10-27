import { JWT } from "google-auth-library";
import { endOfUtcDay, pickEntitlement, type GrantedEntitlement } from "./entitlement";
import { APP_PACKAGE_ID, isDayPass, isKnownProduct, isMonthlyProduct } from "./products";

const PLAY_SCOPE = "https://www.googleapis.com/auth/androidpublisher";
const PLAY_API = "https://androidpublisher.googleapis.com/androidpublisher/v3/applications";

/** States that still include access until the line item expiry. */
const GRANTING_SUBSCRIPTION_STATES = new Set([
  "SUBSCRIPTION_STATE_ACTIVE",
  "SUBSCRIPTION_STATE_CANCELED",
  "SUBSCRIPTION_STATE_IN_GRACE_PERIOD",
]);

export type GooglePlayConfig = {
  packageName: string;
  clientEmail: string;
  privateKey: string;
};

export type GooglePurchaseRequest = {
  productId: string;
  purchaseToken: string;
};

type ServiceAccount = {
  client_email: string;
  private_key: string;
};

/** Accept raw JSON, base64 JSON, or a private key whose newlines were escaped. */
export function parseServiceAccountJson(raw: string): ServiceAccount | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let text = trimmed;
  if (!trimmed.startsWith("{")) {
    try {
      text = Buffer.from(trimmed, "base64").toString("utf8");
    } catch {
      return null;
    }
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const account = parsed as { type?: unknown; client_email?: unknown; private_key?: unknown };
  if (account.type !== "service_account") return null;
  if (typeof account.client_email !== "string" || !account.client_email.includes("@")) return null;
  if (typeof account.private_key !== "string" || !account.private_key.includes("BEGIN")) return null;
  return {
    client_email: account.client_email,
    private_key: account.private_key.replace(/\\n/g, "\n"),
  };
}

export function readGooglePlayConfig(
  env: Record<string, string | undefined> = process.env,
): GooglePlayConfig | null {
  const account = parseServiceAccountJson(env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON ?? "");
  if (!account) return null;
  return {
    packageName: env.GOOGLE_PLAY_PACKAGE_NAME?.trim() || APP_PACKAGE_ID,
    clientEmail: account.client_email,
    privateKey: account.private_key,
  };
}

type ProductPurchase = {
  purchaseState?: number;
  consumptionState?: number;
  purchaseTimeMillis?: string;
  orderId?: string;
};

type SubscriptionLine = {
  productId?: string;
  expiryTime?: string;
};

type SubscriptionPurchase = {
  subscriptionState?: string;
  acknowledgementState?: string;
  latestOrderId?: string;
  lineItems?: SubscriptionLine[];
};

/** A purchased consumable lasts until the end of its purchase UTC day. */
export function entitlementForGoogleProduct(
  productId: string,
  body: ProductPurchase,
  now: Date,
): GrantedEntitlement | null {
  if (!isDayPass(productId)) return null;
  if (body.purchaseState !== 0) return null;
  const purchaseMs = Number(body.purchaseTimeMillis);
  if (!Number.isFinite(purchaseMs)) return null;
  const until = endOfUtcDay(new Date(purchaseMs));
  if (now.getTime() > until.getTime()) return null;
  if (!body.orderId) return null;
  return {
    kind: "day",
    until,
    transactionId: body.orderId,
    productId,
  };
}

/**
 * Active, canceled-but-unexpired, and grace-period subscriptions grant access
 * until Google's expiry. On hold, paused, pending, and expired do not.
 */
export function entitlementForGoogleSubscription(
  productId: string,
  body: SubscriptionPurchase,
  now: Date,
): GrantedEntitlement | null {
  if (!isMonthlyProduct(productId)) return null;
  if (!body.subscriptionState || !GRANTING_SUBSCRIPTION_STATES.has(body.subscriptionState)) {
    return null;
  }
  let expiryMs = 0;
  for (const item of body.lineItems ?? []) {
    if (item.productId !== productId || !item.expiryTime) continue;
    const ms = Date.parse(item.expiryTime);
    if (Number.isFinite(ms) && ms > expiryMs) expiryMs = ms;
  }
  if (!expiryMs || now.getTime() > expiryMs) return null;
  if (!body.latestOrderId) return null;
  return {
    kind: "subscription",
    until: new Date(expiryMs),
    transactionId: body.latestOrderId,
    productId,
  };
}

async function defaultAccessToken(config: GooglePlayConfig) {
  const jwt = new JWT({
    email: config.clientEmail,
    key: config.privateKey,
    scopes: [PLAY_SCOPE],
  });
  const token = await jwt.getAccessToken();
  if (!token.token) throw new Error("Google Play auth returned no token");
  return token.token;
}

function playUrl(config: GooglePlayConfig, purchase: GooglePurchaseRequest) {
  const packageName = encodeURIComponent(config.packageName);
  const token = encodeURIComponent(purchase.purchaseToken);
  if (isDayPass(purchase.productId)) {
    const productId = encodeURIComponent(purchase.productId);
    return `${PLAY_API}/${packageName}/purchases/products/${productId}/tokens/${token}`;
  }
  return `${PLAY_API}/${packageName}/purchases/subscriptionsv2/tokens/${token}`;
}

function settleUrl(config: GooglePlayConfig, purchase: GooglePurchaseRequest) {
  const packageName = encodeURIComponent(config.packageName);
  const productId = encodeURIComponent(purchase.productId);
  const token = encodeURIComponent(purchase.purchaseToken);
  if (isDayPass(purchase.productId)) {
    return `${PLAY_API}/${packageName}/purchases/products/${productId}/tokens/${token}:consume`;
  }
  return `${PLAY_API}/${packageName}/purchases/subscriptions/${productId}/tokens/${token}:acknowledge`;
}

type SettleResult = "settled" | "skipped" | "failed";

function playAlreadySettled(text: string) {
  return /alreadyAcknowledged|alreadyConsumed|concurrentUpdate|already been consumed|already been acknowledged/i.test(
    text,
  );
}

/**
 * A day pass is consumed. A subscription is acknowledged. Either call is
 * what stops Google from refunding an unfinished purchase. Already settled
 * purchases count as success so restore can run again.
 */
async function settleGooglePurchase(
  config: GooglePlayConfig,
  purchase: GooglePurchaseRequest,
  body: ProductPurchase & SubscriptionPurchase,
  accessToken: string,
  fetchImpl: typeof fetch,
): Promise<SettleResult> {
  if (isDayPass(purchase.productId)) {
    if (body.purchaseState !== 0) return "skipped";
    if (body.consumptionState === 1) return "settled";
  } else {
    if (!body.subscriptionState || body.subscriptionState === "SUBSCRIPTION_STATE_PENDING") {
      return "skipped";
    }
    if (body.acknowledgementState === "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED") return "settled";
  }

  const response = await fetchImpl(settleUrl(config, purchase), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  if (response.ok) return "settled";
  const text = await response.text().catch(() => "");
  if (playAlreadySettled(text)) return "settled";
  console.error("ASK BUDDHA Play acknowledge failed:", response.status);
  return "failed";
}

/**
 * Confirm each purchase token with the Google Play Developer API.
 * A valid purchase is consumed or acknowledged before it can unlock the app.
 * The API response is what grants access.
 */
export async function confirmGooglePurchases(
  purchases: GooglePurchaseRequest[],
  config: GooglePlayConfig,
  now = new Date(),
  deps?: {
    fetch?: typeof fetch;
    accessToken?: (config: GooglePlayConfig) => Promise<string>;
  },
): Promise<{ ok: true; entitlement: GrantedEntitlement } | { ok: false }> {
  const known = purchases.filter(
    (purchase) =>
      isKnownProduct(purchase.productId) &&
      purchase.purchaseToken.length > 0 &&
      purchase.purchaseToken.length <= 4096,
  );
  if (known.length === 0) return { ok: false };

  let token: string;
  try {
    token = await (deps?.accessToken ?? defaultAccessToken)(config);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.error("ASK BUDDHA Play auth failed:", message);
    return { ok: false };
  }

  const fetchImpl = deps?.fetch ?? fetch;
  const grants: GrantedEntitlement[] = [];
  for (const purchase of known) {
    try {
      const response = await fetchImpl(playUrl(config, purchase), {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      if (!response.ok) {
        console.error("ASK BUDDHA Play verification failed:", response.status);
        continue;
      }
      const body = (await response.json()) as ProductPurchase & SubscriptionPurchase;
      const grant = isDayPass(purchase.productId)
        ? entitlementForGoogleProduct(purchase.productId, body, now)
        : entitlementForGoogleSubscription(purchase.productId, body, now);
      const settled = await settleGooglePurchase(config, purchase, body, token, fetchImpl);
      if (settled === "failed") continue;
      if (grant && settled === "settled") grants.push(grant);
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      console.error("ASK BUDDHA Play verification failed:", message);
    }
  }

  const entitlement = pickEntitlement(grants);
  if (!entitlement) return { ok: false };
  return { ok: true, entitlement };
}
