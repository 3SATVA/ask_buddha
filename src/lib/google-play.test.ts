import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  confirmGooglePurchases,
  entitlementForGoogleProduct,
  entitlementForGoogleSubscription,
  parseServiceAccountJson,
  readGooglePlayConfig,
  type GooglePlayConfig,
} from "./google-play";
import { GOOGLE_DAY_PASS, GOOGLE_MONTHLY_PRODUCT } from "./products";

const NOW = new Date("2026-10-16T18:00:00.000Z");
const ACCOUNT = {
  type: "service_account",
  client_email: "play@example.iam.gserviceaccount.com",
  private_key: "-----BEGIN PRIVATE KEY-----\nABC\n-----END PRIVATE KEY-----\n",
};

describe("Google product IDs", () => {
  it("stays inside Play's 40 character limit", () => {
    assert.ok(GOOGLE_DAY_PASS.id.length <= 40);
    assert.ok(GOOGLE_MONTHLY_PRODUCT.id.length <= 40);
    assert.ok(GOOGLE_MONTHLY_PRODUCT.basePlanId.length <= 40);
  });
});

describe("parseServiceAccountJson", () => {
  it("reads raw JSON, base64 JSON, and rejects anything else", () => {
    const raw = JSON.stringify(ACCOUNT);
    const parsed = parseServiceAccountJson(raw);
    assert.equal(parsed?.client_email, ACCOUNT.client_email);
    assert.match(parsed?.private_key ?? "", /BEGIN PRIVATE KEY/);
    assert.equal(parseServiceAccountJson(Buffer.from(raw).toString("base64"))?.client_email, ACCOUNT.client_email);
    assert.equal(parseServiceAccountJson(""), null);
    assert.equal(parseServiceAccountJson("{}"), null);
    assert.equal(parseServiceAccountJson("not-json"), null);
  });
});

describe("readGooglePlayConfig", () => {
  it("defaults the package name and stays empty without a service account", () => {
    assert.equal(readGooglePlayConfig({}), null);
    const config = readGooglePlayConfig({
      GOOGLE_PLAY_SERVICE_ACCOUNT_JSON: JSON.stringify(ACCOUNT),
    });
    assert.equal(config?.packageName, "com.starseedsquad.askbuddha");
    assert.equal(config?.clientEmail, ACCOUNT.client_email);
  });
});

describe("entitlementForGoogleProduct", () => {
  it("unlocks the rest of the UTC day and rejects canceled, pending, and old purchases", () => {
    const grant = entitlementForGoogleProduct(
      GOOGLE_DAY_PASS.id,
      {
        purchaseState: 0,
        purchaseTimeMillis: String(Date.parse("2026-10-16T01:00:00.000Z")),
        orderId: "GPA.1234",
      },
      NOW,
    );
    assert.equal(grant?.kind, "day");
    assert.equal(grant?.until.toISOString(), "2026-10-16T23:59:59.999Z");
    assert.equal(
      entitlementForGoogleProduct(
        GOOGLE_DAY_PASS.id,
        { purchaseState: 1, purchaseTimeMillis: String(NOW.getTime()), orderId: "GPA.1" },
        NOW,
      ),
      null,
    );
    assert.equal(
      entitlementForGoogleProduct(
        GOOGLE_DAY_PASS.id,
        { purchaseState: 2, purchaseTimeMillis: String(NOW.getTime()), orderId: "GPA.1" },
        NOW,
      ),
      null,
    );
    assert.equal(
      entitlementForGoogleProduct(
        GOOGLE_DAY_PASS.id,
        {
          purchaseState: 0,
          purchaseTimeMillis: String(Date.parse("2026-10-15T12:00:00.000Z")),
          orderId: "GPA.old",
        },
        NOW,
      ),
      null,
    );
  });
});

describe("entitlementForGoogleSubscription", () => {
  const line = {
    productId: GOOGLE_MONTHLY_PRODUCT.id,
    expiryTime: "2026-11-16T18:00:00.000Z",
  };

  it("grants active, canceled, and grace subscriptions until expiry", () => {
    for (const state of [
      "SUBSCRIPTION_STATE_ACTIVE",
      "SUBSCRIPTION_STATE_CANCELED",
      "SUBSCRIPTION_STATE_IN_GRACE_PERIOD",
    ]) {
      const grant = entitlementForGoogleSubscription(
        GOOGLE_MONTHLY_PRODUCT.id,
        { subscriptionState: state, latestOrderId: "GPA.sub", lineItems: [line] },
        NOW,
      );
      assert.equal(grant?.kind, "subscription");
      assert.equal(grant?.until.toISOString(), "2026-11-16T18:00:00.000Z");
    }
  });

  it("rejects expired, paused, on-hold, and the wrong product", () => {
    for (const state of [
      "SUBSCRIPTION_STATE_EXPIRED",
      "SUBSCRIPTION_STATE_PAUSED",
      "SUBSCRIPTION_STATE_ON_HOLD",
      "SUBSCRIPTION_STATE_PENDING",
    ]) {
      assert.equal(
        entitlementForGoogleSubscription(
          GOOGLE_MONTHLY_PRODUCT.id,
          { subscriptionState: state, latestOrderId: "GPA.sub", lineItems: [line] },
          NOW,
        ),
        null,
      );
    }
    assert.equal(
      entitlementForGoogleSubscription(
        GOOGLE_MONTHLY_PRODUCT.id,
        {
          subscriptionState: "SUBSCRIPTION_STATE_ACTIVE",
          latestOrderId: "GPA.sub",
          lineItems: [{ productId: "other", expiryTime: line.expiryTime }],
        },
        NOW,
      ),
      null,
    );
  });
});

describe("confirmGooglePurchases", () => {
  const config: GooglePlayConfig = {
    packageName: "com.starseedsquad.askbuddha",
    clientEmail: ACCOUNT.client_email,
    privateKey: ACCOUNT.private_key,
  };

  it("asks Google about a known token and ignores unknown products", async () => {
    const calls: string[] = [];
    const result = await confirmGooglePurchases(
      [
        { productId: "not-a-product", purchaseToken: "tok" },
        { productId: GOOGLE_DAY_PASS.id, purchaseToken: "day-token" },
      ],
      config,
      NOW,
      {
        accessToken: async () => "test-token",
        fetch: async (input) => {
          calls.push(String(input));
          return new Response(
            JSON.stringify({
              purchaseState: 0,
              purchaseTimeMillis: String(Date.parse("2026-10-16T01:00:00.000Z")),
              orderId: "GPA.1234",
            }),
            { status: 200 },
          );
        },
      },
    );
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.entitlement.productId, GOOGLE_DAY_PASS.id);
    assert.equal(calls.length, 1);
    assert.match(calls[0], /purchases\/products\/unlimited\.today\/tokens\/day-token$/);
    assert.match(calls[0], /com\.starseedsquad\.askbuddha/);
  });

  it("does not grant when Google rejects the token", async () => {
    const result = await confirmGooglePurchases(
      [{ productId: GOOGLE_MONTHLY_PRODUCT.id, purchaseToken: "sub-token" }],
      config,
      NOW,
      {
        accessToken: async () => "test-token",
        fetch: async () => new Response("no", { status: 404 }),
      },
    );
    assert.deepEqual(result, { ok: false });
  });
});
