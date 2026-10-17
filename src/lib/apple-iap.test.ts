import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Environment, type JWSTransactionDecodedPayload } from "@apple/app-store-server-library";
import {
  confirmSignedTransactions,
  environmentOfJws,
  normalizePem,
  type AppleVerifyOptions,
} from "./apple-iap";
import { APPLE_CONSUMABLE, APPLE_SUBSCRIPTION, SUBSCRIPTION_STATUS } from "./entitlement";
import { DAY_PASS, IOS_BUNDLE_ID, MONTHLY_PRODUCT } from "./products";

function jws(payload: unknown) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `aaa.${body}.bbb`;
}

describe("Apple purchase config helpers", () => {
  it("reads the environment claim without trusting the signature", () => {
    assert.equal(environmentOfJws(jws({ environment: "Sandbox" })), Environment.SANDBOX);
    assert.equal(environmentOfJws(jws({ environment: "Production" })), Environment.PRODUCTION);
    assert.equal(environmentOfJws("not-a-jws"), null);
  });

  it("accepts a .p8 with escaped newlines", () => {
    const pem = normalizePem("-----BEGIN PRIVATE KEY-----\\nABC\\n-----END PRIVATE KEY-----");
    assert.match(pem, /BEGIN PRIVATE KEY/);
    assert.match(pem, /\nABC\n/);
    assert.equal(normalizePem(""), "");
  });
});

const NOW = new Date("2026-10-16T18:00:00.000Z");

function options(api: AppleVerifyOptions["api"] = null): AppleVerifyOptions {
  return {
    bundleId: IOS_BUNDLE_ID,
    appAppleId: 1000000001,
    onlineChecks: false,
    api,
  };
}

function dayPayload(): JWSTransactionDecodedPayload {
  return {
    productId: DAY_PASS.id,
    transactionId: "tip-1",
    bundleId: IOS_BUNDLE_ID,
    purchaseDate: new Date("2026-10-16T15:00:00.000Z").getTime(),
    environment: Environment.SANDBOX,
    type: APPLE_CONSUMABLE,
  };
}

describe("confirmSignedTransactions", () => {
  it("rejects a transaction Apple did not sign", async () => {
    const result = await confirmSignedTransactions(
      [jws({ environment: "Sandbox", productId: DAY_PASS.id, bundleId: IOS_BUNDLE_ID })],
      options(),
      NOW,
    );
    assert.equal(result.ok, false);
  });

  it("grants a sandbox day pass from the signed transaction when no API key is configured", async () => {
    const result = await confirmSignedTransactions([jws({ environment: "Sandbox" })], options(), NOW, {
      verifyTransaction: async () => dayPayload(),
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.entitlement.kind, "day");
      assert.equal(result.entitlement.productId, DAY_PASS.id);
      assert.equal(result.entitlement.until.toISOString(), "2026-10-16T23:59:59.999Z");
    }
  });

  it("accepts a production transaction the same way", async () => {
    const result = await confirmSignedTransactions(
      [jws({ environment: "Production" })],
      options(),
      NOW,
      {
        verifyTransaction: async () => ({ ...dayPayload(), environment: Environment.PRODUCTION }),
      },
    );
    assert.equal(result.ok, true);
  });

  it("does not grant a production transaction when the Apple app id is missing", async () => {
    const result = await confirmSignedTransactions(
      [jws({ environment: "Production" })],
      { ...options(), appAppleId: undefined },
      NOW,
      { verifyTransaction: async () => dayPayload() },
    );
    assert.equal(result.ok, false);
  });

  it("ignores Xcode and local-testing transactions", async () => {
    let called = false;
    const result = await confirmSignedTransactions(
      [jws({ environment: "Xcode" }), jws({ environment: "LocalTesting" })],
      options(),
      NOW,
      {
        verifyTransaction: async () => {
          called = true;
          return dayPayload();
        },
      },
    );
    assert.equal(called, false);
    assert.equal(result.ok, false);
  });

  it("uses the App Store Server API when a key is configured, including a revocation", async () => {
    const api = {
      keyId: "KEY",
      issuerId: "ISS",
      privateKey: "-----BEGIN PRIVATE KEY-----\nABC\n-----END PRIVATE KEY-----",
      bundleId: IOS_BUNDLE_ID,
      onlineChecks: false,
    };
    const revoked = await confirmSignedTransactions(
      [jws({ environment: "Sandbox" })],
      options(api),
      NOW,
      {
        verifyTransaction: async () => dayPayload(),
        confirmWithApi: async () => ({
          transaction: {
            productId: DAY_PASS.id,
            transactionId: "tip-1",
            bundleId: IOS_BUNDLE_ID,
            purchaseDateMs: NOW.getTime(),
            expiresDateMs: null,
            revocationDateMs: NOW.getTime(),
            type: APPLE_CONSUMABLE,
          },
          gracePeriodExpiresMs: null,
        }),
      },
    );
    assert.equal(revoked.ok, false);

    const active = await confirmSignedTransactions(
      [jws({ environment: "Sandbox" })],
      options(api),
      NOW,
      {
        verifyTransaction: async () => ({
          ...dayPayload(),
          productId: MONTHLY_PRODUCT.id,
          type: APPLE_SUBSCRIPTION,
          expiresDate: new Date("2026-11-01T12:00:00.000Z").getTime(),
        }),
        confirmWithApi: async () => ({
          transaction: {
            productId: MONTHLY_PRODUCT.id,
            transactionId: "sub-1",
            bundleId: IOS_BUNDLE_ID,
            purchaseDateMs: new Date("2026-10-01T12:00:00.000Z").getTime(),
            expiresDateMs: new Date("2026-11-01T12:00:00.000Z").getTime(),
            revocationDateMs: null,
            type: APPLE_SUBSCRIPTION,
          },
          status: SUBSCRIPTION_STATUS.active,
          gracePeriodExpiresMs: null,
        }),
      },
    );
    assert.equal(active.ok, true);
    if (active.ok) assert.equal(active.entitlement.kind, "subscription");
  });

  it("keeps the signed transaction when the App Store Server API cannot be reached", async () => {
    const result = await confirmSignedTransactions(
      [jws({ environment: "Sandbox" })],
      options({
        keyId: "KEY",
        issuerId: "ISS",
        privateKey: "-----BEGIN PRIVATE KEY-----\nABC\n-----END PRIVATE KEY-----",
        bundleId: IOS_BUNDLE_ID,
        onlineChecks: false,
      }),
      NOW,
      {
        verifyTransaction: async () => dayPayload(),
        confirmWithApi: async () => {
          throw new Error("network");
        },
      },
    );
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.entitlement.kind, "day");
  });
});
