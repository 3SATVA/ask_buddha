import { createHash, timingSafeEqual } from "node:crypto";
import { quotaSetCookie } from "./quota";
import { unlockClearCookie } from "./unlock-cookie";

export type TesterResetAction = "quota" | "unlock";

export function testerResetCode(env: Record<string, string | undefined> = process.env) {
  return env.TESTER_RESET_CODE?.trim() || "";
}

export function reportMissingTesterResetCode() {
  console.error(
    "ASK BUDDHA tester: TESTER_RESET_CODE is not set. Tester reset is refused until this variable is set on the server.",
  );
}

/** Compare without leaking the code through a length check. */
export function testerCodeMatches(given: string, expected: string) {
  if (!given || !expected) return false;
  const actual = createHash("sha256").update(given).digest();
  const wanted = createHash("sha256").update(expected).digest();
  return timingSafeEqual(actual, wanted);
}

/**
 * Cookie written on the caller's own response. There is no id to aim at
 * another device.
 */
export function testerResetSetCookie(action: TesterResetAction) {
  if (action === "quota") return quotaSetCookie(0);
  return unlockClearCookie();
}
