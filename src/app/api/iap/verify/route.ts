import { NextResponse, type NextRequest } from "next/server";
import { confirmSignedTransactions, readAppleVerifyOptions } from "@/lib/apple-iap";
import { confirmGooglePurchases, readGooglePlayConfig } from "@/lib/google-play";
import { pickEntitlement, type GrantedEntitlement } from "@/lib/entitlement";
import { isKnownProduct } from "@/lib/products";
import {
  presentedUnlock,
  readUnlock,
  reportMissingUnlockSecret,
  sealUnlock,
  unlockClearCookie,
  unlockMaxAgeSeconds,
  unlockSecret,
  unlockSetCookie,
} from "@/lib/unlock-cookie";

export const maxDuration = 30;

const NOT_CONFIRMED = "That purchase could not be confirmed. You can try again.";
const NOT_READY = "Purchases are not available just yet.";

function notReady() {
  return NextResponse.json(
    { error: "not_configured", message: NOT_READY },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}

function rememberedGrant(request: NextRequest, secret: string, now: Date): GrantedEntitlement | null {
  const existing = readUnlock(presentedUnlock(request), secret, now);
  if (!existing) return null;
  return {
    kind: existing.kind,
    until: new Date(existing.until),
    transactionId: existing.transactionId,
    productId: existing.productId,
  };
}

/** A new purchase keeps a still-active subscription ahead of a day pass. */
function grantToSeal(request: NextRequest, secret: string, grant: GrantedEntitlement, replace: boolean, now: Date) {
  if (replace) return grant;
  const remembered = rememberedGrant(request, secret, now);
  if (!remembered) return grant;
  return pickEntitlement([grant, remembered]) ?? grant;
}

function grantResponse(entitlement: GrantedEntitlement, secret: string, now: Date) {
  const payload = {
    kind: entitlement.kind,
    until: entitlement.until.toISOString(),
    transactionId: entitlement.transactionId,
    productId: entitlement.productId,
  };
  const unlockToken = sealUnlock(payload, secret);
  return NextResponse.json(
    {
      unlocked: true,
      unlockKind: payload.kind,
      until: payload.until,
      productId: payload.productId,
      unlockToken,
    },
    {
      headers: {
        "Cache-Control": "no-store",
        "Set-Cookie": unlockSetCookie(unlockToken, unlockMaxAgeSeconds(entitlement.until, now)),
      },
    },
  );
}

function notConfirmed(request: NextRequest, secret: string, replace: boolean, now: Date) {
  const existing = readUnlock(presentedUnlock(request), secret, now);
  if (replace && existing?.kind === "subscription") {
    return NextResponse.json(
      { error: "not_confirmed", message: NOT_CONFIRMED, unlocked: false, unlockKind: null },
      { status: 402, headers: { "Cache-Control": "no-store", "Set-Cookie": unlockClearCookie() } },
    );
  }
  return NextResponse.json(
    { error: "not_confirmed", message: NOT_CONFIRMED },
    { status: 402, headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  const secret = unlockSecret();
  if (!secret) {
    reportMissingUnlockSecret();
    return notReady();
  }

  let body: { signedTransactions?: unknown; googlePurchases?: unknown; replace?: unknown };
  try {
    body = (await request.json()) as {
      signedTransactions?: unknown;
      googlePurchases?: unknown;
      replace?: unknown;
    };
  } catch {
    body = {};
  }

  const signedTransactions = Array.isArray(body.signedTransactions)
    ? body.signedTransactions.filter((item): item is string => typeof item === "string").slice(0, 20)
    : [];
  const googlePurchases = Array.isArray(body.googlePurchases)
    ? body.googlePurchases
        .filter(
          (item): item is { productId: string; purchaseToken: string } =>
            Boolean(item) &&
            typeof item === "object" &&
            typeof (item as { productId?: unknown }).productId === "string" &&
            typeof (item as { purchaseToken?: unknown }).purchaseToken === "string" &&
            isKnownProduct((item as { productId: string }).productId) &&
            (item as { purchaseToken: string }).purchaseToken.length > 0 &&
            (item as { purchaseToken: string }).purchaseToken.length <= 4096,
        )
        .slice(0, 20)
    : [];
  const replace = body.replace === true;
  const now = new Date();

  if (signedTransactions.length > 0 && googlePurchases.length > 0) {
    return NextResponse.json(
      { error: "invalid", message: NOT_CONFIRMED },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (signedTransactions.length === 0 && googlePurchases.length === 0) {
    if (!replace) {
      return NextResponse.json(
        { error: "invalid", message: NOT_CONFIRMED },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
    const existing = readUnlock(presentedUnlock(request), secret, now);
    if (existing?.kind === "subscription") {
      return NextResponse.json(
        { unlocked: false, unlockKind: null },
        { headers: { "Cache-Control": "no-store", "Set-Cookie": unlockClearCookie() } },
      );
    }
    return NextResponse.json(
      { unlocked: Boolean(existing), unlockKind: existing?.kind ?? null },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  if (googlePurchases.length > 0) {
    const config = readGooglePlayConfig();
    if (!config) return notReady();
    const result = await confirmGooglePurchases(googlePurchases, config, now);
    if (!result.ok) return notConfirmed(request, secret, replace, now);
    return grantResponse(grantToSeal(request, secret, result.entitlement, replace, now), secret, now);
  }

  const options = readAppleVerifyOptions();
  if (!options.api) {
    console.warn(
      "ASK BUDDHA purchase: APPLE_IAP_KEY_ID, APPLE_IAP_ISSUER_ID, and APPLE_IAP_PRIVATE_KEY are unset. The signed transaction is verified from Apple's signature.",
    );
  }
  const result = await confirmSignedTransactions(signedTransactions, options, now);
  if (!result.ok) return notConfirmed(request, secret, replace, now);
  return grantResponse(grantToSeal(request, secret, result.entitlement, replace, now), secret, now);
}
