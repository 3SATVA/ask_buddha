import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  APPLE_CONSUMABLE,
  APPLE_SUBSCRIPTION,
  SUBSCRIPTION_STATUS,
  endOfUtcDay,
  entitlementAfterStatus,
  entitlementForTransaction,
  pickEntitlement,
  storeTransactionFromDecoded,
  type StoreTransaction,
} from "./entitlement";
import { DAY_PASS, IOS_BUNDLE_ID, MONTHLY_PRODUCT } from "./products";

const NOW = new Date("2026-10-16T18:00:00.000Z");

function dayPass(overrides: Partial<StoreTransaction> = {}): StoreTransaction {
  return {
    productId: DAY_PASS.id,
    transactionId: "tip-1",
    bundleId: IOS_BUNDLE_ID,
    purchaseDateMs: new Date("2026-10-16T15:00:00.000Z").getTime(),
    expiresDateMs: null,
    revocationDateMs: null,
    type: APPLE_CONSUMABLE,
    ...overrides,
  };
}

function monthly(overrides: Partial<StoreTransaction> = {}): StoreTransaction {
  return {
    productId: MONTHLY_PRODUCT.id,
    transactionId: "sub-1",
    bundleId: IOS_BUNDLE_ID,
    purchaseDateMs: new Date("2026-10-01T12:00:00.000Z").getTime(),
    expiresDateMs: new Date("2026-11-01T12:00:00.000Z").getTime(),
    revocationDateMs: null,
    type: APPLE_SUBSCRIPTION,
    ...overrides,
  };
}

describe("entitlementForTransaction", () => {
  it("unlocks the rest of the UTC day for Unlimited today", () => {
    const grant = entitlementForTransaction(dayPass(), NOW);
    assert.equal(grant?.kind, "day");
    assert.equal(grant?.productId, DAY_PASS.id);
    assert.equal(grant?.until.toISOString(), "2026-10-16T23:59:59.999Z");
    assert.equal(endOfUtcDay(NOW).toISOString(), "2026-10-16T23:59:59.999Z");
  });

  it("does not honor a day pass from a previous UTC day", () => {
    const grant = entitlementForTransaction(
      dayPass({ purchaseDateMs: new Date("2026-10-15T23:30:00.000Z").getTime() }),
      NOW,
    );
    assert.equal(grant, null);
  });

  it("rejects a refunded day pass, the wrong app, and the wrong product type", () => {
    assert.equal(entitlementForTransaction(dayPass({ revocationDateMs: NOW.getTime() }), NOW), null);
    assert.equal(entitlementForTransaction(dayPass({ bundleId: "com.example.other" }), NOW), null);
    assert.equal(entitlementForTransaction(dayPass({ type: APPLE_SUBSCRIPTION }), NOW), null);
    assert.equal(entitlementForTransaction(dayPass({ productId: "com.example.unknown" }), NOW), null);
  });

  it("unlocks a monthly subscription until Apple's expiry", () => {
    const grant = entitlementForTransaction(monthly(), NOW);
    assert.equal(grant?.kind, "subscription");
    assert.equal(grant?.until.toISOString(), "2026-11-01T12:00:00.000Z");
  });

  it("rejects an expired, revoked, or mistyped subscription", () => {
    assert.equal(
      entitlementForTransaction(
        monthly({ expiresDateMs: new Date("2026-10-16T17:00:00.000Z").getTime() }),
        NOW,
      ),
      null,
    );
    assert.equal(entitlementForTransaction(monthly({ revocationDateMs: NOW.getTime() }), NOW), null);
    assert.equal(entitlementForTransaction(monthly({ type: APPLE_CONSUMABLE }), NOW), null);
  });

  it("keeps the entitlement that lasts longer", () => {
    const day = entitlementForTransaction(dayPass(), NOW);
    const subscription = entitlementForTransaction(monthly(), NOW);
    assert.ok(day && subscription);
    assert.equal(pickEntitlement([day, subscription])?.kind, "subscription");
    assert.equal(pickEntitlement([subscription, day])?.until.toISOString(), subscription.until.toISOString());
  });

  it("shows the monthly entitlement when a shorter subscription overlaps a day pass", () => {
    const day = entitlementForTransaction(dayPass(), NOW);
    const subscription = entitlementForTransaction(
      monthly({ expiresDateMs: new Date("2026-10-16T20:00:00.000Z").getTime() }),
      NOW,
    );
    assert.ok(day && subscription);
    const picked = pickEntitlement([day, subscription]);
    assert.equal(picked?.kind, "subscription");
    assert.equal(picked?.until.toISOString(), day.until.toISOString());
  });

  it("drops an expired subscription even if a grace date is missing, and honors a grace end", () => {
    assert.equal(
      entitlementAfterStatus(monthly(), SUBSCRIPTION_STATUS.expired, null, NOW),
      null,
    );
    assert.equal(
      entitlementAfterStatus(monthly(), SUBSCRIPTION_STATUS.revoked, null, NOW),
      null,
    );
    const graceEnd = new Date("2026-10-20T12:00:00.000Z").getTime();
    const grant = entitlementAfterStatus(
      monthly({ expiresDateMs: new Date("2026-10-16T12:00:00.000Z").getTime() }),
      SUBSCRIPTION_STATUS.gracePeriod,
      graceEnd,
      NOW,
    );
    assert.equal(grant?.until.toISOString(), "2026-10-20T12:00:00.000Z");
  });

  it("maps a decoded App Store payload", () => {
    const mapped = storeTransactionFromDecoded({
      productId: DAY_PASS.id,
      transactionId: "2000001",
      bundleId: IOS_BUNDLE_ID,
      purchaseDate: NOW.getTime(),
      type: APPLE_CONSUMABLE,
    });
    assert.equal(mapped?.productId, DAY_PASS.id);
    assert.equal(storeTransactionFromDecoded({ productId: "x" }), null);
  });
});
