/** App id for the iOS and Android shells. */
export const IOS_BUNDLE_ID = "com.starseedsquad.askbuddha";

/** Same id as the iOS bundle. Google Play calls it the package name. */
export const APP_PACKAGE_ID = IOS_BUNDLE_ID;

export type StoreName = "apple" | "google";

/**
 * Consumable day pass. It unlocks unlimited messages until the end of the
 * UTC day of the purchase. The price is a suggestion for App Store Connect;
 * the paywall shows the price StoreKit returns when it has one.
 */
export const DAY_PASS = {
  id: "com.starseedsquad.askbuddha.unlimited.today",
  fallbackPrice: "$0.99",
  title: "Unlimited today",
  detail: "Unlimited messages until midnight UTC",
} as const;

/** Auto-renewable monthly subscription. Suggested price: $6.99 per month. */
export const MONTHLY_PRODUCT = {
  id: "com.starseedsquad.askbuddha.unlimited.monthly",
  fallbackPrice: "$6.99/month",
  title: "Monthly",
  detail: "Unlimited messages, renewing every month",
} as const;

export const SUBSCRIPTION_GROUP = "Ask AI Buddha Unlimited";

/**
 * Google Play product IDs are lowercase and 1–40 characters.
 * com.starseedsquad.askbuddha.unlimited.today is 43 characters, and
 * com.starseedsquad.askbuddha.unlimited.monthly is 45, so Play Console
 * rejects those Apple IDs. These shorter IDs are the same two products:
 * a consumable day pass and an auto-renewing monthly subscription.
 */
export const GOOGLE_DAY_PASS = {
  id: "unlimited.today",
  fallbackPrice: "$0.99",
  title: "Unlimited today",
  detail: "Unlimited messages until midnight UTC",
} as const;

export const GOOGLE_MONTHLY_PRODUCT = {
  id: "unlimited.monthly",
  basePlanId: "monthly",
  fallbackPrice: "$6.99/month",
  title: "Monthly",
  detail: "Unlimited messages, renewing every month",
} as const;

export const PRODUCT_IDS = [DAY_PASS.id, MONTHLY_PRODUCT.id] as const;

export function catalogFor(store: StoreName) {
  if (store === "google") return { day: GOOGLE_DAY_PASS, monthly: GOOGLE_MONTHLY_PRODUCT };
  return { day: DAY_PASS, monthly: MONTHLY_PRODUCT };
}

export function isDayPass(productId: string) {
  return productId === DAY_PASS.id || productId === GOOGLE_DAY_PASS.id;
}

export function isMonthlyProduct(productId: string) {
  return productId === MONTHLY_PRODUCT.id || productId === GOOGLE_MONTHLY_PRODUCT.id;
}

export function isKnownProduct(productId: string) {
  return isDayPass(productId) || isMonthlyProduct(productId);
}
