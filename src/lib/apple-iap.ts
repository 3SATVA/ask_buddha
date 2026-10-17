import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  AppStoreServerAPIClient,
  Environment,
  SignedDataVerifier,
  type JWSTransactionDecodedPayload,
  type StatusResponse,
} from "@apple/app-store-server-library";
import {
  entitlementAfterStatus,
  entitlementForTransaction,
  pickEntitlement,
  storeTransactionFromDecoded,
  type GrantedEntitlement,
  type StoreTransaction,
} from "./entitlement";
import { IOS_BUNDLE_ID, isMonthlyProduct } from "./products";

export type AppleIapConfig = {
  keyId: string;
  issuerId: string;
  privateKey: string;
  bundleId: string;
  appAppleId?: number;
  onlineChecks: boolean;
};

/** Accept a raw .p8, a base64 .p8, or a value whose newlines were escaped. */
export function normalizePem(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const pem = trimmed.includes("BEGIN")
    ? trimmed
    : Buffer.from(trimmed, "base64").toString("utf8");
  return pem.replace(/\\n/g, "\n");
}

/**
 * In-App Purchase key from App Store Connect. This can be a different key
 * from the ASC_KEY_ID key used by the TestFlight workflow.
 */
export function readAppleIapConfig(
  env: Record<string, string | undefined> = process.env,
): AppleIapConfig | null {
  const keyId = env.APPLE_IAP_KEY_ID?.trim();
  const issuerId = env.APPLE_IAP_ISSUER_ID?.trim();
  const privateKey = normalizePem(env.APPLE_IAP_PRIVATE_KEY ?? "");
  if (!keyId || !issuerId || !privateKey.includes("BEGIN")) return null;
  const appAppleIdRaw = env.APPLE_APP_APPLE_ID?.trim();
  const appAppleId = appAppleIdRaw ? Number(appAppleIdRaw) : undefined;
  return {
    keyId,
    issuerId,
    privateKey,
    bundleId: env.APPLE_BUNDLE_ID?.trim() || IOS_BUNDLE_ID,
    appAppleId: appAppleId && Number.isInteger(appAppleId) ? appAppleId : undefined,
    onlineChecks: env.APPLE_IAP_ONLINE_CHECKS === "true",
  };
}

let rootCache: Buffer[] | null = null;

function rootCertificates() {
  if (rootCache) return rootCache;
  const dir = join(process.cwd(), "certs");
  rootCache = ["AppleRootCA-G3.cer", "AppleRootCA-G2.cer"].map((name) =>
    readFileSync(join(dir, name)),
  );
  return rootCache;
}

/** Read the environment claim so the matching verifier can be selected. The signature check comes next. */
export function environmentOfJws(jws: string): Environment | null {
  const parts = jws.split(".");
  if (parts.length !== 3 || !parts[1]) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as {
      environment?: string;
    };
    if (payload.environment === Environment.PRODUCTION) return Environment.PRODUCTION;
    if (payload.environment === Environment.SANDBOX) return Environment.SANDBOX;
    if (payload.environment === Environment.XCODE) return Environment.XCODE;
    if (payload.environment === Environment.LOCAL_TESTING) return Environment.LOCAL_TESTING;
    return null;
  } catch {
    return null;
  }
}

function verifierFor(
  config: { onlineChecks: boolean; bundleId: string; appAppleId?: number },
  environment: Environment,
) {
  return new SignedDataVerifier(
    rootCertificates(),
    config.onlineChecks,
    environment,
    config.bundleId,
    environment === Environment.PRODUCTION ? config.appAppleId : undefined,
  );
}

function clientFor(config: AppleIapConfig, environment: Environment) {
  return new AppStoreServerAPIClient(
    config.privateKey,
    config.keyId,
    config.issuerId,
    config.bundleId,
    environment,
  );
}

function matchingStatusItem(
  response: StatusResponse,
  originalTransactionId: string | undefined,
) {
  const items = (response.data ?? []).flatMap((group) => group.lastTransactions ?? []);
  if (!originalTransactionId) return undefined;
  return items.find((item) => item.originalTransactionId === originalTransactionId);
}

async function authoritativeTransaction(
  config: AppleIapConfig,
  environment: Environment,
  clientPayload: JWSTransactionDecodedPayload,
) {
  const transactionId = clientPayload.transactionId;
  if (!transactionId) return null;
  const client = clientFor(config, environment);
  const info = await client.getTransactionInfo(transactionId);
  if (!info.signedTransactionInfo) return null;
  const verifier = verifierFor(config, environment);
  let payload = await verifier.verifyAndDecodeTransaction(info.signedTransactionInfo);
  if (
    clientPayload.originalTransactionId &&
    payload.originalTransactionId &&
    payload.originalTransactionId !== clientPayload.originalTransactionId
  ) {
    return null;
  }

  let status: number | undefined;
  let gracePeriodExpiresMs: number | null = null;
  if (isMonthlyProduct(payload.productId ?? "")) {
    const statuses = await client.getAllSubscriptionStatuses(transactionId);
    const item = matchingStatusItem(statuses, payload.originalTransactionId);
    if (item?.signedTransactionInfo) {
      payload = await verifier.verifyAndDecodeTransaction(item.signedTransactionInfo);
    }
    if (typeof item?.status === "number") status = item.status;
    if (item?.signedRenewalInfo) {
      const renewal = await verifier.verifyAndDecodeRenewalInfo(item.signedRenewalInfo);
      gracePeriodExpiresMs = renewal.gracePeriodExpiresDate ?? null;
    }
  }

  const transaction = storeTransactionFromDecoded(payload);
  if (!transaction) return null;
  return { transaction, status, gracePeriodExpiresMs };
}

