import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  TITLE_TAP_GAP_MS,
  askUnlockHeaders,
  nextTitleTap,
  readTesterCodeFrom,
  readUnlockSuppressedFrom,
  rememberTesterCodeIn,
  setUnlockSuppressedIn,
  unlockSuppressedByHeader,
} from "./tester-device";
import { testerCodeMatches, testerResetCode, testerResetSetCookie } from "./tester-reset";

function memory() {
  const values = new Map<string, string>();
  return {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
    removeItem(key: string) {
      values.delete(key);
    },
  };
}

describe("tester title gesture", () => {
  it("opens on the seventh tap and ignores a slow tap", () => {
    let count = 0;
    let at: number | null = null;
    let opened = false;
    for (let tap = 0; tap < 6; tap += 1) {
      const next = nextTitleTap(count, at, 1_000 + tap * 400);
      count = next.count;
      at = next.at;
      opened = next.open;
    }
    assert.equal(opened, false);
    assert.equal(count, 6);
    const openedTap = nextTitleTap(count, at, 1_000 + 6 * 400);
    assert.equal(openedTap.open, true);
    assert.equal(openedTap.count, 0);

    const restarted = nextTitleTap(6, 1_000, 1_000 + TITLE_TAP_GAP_MS + 1);
    assert.equal(restarted.open, false);
    assert.equal(restarted.count, 1);
  });
});

describe("tester reset code", () => {
  it("accepts only the server code and writes this device's cookies", () => {
    assert.equal(testerResetCode({ TESTER_RESET_CODE: "  river-code  " }), "river-code");
    assert.equal(testerResetCode({}), "");
    assert.equal(testerCodeMatches("river-code", "river-code"), true);
    assert.equal(testerCodeMatches("river-code", "other-code"), false);
    assert.equal(testerCodeMatches("", "river-code"), false);
    assert.equal(testerCodeMatches("river-code", ""), false);

    const quota = testerResetSetCookie("quota");
    assert.match(quota, /^ask_buddha_quota=\d{4}-\d{2}-\d{2}:0;/);
    assert.match(quota, /Path=\//);
    const unlock = testerResetSetCookie("unlock");
    assert.match(unlock, /^ask_buddha_unlock=;/);
    assert.match(unlock, /Max-Age=0/);
  });

  it("stores the code and the unlock suppression on this device only", () => {
    const storage = memory();
    rememberTesterCodeIn(storage, " river-code ");
    assert.equal(readTesterCodeFrom(storage), "river-code");
    setUnlockSuppressedIn(storage, true);
    assert.equal(readUnlockSuppressedFrom(storage), true);
    setUnlockSuppressedIn(storage, false);
    assert.equal(readUnlockSuppressedFrom(storage), false);
    rememberTesterCodeIn(storage, null);
    assert.equal(readTesterCodeFrom(storage), null);
    assert.equal(unlockSuppressedByHeader("1"), true);
    assert.equal(unlockSuppressedByHeader(null), false);
    const storageHeaders = askUnlockHeaders({ "Content-Type": "application/json" });
    assert.equal(storageHeaders["Content-Type"], "application/json");
    assert.equal("x-ask-buddha-suppress-unlock" in storageHeaders, false);
  });
});
