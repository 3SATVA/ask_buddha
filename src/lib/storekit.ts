"use client";

import type { Product } from "@capgo/native-purchases";
import {
  GOOGLE_MONTHLY_PRODUCT,
  catalogFor,
  isDayPass,
  isKnownProduct,
  isMonthlyProduct,
  type StoreName,
} from "@/lib/products";
import { setUnlockSuppressed, unlockSuppressed } from "@/lib/tester-device";
import { applyUnlockResponse, unlockRequestHeaders } from "@/lib/unlock-token";

export type UnlockKind = "day" | "subscription";

type GooglePurchase = { productId: string; purchaseToken: string };

async function nativePurchases() {
  const { NativePurchases, PURCHASE_TYPE } = await import("@capgo/native-purchases");
  return { NativePurchases, PURCHASE_TYPE };
}

export async function nativeStore(): Promise<StoreName | null> {
  if (typeof window === "undefined") return null;
  const { Capacitor } = await import("@capacitor/core");
  if (!Capacitor.isNativePlatform()) return null;
  if (Capacitor.getPlatform() === "ios") return "apple";
  if (Capacitor.getPlatform() === "android") return "google";
  return null;
}

function signedFrom(purchases: { jwsRepresentation?: string }[]) {
  return purchases
    .map((purchase) => purchase.jwsRepresentation)
    .filter((signed): signed is string => Boolean(signed));
}

function googleFrom(
  purchases: { productIdentifier?: string; purchaseToken?: string; purchaseState?: string }[],
) {
  const seen = new Set<string>();
  const next: GooglePurchase[] = [];
  for (const purchase of purchases) {
    if (!purchase.productIdentifier || !purchase.purchaseToken) continue;
    if (purchase.purchaseState != null && purchase.purchaseState !== "1") continue;
    const productId =
      purchase.productIdentifier === GOOGLE_MONTHLY_PRODUCT.basePlanId
        ? GOOGLE_MONTHLY_PRODUCT.id
        : purchase.productIdentifier;
    if (!isKnownProduct(productId) || seen.has(purchase.purchaseToken)) continue;
    seen.add(purchase.purchaseToken);
    next.push({ productId, purchaseToken: purchase.purchaseToken });
  }
  return next;
}

export type VerifiedUnlock = {
  unlocked?: boolean;
  unlockKind?: UnlockKind | null;
  unlockToken?: string;
  message?: string;
};

async function postVerify(body: {
  signedTransactions?: string[];
  googlePurchases?: GooglePurchase[];
  replace: boolean;
}): Promise<VerifiedUnlock> {
  const response = await fetch("/api/iap/verify", {
    method: "POST",
    headers: unlockRequestHeaders({ "Content-Type": "application/json" }),
    credentials: "include",
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => null)) as VerifiedUnlock | null;
  if (!response.ok) {
    applyUnlockResponse(data);
    throw new Error(data?.message || "That purchase could not be confirmed.");
  }
  if (data?.unlocked) setUnlockSuppressed(false);
  applyUnlockResponse(data);
  return data ?? {};
}

function priceKey(product: Product) {
  return product.planIdentifier || product.identifier;
}

export async function loadStorePrices(store: StoreName = "apple") {
  const prices: Record<string, string> = {};
  const catalog = catalogFor(store);
  try {
    const { NativePurchases, PURCHASE_TYPE } = await nativePurchases();
    const dayPass = await NativePurchases.getProducts({
      productIdentifiers: [catalog.day.id],
      productType: PURCHASE_TYPE.INAPP,
    });
    const monthly = await NativePurchases.getProducts({
      productIdentifiers: [catalog.monthly.id],
      productType: PURCHASE_TYPE.SUBS,
    });
    for (const product of [...dayPass.products, ...monthly.products]) {
      const key = priceKey(product);
      if (key && product.priceString) prices[key] = product.priceString;
    }
  } catch {
    // Store prices are optional. The buttons keep the suggested prices.
  }
  return prices;
}

async function settle(store: StoreName, productId: string, token: string) {
  const { NativePurchases } = await nativePurchases();
  if (store === "google" && isDayPass(productId)) {
    await NativePurchases.consumePurchase({ purchaseToken: token });
    return;
  }
  await NativePurchases.acknowledgePurchase({ purchaseToken: token });
}

