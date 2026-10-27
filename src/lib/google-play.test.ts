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

  it("asks Google about a known token, consumes it, and ignores unknown products", async () => {
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
        fetch: async (input, init) => {
          const method = (init?.method ?? "GET").toUpperCase();
          calls.push(`${method} ${String(input)}`);
          if (method === "POST") return new Response(null, { status: 204 });
          return new Response(
            JSON.stringify({
              purchaseState: 0,
              consumptionState: 0,
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
    assert.equal(calls.length, 2);
    assert.match(calls[0], /^GET /);
    assert.match(calls[0], /purchases\/products\/unlimited\.today\/tokens\/day-token$/);
    assert.match(calls[0], /com\.starseedsquad\.askbuddha/);
    assert.match(calls[1], /^POST /);
    assert.match(calls[1], /:consume$/);
  });

  it("does not unlock a day pass Google will not consume", async () => {
    const result = await confirmGooglePurchases(
      [{ productId: GOOGLE_DAY_PASS.id, purchaseToken: "day-token" }],
      config,
      NOW,
      {
        accessToken: async () => "test-token",
        fetch: async (_input, init) => {
          if ((init?.method ?? "GET").toUpperCase() === "POST") {
            return new Response("no", { status: 500 });
          }
          return new Response(
            JSON.stringify({
              purchaseState: 0,
              consumptionState: 0,
              purchaseTimeMillis: String(Date.parse("2026-10-16T01:00:00.000Z")),
              orderId: "GPA.1234",
            }),
            { status: 200 },
          );
        },
      },
    );
    assert.deepEqual(result, { ok: false });
  });

  it("unlocks a day pass that was already consumed", async () => {
    const calls: string[] = [];
    const result = await confirmGooglePurchases(
      [{ productId: GOOGLE_DAY_PASS.id, purchaseToken: "day-token" }],
      config,
      NOW,
      {
        accessToken: async () => "test-token",
        fetch: async (input, init) => {
          calls.push(`${(init?.method ?? "GET").toUpperCase()} ${String(input)}`);
          return new Response(
            JSON.stringify({
              purchaseState: 0,
              consumptionState: 1,
              purchaseTimeMillis: String(Date.parse("2026-10-16T01:00:00.000Z")),
              orderId: "GPA.1234",
            }),
            { status: 200 },
          );
        },
      },
    );
    assert.equal(result.ok, true);
    assert.equal(calls.length, 1);
  });

  it("acknowledges an active subscription before unlocking it", async () => {
    const calls: string[] = [];
    const result = await confirmGooglePurchases(
      [{ productId: GOOGLE_MONTHLY_PRODUCT.id, purchaseToken: "sub-token" }],
      config,
      NOW,
      {
        accessToken: async () => "test-token",
        fetch: async (input, init) => {
          const method = (init?.method ?? "GET").toUpperCase();
          calls.push(`${method} ${String(input)}`);
          if (method === "POST") return new Response(null, { status: 204 });
          return new Response(
            JSON.stringify({
              subscriptionState: "SUBSCRIPTION_STATE_ACTIVE",
              acknowledgementState: "ACKNOWLEDGEMENT_STATE_PENDING",
              latestOrderId: "GPA.sub",
              lineItems: [
                {
                  productId: GOOGLE_MONTHLY_PRODUCT.id,
                  expiryTime: "2026-11-16T18:00:00.000Z",
                },
              ],
            }),
            { status: 200 },
          );
        },
      },
    );
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.entitlement.kind, "subscription");
    assert.match(calls[1] ?? "", /purchases\/subscriptions\/unlimited\.monthly\/tokens\/sub-token:acknowledge$/);
  });

  it("consumes an expired day pass without unlocking it", async () => {
    const calls: string[] = [];
    const result = await confirmGooglePurchases(
      [{ productId: GOOGLE_DAY_PASS.id, purchaseToken: "old-token" }],
      config,
      NOW,
      {
        accessToken: async () => "test-token",
        fetch: async (input, init) => {
          const method = (init?.method ?? "GET").toUpperCase();
          calls.push(`${method} ${String(input)}`);
          if (method === "POST") return new Response(null, { status: 204 });
          return new Response(
            JSON.stringify({
              purchaseState: 0,
              consumptionState: 0,
              purchaseTimeMillis: String(Date.parse("2026-10-15T12:00:00.000Z")),
              orderId: "GPA.old",
            }),
            { status: 200 },
          );
        },
      },
    );
    assert.deepEqual(result, { ok: false });
    assert.match(calls[1] ?? "", /:consume$/);
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
