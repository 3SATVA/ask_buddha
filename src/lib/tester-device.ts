import { unlockRequestHeaders } from "./unlock-token";

export const TESTER_CODE_KEY = "ask_buddha_tester_code";
export const TESTER_SUPPRESS_KEY = "ask_buddha_tester_suppress_unlock";
export const TESTER_RESET_EVENT = "ask-buddha-tester-reset";

/** Sent only by this device after the owner clears the unlock. The server then ignores the cookie. */
export const UNLOCK_SUPPRESS_HEADER = "x-ask-buddha-suppress-unlock";

export const TITLE_TAPS_TO_OPEN = 7;
export const TITLE_TAP_GAP_MS = 2500;

type Storage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

export function nextTitleTap(count: number, lastAt: number | null, now: number, gap = TITLE_TAP_GAP_MS) {
  const stale = lastAt == null || now - lastAt > gap;
  const next = stale ? 1 : count + 1;
  if (next >= TITLE_TAPS_TO_OPEN) return { count: 0, open: true, at: now };
  return { count: next, open: false, at: now };
}

function browserStorage(): Storage | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage;
}

export function readTesterCodeFrom(storage: Storage) {
  try {
    const value = storage.getItem(TESTER_CODE_KEY)?.trim() ?? "";
    return value || null;
  } catch {
    return null;
  }
}

export function rememberTesterCodeIn(storage: Storage, code: string | null) {
  try {
    const trimmed = code?.trim() ?? "";
    if (trimmed) storage.setItem(TESTER_CODE_KEY, trimmed);
    else storage.removeItem(TESTER_CODE_KEY);
  } catch {
    // Private mode can refuse storage. The sheet can ask again.
  }
}

export function readTesterCode() {
  const storage = browserStorage();
  if (!storage) return null;
  return readTesterCodeFrom(storage);
}

export function rememberTesterCode(code: string | null) {
  const storage = browserStorage();
  if (!storage) return;
  rememberTesterCodeIn(storage, code);
}

export function readUnlockSuppressedFrom(storage: Storage) {
  try {
    return storage.getItem(TESTER_SUPPRESS_KEY) === "1";
  } catch {
    return false;
  }
}

export function setUnlockSuppressedIn(storage: Storage, suppressed: boolean) {
  try {
    if (suppressed) storage.setItem(TESTER_SUPPRESS_KEY, "1");
    else storage.removeItem(TESTER_SUPPRESS_KEY);
  } catch {
    // The cookie clear still applies on this response.
  }
}

export function unlockSuppressed() {
  const storage = browserStorage();
  if (!storage) return false;
  return readUnlockSuppressedFrom(storage);
}

export function setUnlockSuppressed(suppressed: boolean) {
  const storage = browserStorage();
  if (!storage) return;
  setUnlockSuppressedIn(storage, suppressed);
}

export function unlockSuppressedByHeader(value: string | null) {
  return value === "1";
}

export function askUnlockHeaders(extra: Record<string, string> = {}) {
  if (unlockSuppressed()) return { ...extra, [UNLOCK_SUPPRESS_HEADER]: "1" };
  return unlockRequestHeaders(extra);
}

export function notifyTesterReset(detail: { quotaReset?: boolean; unlockCleared?: boolean }) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(TESTER_RESET_EVENT, { detail }));
}
