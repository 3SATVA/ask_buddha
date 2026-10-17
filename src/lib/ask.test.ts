import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decideAsk } from "./ask";
import {
  DEFAULT_DAILY_LIMIT,
  DEFAULT_MAX_OUTPUT_TOKENS,
  DEFAULT_UNLIMITED_DAILY_CAP,
  dailyLimit,
  maxOutputTokens,
  unlimitedDailyCap,
} from "./config";
import { detectCrisis } from "./crisis";
import { parseQuota } from "./quota";

describe("parseQuota", () => {
  it("ignores another day and malformed cookies", () => {
    assert.equal(parseQuota(undefined, "2026-10-10"), 0);
    assert.equal(parseQuota("2026-10-09:4", "2026-10-10"), 0);
    assert.equal(parseQuota("2026-10-10:nope", "2026-10-10"), 0);
    assert.equal(parseQuota("2026-10-10:3", "2026-10-10"), 3);
  });
});

describe("detectCrisis", () => {
  it("catches first-person danger and lets questions about the teaching through", () => {
    assert.equal(detectCrisis("I want to die"), "self-harm");
    assert.equal(detectCrisis("What did the Buddha say about suicide?"), null);
    assert.equal(detectCrisis("He hits me and I am scared"), "abuse");
    assert.equal(detectCrisis("What did the Buddha teach about abuse?"), null);
    assert.equal(detectCrisis("I can't breathe"), "medical");
  });
});

describe("dailyLimit", () => {
  it("defaults the free daily limit to 10", () => {
    const previous = process.env.DAILY_QUESTION_LIMIT;
    delete process.env.DAILY_QUESTION_LIMIT;
    assert.equal(DEFAULT_DAILY_LIMIT, 10);
    assert.equal(dailyLimit(), 10);
    process.env.DAILY_QUESTION_LIMIT = "4";
    assert.equal(dailyLimit(), 4);
    if (previous === undefined) delete process.env.DAILY_QUESTION_LIMIT;
    else process.env.DAILY_QUESTION_LIMIT = previous;
  });
});

describe("unlimitedDailyCap", () => {
  it("defaults the fair-use cap to 300 and ignores values outside 1–10000", () => {
    const previous = process.env.UNLIMITED_DAILY_CAP;
    delete process.env.UNLIMITED_DAILY_CAP;
    assert.equal(DEFAULT_UNLIMITED_DAILY_CAP, 300);
    assert.equal(unlimitedDailyCap(), 300);
    process.env.UNLIMITED_DAILY_CAP = "120";
    assert.equal(unlimitedDailyCap(), 120);
    process.env.UNLIMITED_DAILY_CAP = "0";
    assert.equal(unlimitedDailyCap(), 300);
    process.env.UNLIMITED_DAILY_CAP = "10001";
    assert.equal(unlimitedDailyCap(), 300);
    if (previous === undefined) delete process.env.UNLIMITED_DAILY_CAP;
    else process.env.UNLIMITED_DAILY_CAP = previous;
  });
});

describe("maxOutputTokens", () => {
  it("defaults the reply cap to 420 tokens", () => {
    const previous = process.env.MAX_OUTPUT_TOKENS;
    delete process.env.MAX_OUTPUT_TOKENS;
    assert.equal(DEFAULT_MAX_OUTPUT_TOKENS, 420);
    assert.equal(maxOutputTokens(), 420);
    process.env.MAX_OUTPUT_TOKENS = "256";
    assert.equal(maxOutputTokens(), 256);
    process.env.MAX_OUTPUT_TOKENS = "16";
    assert.equal(maxOutputTokens(), 420);
    if (previous === undefined) delete process.env.MAX_OUTPUT_TOKENS;
    else process.env.MAX_OUTPUT_TOKENS = previous;
  });
});

describe("decideAsk", () => {
  const base = { used: 0, limit: 10, hasKey: true };

  it("helps a person in crisis before the daily limit or the API key", () => {
    assert.deepEqual(
      decideAsk({ ...base, question: "I want to kill myself", used: 10, hasKey: false }),
      { type: "crisis", kind: "self-harm" },
    );
  });

  it("stops at the daily limit, then reports a missing key", () => {
    assert.deepEqual(
      decideAsk({ ...base, question: "How do I forgive?", used: 10 }),
      { type: "limit" },
    );
    assert.deepEqual(
      decideAsk({ ...base, question: "How do I forgive?", used: 10, unlocked: true }),
      { type: "answer" },
    );
    assert.deepEqual(
      decideAsk({
        ...base,
        question: "How do I forgive?",
        used: 299,
        unlocked: true,
        unlimitedCap: 300,
      }),
      { type: "answer" },
    );
    assert.deepEqual(
      decideAsk({
        ...base,
        question: "How do I forgive?",
        used: 300,
        unlocked: true,
        unlimitedCap: 300,
      }),
      { type: "fair_use" },
    );
    assert.deepEqual(
      decideAsk({
        ...base,
        question: "I want to die",
        used: 300,
        unlocked: true,
        unlimitedCap: 300,
        hasKey: false,
      }),
      { type: "crisis", kind: "self-harm" },
    );
    assert.deepEqual(
      decideAsk({ ...base, question: "How do I forgive?", hasKey: false }),
      { type: "missing_key" },
    );
    assert.deepEqual(decideAsk({ ...base, question: "How do I forgive?" }), {
      type: "answer",
    });
  });
});
