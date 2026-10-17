import { readFileSync } from "node:fs";
import { join } from "node:path";

const PROMPT_PATH = join(process.cwd(), "BUDDHA_PROMPT.md");

/** Personality text from BUDDHA_PROMPT.md, without the editor's note at the top. */
export function loadBuddhaPrompt() {
  const raw = readFileSync(PROMPT_PATH, "utf8");
  return raw.replace(/^\uFEFF?\s*<!--[\s\S]*?-->\s*/, "").trim();
}

/**
 * Messages still available today, including the one being answered.
 * 1 means this is their last free message.
 */
export function questionsLeftNote(remaining: number) {
  const left = Math.max(0, Math.trunc(remaining));
  if (left <= 1) {
    return "The person has 1 message left today. This is their last message today.";
  }
  return `The person has ${left} messages left today, including this one.`;
}

/** Personality plus the server note about how many messages remain today. */
export function instructionsForTurn(remaining: number, options?: { unlimited?: boolean }) {
  const note = options?.unlimited
    ? "The person has unlimited messages right now. This is not their last message. Keep the conversation going."
    : questionsLeftNote(remaining);
  return `${loadBuddhaPrompt()}\n\n${note}`;
}
