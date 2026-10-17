import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PRODUCTION_SITE_URL, SHARE_IMAGE_PATH, siteUrl } from "./site";

describe("siteUrl", () => {
  it("uses NEXT_PUBLIC_SITE_URL when it is set", () => {
    assert.equal(
      siteUrl({ NEXT_PUBLIC_SITE_URL: "https://example.com" }).href,
      "https://example.com/",
    );
  });

  it("uses the Vercel production host before the hardcoded site", () => {
    assert.equal(
      siteUrl({ VERCEL_PROJECT_PRODUCTION_URL: "ask-buddha.vercel.app" }).href,
      "https://ask-buddha.vercel.app/",
    );
  });

  it("falls back to the production site so previews are absolute", () => {
    assert.equal(siteUrl({}).href, `${PRODUCTION_SITE_URL}/`);
    assert.equal(SHARE_IMAGE_PATH, "/art/ask-buddha-card.jpg");
  });
});