export type AppleVerifyOptions = {
  bundleId: string;
  appAppleId?: number;
  onlineChecks: boolean;
  /** Present only when the App Store Server API key is configured. */
  api: AppleIapConfig | null;
};

/**
 * StoreKit verification does not require an API key. The signed transaction's
 * certificate chain is checked against Apple Root CA G3. The API is an extra
 * check when APPLE_IAP_KEY_ID, APPLE_IAP_ISSUER_ID, and APPLE_IAP_PRIVATE_KEY are set.
 */
export function readAppleVerifyOptions(
  env: Record<string, string | undefined> = process.env,
): AppleVerifyOptions {
  const api = readAppleIapConfig(env);
  const appAppleIdRaw = env.APPLE_APP_APPLE_ID?.trim();
  const appAppleId = appAppleIdRaw ? Number(appAppleIdRaw) : undefined;
  return {
    bundleId: api?.bundleId || env.APPLE_BUNDLE_ID?.trim() || IOS_BUNDLE_ID,
    appAppleId:
      appAppleId && Number.isInteger(appAppleId) ? appAppleId : api?.appAppleId,
    onlineChecks: env.APPLE_IAP_ONLINE_CHECKS === "true" || Boolean(api?.onlineChecks),
    api,
  };
}

type ApiConfirmation = {
  transaction: StoreTransaction;
  status?: number;
  gracePeriodExpiresMs: number | null;
};

export type AppleVerifyHooks = {
  verifyTransaction?: (
    signed: string,
    environment: Environment,
    options: AppleVerifyOptions,
  ) => Promise<JWSTransactionDecodedPayload>;
  confirmWithApi?: (
    options: AppleVerifyOptions,
    environment: Environment,
    payload: JWSTransactionDecodedPayload,
  ) => Promise<ApiConfirmation | null>;
};

async function verifyTransactionWithApple(
  signed: string,
  environment: Environment,
  options: AppleVerifyOptions,
) {
  return verifierFor(options, environment).verifyAndDecodeTransaction(signed);
}

/**
 * Verify each StoreKit 2 JWS locally. Sandbox and Production are both accepted.
 * When an API key is configured, that confirmation is preferred. If the API
 * itself cannot be reached, the already-verified signature still grants access.
 */
export async function confirmSignedTransactions(
  signedTransactions: string[],
  options: AppleVerifyOptions,
  now = new Date(),
  hooks: AppleVerifyHooks = {},
): Promise<{ ok: true; entitlement: GrantedEntitlement } | { ok: false }> {
  const verifyTransaction = hooks.verifyTransaction ?? verifyTransactionWithApple;
  const confirmWithApi =
    hooks.confirmWithApi ??
    (async (verifyOptions, environment, payload) => {
      if (!verifyOptions.api) return null;
      return authoritativeTransaction(verifyOptions.api, environment, payload);
    });
  const grants: GrantedEntitlement[] = [];
  for (const signed of signedTransactions) {
    const environment = environmentOfJws(signed);
    if (!environment || environment === Environment.XCODE || environment === Environment.LOCAL_TESTING) {
      continue;
    }
    if (environment === Environment.PRODUCTION && !options.appAppleId) {
      console.error("ASK BUDDHA purchase: APPLE_APP_APPLE_ID is required for production transactions.");
      continue;
    }
    try {
      const clientPayload = await verifyTransaction(signed, environment, options);
      let grant: GrantedEntitlement | null = null;
      if (options.api) {
        try {
          const confirmed = await confirmWithApi(options, environment, clientPayload);
          if (!confirmed) continue;
          grant = entitlementAfterStatus(
            confirmed.transaction,
            confirmed.status,
            confirmed.gracePeriodExpiresMs,
            now,
            options.bundleId,
          );
          if (grant) grants.push(grant);
          continue;
        } catch (error) {
          const message = error instanceof Error ? error.message : "unknown error";
          console.error(
            "ASK BUDDHA purchase: App Store Server API check failed; using the signed transaction.",
            message,
          );
        }
      }
      if (!grant) {
        const transaction = storeTransactionFromDecoded(clientPayload);
        if (!transaction) continue;
        grant = entitlementForTransaction(transaction, now, options.bundleId);
      }
      if (grant) grants.push(grant);
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      console.error("ASK BUDDHA purchase verification failed:", message);
    }
  }
  const entitlement = pickEntitlement(grants);
  if (!entitlement) return { ok: false };
  return { ok: true, entitlement };
}
