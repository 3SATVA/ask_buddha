import { DEFAULT_UNLIMITED_DAILY_CAP, MAX_QUESTION_LENGTH } from "./config";
import { detectCrisis, type CrisisKind } from "./crisis";
import {
  FAIR_USE_MESSAGE,
  INVALID_MESSAGE,
  LIMIT_MESSAGE,
  MISSING_KEY_MESSAGE,
  UPSTREAM_MESSAGE,
} from "./messages";

export {
  FAIR_USE_MESSAGE,
  INVALID_MESSAGE,
  LIMIT_MESSAGE,
  MISSING_KEY_MESSAGE,
  UPSTREAM_MESSAGE,
};

export type AskDecision =
  | { type: "invalid" }
  | { type: "crisis"; kind: CrisisKind }
  | { type: "limit" }
  | { type: "fair_use" }
  | { type: "missing_key" }
  | { type: "answer" };

export function normalizeQuestion(input: unknown) {
  if (typeof input !== "string") return null;
  const question = input.trim();
  if (question.length < 2 || question.length > MAX_QUESTION_LENGTH) return null;
  return question;
}

export function decideAsk(input: {
  question: string | null;
  used: number;
  limit: number;
  hasKey: boolean;
  unlocked?: boolean;
  unlimitedCap?: number;
}): AskDecision {
  if (!input.question) return { type: "invalid" };
  const kind = detectCrisis(input.question);
  if (kind) return { type: "crisis", kind };
  const cap = input.unlimitedCap ?? DEFAULT_UNLIMITED_DAILY_CAP;
  if (input.unlocked && input.used >= cap) return { type: "fair_use" };
  if (input.used >= input.limit && !input.unlocked) return { type: "limit" };
  if (!input.hasKey) return { type: "missing_key" };
  return { type: "answer" };
}
