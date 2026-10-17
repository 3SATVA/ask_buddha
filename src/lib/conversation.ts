import { MAX_QUESTION_LENGTH } from "./config";

export type ConversationTurn = {
  role: "user" | "assistant";
  content: string;
};

const MAX_HISTORY = 16;
const MAX_ASSISTANT_LENGTH = 2000;

function clip(value: string, max: number) {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max);
}

function normalizeTurn(input: unknown): ConversationTurn | null {
  if (!input || typeof input !== "object") return null;
  const turn = input as { role?: unknown; content?: unknown };
  if (turn.role !== "user" && turn.role !== "assistant") return null;
  if (typeof turn.content !== "string") return null;
  const max = turn.role === "user" ? MAX_QUESTION_LENGTH : MAX_ASSISTANT_LENGTH;
  const content = clip(turn.content, max);
  if (!content) return null;
  return { role: turn.role, content };
}

function asQuestion(input: string) {
  const question = input.trim();
  if (question.length < 2 || question.length > MAX_QUESTION_LENGTH) return null;
  return question;
}

/**
 * The last user message is the question that counts against the daily limit.
 * Earlier turns are context and are not counted again.
 */
export function normalizeConversation(input: unknown): {
  question: string;
  history: ConversationTurn[];
} | null {
  if (!input || typeof input !== "object") return null;
  const body = input as { question?: unknown; messages?: unknown };

  if (Array.isArray(body.messages)) {
    const turns = body.messages
      .map(normalizeTurn)
      .filter((turn): turn is ConversationTurn => turn !== null);
    const last = turns[turns.length - 1];
    if (!last || last.role !== "user") return null;
    const question = asQuestion(last.content);
    if (!question) return null;
    return { question, history: turns.slice(0, -1).slice(-MAX_HISTORY) };
  }

  if (typeof body.question === "string") {
    const question = asQuestion(body.question);
    if (!question) return null;
    return { question, history: [] };
  }

  return null;
}
