import { UNLOCK_HEADER } from "./unlock-cookie";

export const UNLOCK_STORAGE_KEY = "ask_buddha_unlock_token";

type TokenStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

export function readStoredUnlockTokenFrom(storage: TokenStorage) {
  try {
    const value = storage.getItem(UNLOCK_STORAGE_KEY)?.trim() ?? "";
    return value || null;
  } catch {
    return null;
  }
}

export function rememberUnlockTokenIn(storage: TokenStorage, token: string | null) {
  try {
    if (token) storage.setItem(UNLOCK_STORAGE_KEY, token);
    else storage.removeItem(UNLOCK_STORAGE_KEY);
  } catch {
    // Private mode can refuse storage. The request still sends a token it already has.
  }
}

export function unlockRequestHeadersFrom(
  token: string | null,
  extra: Record<string, string> = {},
): Record<string, string> {
  const headers = { ...extra };
  if (token) headers[UNLOCK_HEADER] = token;
  return headers;
}

function browserStorage(): TokenStorage | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage;
}

export function readStoredUnlockToken() {
  const storage = browserStorage();
  if (!storage) return null;
  return readStoredUnlockTokenFrom(storage);
}

export function rememberUnlockToken(token: string | null) {
  const storage = browserStorage();
  if (!storage) return;
  rememberUnlockTokenIn(storage, token);
}

export function unlockRequestHeaders(extra: Record<string, string> = {}) {
  return unlockRequestHeadersFrom(readStoredUnlockToken(), extra);
}

export function applyUnlockResponse(data: { unlockToken?: unknown; unlocked?: unknown } | null) {
  if (!data) return;
  if (typeof data.unlockToken === "string" && data.unlockToken) {
    rememberUnlockToken(data.unlockToken);
    return;
  }
  if (data.unlocked === false) rememberUnlockToken(null);
}
