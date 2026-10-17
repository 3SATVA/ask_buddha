/** Default OpenAI chat model. Override with OPENAI_MODEL. */
export const DEFAULT_MODEL = "gpt-6-luna";

export const DEFAULT_DAILY_LIMIT = 10;

/** Fair-use ceiling for a day pass or subscription, per UTC day. */
export const DEFAULT_UNLIMITED_DAILY_CAP = 300;

/** Hard ceiling on tokens generated for one reply. */
export const DEFAULT_MAX_OUTPUT_TOKENS = 420;

export const MAX_QUESTION_LENGTH = 600;

export function dailyLimit() {
  const raw = process.env.DAILY_QUESTION_LIMIT;
  if (!raw) return DEFAULT_DAILY_LIMIT;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 100) return DEFAULT_DAILY_LIMIT;
  return n;
}

export function unlimitedDailyCap() {
  const raw = process.env.UNLIMITED_DAILY_CAP;
  if (!raw) return DEFAULT_UNLIMITED_DAILY_CAP;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 10000) return DEFAULT_UNLIMITED_DAILY_CAP;
  return n;
}

export function maxOutputTokens() {
  const raw = process.env.MAX_OUTPUT_TOKENS;
  if (!raw) return DEFAULT_MAX_OUTPUT_TOKENS;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 64 || n > 2000) return DEFAULT_MAX_OUTPUT_TOKENS;
  return n;
}

export function openaiModel() {
  const raw = process.env.OPENAI_MODEL?.trim();
  return raw || DEFAULT_MODEL;
}

/** The AI SDK reads OPENAI_API_KEY. It stays on the server. */
export function hasOpenAIKey() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function supportUrl() {
  return process.env.NEXT_PUBLIC_SUPPORT_URL?.trim() ?? "";
}
