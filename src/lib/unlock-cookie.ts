import { createHmac, timingSafeEqual } from "node:crypto";

export const UNLOCK_COOKIE = "ask_buddha_unlock";

/** Sent by the app on each request. The web view does not reliably keep the cookie. */
export const UNLOCK_HEADER = "x-ask-buddha-unlock";

const MAX_PRESENTED_UNLOCK = 4096;

export type UnlockPayload = {
  kind: "day" | "subscription";
  until: string;
  transactionId: string;
  productId: string;
};

function sign(body: string, secret: string) {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

export function sealUnlock(payload: UnlockPayload, secret: string) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body, secret)}`;
}

export function readUnlock(
  raw: string | undefined,
  secret: string | undefined,
  now = new Date(),
): UnlockPayload | null {
  if (!raw || !secret) return null;
  const dot = raw.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = raw.slice(0, dot);
  const mac = raw.slice(dot + 1);
  const expected = sign(body, secret);
  const actualBytes = Buffer.from(mac);
  const expectedBytes = Buffer.from(expected);
  if (actualBytes.length !== expectedBytes.length) return null;
  if (!timingSafeEqual(actualBytes, expectedBytes)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as UnlockPayload;
    if (payload.kind !== "day" && payload.kind !== "subscription") return null;
    if (!payload.until || !payload.transactionId || !payload.productId) return null;
    const until = new Date(payload.until);
    if (Number.isNaN(until.getTime()) || now.getTime() > until.getTime()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function unlockMaxAgeSeconds(until: Date, now = new Date()) {
  return Math.max(60, Math.ceil((until.getTime() - now.getTime()) / 1000));
}

export function unlockSetCookie(value: string, maxAgeSeconds: number) {
  const parts = [
    `${UNLOCK_COOKIE}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${Math.max(0, Math.trunc(maxAgeSeconds))}`,
  ];
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  return parts.join("; ");
}

export function unlockClearCookie() {
  const parts = [
    `${UNLOCK_COOKIE}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
  ];
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  return parts.join("; ");
}

export function unlockSecret(env: Record<string, string | undefined> = process.env) {
  return env.UNLOCK_COOKIE_SECRET?.trim() || "";
}

export function reportMissingUnlockSecret() {
  console.error(
    "ASK BUDDHA unlock: UNLOCK_COOKIE_SECRET is not set. A verified purchase cannot be remembered until this variable is set on the server.",
  );
}

/** Prefer the header token. Fall back to the cookie when the browser stored it. */
export function presentedUnlock(request: {
  headers: { get(name: string): string | null };
  cookies: { get(name: string): { value: string } | undefined };
}) {
  const header = request.headers.get(UNLOCK_HEADER)?.trim() ?? "";
  if (header && header.length <= MAX_PRESENTED_UNLOCK) return header;
  const cookie = request.cookies.get(UNLOCK_COOKIE)?.value?.trim() ?? "";
  if (cookie && cookie.length <= MAX_PRESENTED_UNLOCK) return cookie;
  return undefined;
}
