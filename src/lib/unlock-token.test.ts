import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { UNLOCK_HEADER } from "./unlock-cookie";
import {
  UNLOCK_STORAGE_KEY,
  readStoredUnlockTokenFrom,
  rememberUnlockTokenIn,
  unlockRequestHeadersFrom,
} from "./unlock-token";

function memoryStorage() {
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

describe("unlock token storage", () => {
  it("stores a token and sends it on the next request", () => {
    const storage = memoryStorage();
    assert.equal(readStoredUnlockTokenFrom(storage), null);
    rememberUnlockTokenIn(storage, "signed-token");
    assert.equal(storage.getItem(UNLOCK_STORAGE_KEY), "signed-token");
    assert.equal(unlockRequestHeadersFrom(readStoredUnlockTokenFrom(storage))[UNLOCK_HEADER], "signed-token");
    rememberUnlockTokenIn(storage, null);
    assert.equal(readStoredUnlockTokenFrom(storage), null);
    assert.equal(UNLOCK_HEADER in unlockRequestHeadersFrom(null), false);
  });
});