export async function purchaseProduct(productId: string) {
  if (!isKnownProduct(productId)) throw new Error("That purchase is not available.");
  const store = (await nativeStore()) ?? "apple";
  const { NativePurchases, PURCHASE_TYPE } = await nativePurchases();
  const billing = await NativePurchases.isBillingSupported();
  if (!billing.isBillingSupported) throw new Error("Purchases are not available on this device.");
  await NativePurchases.configure({ autoFinishTransactions: false });

  let planIdentifier: string | undefined;
  let offerToken: string | undefined;
  if (store === "google" && isMonthlyProduct(productId)) {
    const { products } = await NativePurchases.getProducts({
      productIdentifiers: [productId],
      productType: PURCHASE_TYPE.SUBS,
    });
    const offer =
      products.find((product) => product.identifier === GOOGLE_MONTHLY_PRODUCT.basePlanId) ??
      products[0];
    planIdentifier = offer?.identifier || GOOGLE_MONTHLY_PRODUCT.basePlanId;
    offerToken = offer?.offerToken;
  }

  const transaction = await NativePurchases.purchaseProduct({
    productIdentifier: productId,
    productType: isMonthlyProduct(productId) ? PURCHASE_TYPE.SUBS : PURCHASE_TYPE.INAPP,
    planIdentifier,
    offerToken,
    quantity: 1,
    isConsumable: false,
    autoAcknowledgePurchases: false,
  });

  if (store === "google") {
    if (transaction.purchaseState != null && transaction.purchaseState !== "1") {
      throw new Error("That purchase is still pending.");
    }
    if (!transaction.purchaseToken) throw new Error("Google Play did not return a purchase token.");
    const verified = await postVerify({
      googlePurchases: [{ productId, purchaseToken: transaction.purchaseToken }],
      replace: false,
    });
    await settle("google", productId, transaction.purchaseToken);
    return verified;
  }

  if (!transaction.jwsRepresentation) throw new Error("Apple did not return a signed transaction.");
  const verified = await postVerify({
    signedTransactions: [transaction.jwsRepresentation],
    replace: false,
  });
  if (transaction.transactionId) await settle("apple", productId, transaction.transactionId);
  return verified;
}

export async function restorePurchases() {
  const store = (await nativeStore()) ?? "apple";
  const { NativePurchases, PURCHASE_TYPE } = await nativePurchases();
  await NativePurchases.configure({ autoFinishTransactions: false });
  await NativePurchases.restorePurchases();
  const subscriptions = await NativePurchases.getPurchases({
    productType: PURCHASE_TYPE.SUBS,
    onlyCurrentEntitlements: true,
  });
  const inApp = await NativePurchases.getPurchases({
    productType: PURCHASE_TYPE.INAPP,
    onlyCurrentEntitlements: true,
  });
  const unfinished = await NativePurchases.getUnfinishedTransactions();
  const purchases = [...subscriptions.purchases, ...inApp.purchases, ...unfinished.transactions];
  if (store === "google") {
    const googlePurchases = googleFrom(purchases);
    if (googlePurchases.length === 0) {
      const data = await postVerify({ googlePurchases: [], replace: true });
      if (data?.unlocked) return data;
      throw new Error("Nothing active to restore. Unlimited today lasts until the day ends.");
    }
    const verified = await postVerify({ googlePurchases, replace: true });
    for (const purchase of googlePurchases) {
      await settle("google", purchase.productId, purchase.purchaseToken);
    }
    return verified;
  }
  const signed = signedFrom(purchases);
  if (signed.length === 0) {
    const data = await postVerify({ signedTransactions: [], replace: true });
    if (data?.unlocked) return data;
    throw new Error("Nothing active to restore. Unlimited today lasts until the day ends.");
  }
  return postVerify({ signedTransactions: signed, replace: true });
}

/**
 * On launch, ask the store for the active subscription and any unfinished
 * day pass. A finished day pass stays in the stored unlock token.
 */
export async function refreshNativeEntitlement(unlockKind: UnlockKind | null) {
  if (unlockSuppressed()) return;
  const store = await nativeStore();
  if (!store) return;
  const { NativePurchases, PURCHASE_TYPE } = await nativePurchases();
  await NativePurchases.configure({ autoFinishTransactions: false });
  const subscriptions = await NativePurchases.getPurchases({
    productType: PURCHASE_TYPE.SUBS,
    onlyCurrentEntitlements: true,
  });
  const inApp = await NativePurchases.getPurchases({
    productType: PURCHASE_TYPE.INAPP,
    onlyCurrentEntitlements: true,
  });
  const unfinished = await NativePurchases.getUnfinishedTransactions();
  const purchases = [...subscriptions.purchases, ...inApp.purchases, ...unfinished.transactions];
  if (store === "google") {
    const googlePurchases = googleFrom(purchases);
    if (googlePurchases.length > 0) {
      await postVerify({ googlePurchases, replace: false });
      for (const purchase of googlePurchases) {
        await settle("google", purchase.productId, purchase.purchaseToken);
      }
      return;
    }
    if (unlockKind === "subscription") await postVerify({ googlePurchases: [], replace: true });
    return;
  }
  const signed = signedFrom(purchases);
  if (signed.length > 0) {
    await postVerify({ signedTransactions: signed, replace: false });
    return;
  }
  if (unlockKind === "subscription") await postVerify({ signedTransactions: [], replace: true });
}

export async function listenForUnfinishedTransactions(onGranted: () => void) {
  const store = await nativeStore();
  if (store !== "apple") return { remove() {} };
  const { NativePurchases } = await nativePurchases();
  await NativePurchases.configure({ autoFinishTransactions: false });
  return NativePurchases.addListener("transactionUpdated", async (transaction) => {
    if (unlockSuppressed()) return;
    if (!transaction.jwsRepresentation) return;
    try {
      await postVerify({ signedTransactions: [transaction.jwsRepresentation], replace: false });
      if (transaction.transactionId) await settle("apple", transaction.productIdentifier, transaction.transactionId);
      onGranted();
    } catch {
      // Leave the transaction unfinished so a later launch can try again.
    }
  });
}

export async function manageSubscriptions() {
  const { NativePurchases } = await nativePurchases();
  await NativePurchases.manageSubscriptions();
}

export function purchaseWasCancelled(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /cancel/i.test(message);
}
