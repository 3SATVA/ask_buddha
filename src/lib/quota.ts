export const QUOTA_COOKIE = "ask_buddha_quota";

export function utcDay(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

/** Questions already used today. A cookie from another UTC day counts as zero. */
export function parseQuota(raw: string | undefined, today = utcDay()) {
  if (!raw) return 0;
  const [day, count] = raw.split(":");
  if (day !== today) return 0;
  const n = Number(count);
  if (!Number.isInteger(n) || n < 0) return 0;
  return n;
}

export function quotaValue(count: number, today = utcDay()) {
  return `${today}:${count}`;
}

export function quotaSetCookie(count: number, today = utcDay()) {
  const parts = [
    `${QUOTA_COOKIE}=${quotaValue(count, today)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${60 * 60 * 48}`,
  ];
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  return parts.join("; ");
}
