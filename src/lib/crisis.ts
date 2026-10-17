export type CrisisKind = "self-harm" | "abuse" | "medical";

const SELF_HARM =
  /\b(i (?:want|plan|am going|['’]m going) to (?:kill myself|die|end it)|i(?:'m| am) suicidal|kill myself|killing myself|end my life|take my (?:own )?life|want to die|wanna die|wish i (?:was|were) dead|(?:do not|don't) want to (?:live|be alive)|self[-\s]?harm|hurt myself|cut myself|cutting myself)\b/i;

const ABUSE =
  /\b(i(?:'m| am) being abused|i(?:'m| am) abused|he (?:hits|beats|chokes|hurts) me|she (?:hits|beats|chokes|hurts) me|they (?:hit|beat|hurt) me|sexual(?:ly)? (?:abuse|assault)|i was raped|i(?:'m| am) being raped|molest(?:ed|ing)|domestic violence)\b/i;

const MEDICAL =
  /\b(i (?:can(?:'|’)t|cannot) breathe|i(?:'m| am) having (?:a )?(?:heart attack|stroke)|i(?:'m| am) overdos(?:e|ing)|i think i(?:'m| am) having a stroke|i(?:'m| am) bleeding (?:heavily|badly|out)|severe chest pain)\b/i;

/**
 * First-person danger only. A question about what the Buddha taught
 * should still reach the model.
 */
export function detectCrisis(question: string): CrisisKind | null {
  if (SELF_HARM.test(question)) return "self-harm";
  if (ABUSE.test(question)) return "abuse";
  if (MEDICAL.test(question)) return "medical";
  return null;
}

export function crisisMessage(kind: CrisisKind) {
  if (kind === "self-harm") {
    return [
      "I want you alive, and I want you safe. Reach a person who can be with you right now.",
      "If you are in the United States, call or text 988 (Suicide & Crisis Lifeline), or visit https://988lifeline.org. If you are elsewhere, local help is listed at https://www.iasp.info/suicidalthoughts/.",
      "If you are in immediate danger, call your local emergency number.",
    ].join("\n\n");
  }

  if (kind === "abuse") {
    return [
      "I am with you, and you should not have to stay where you are being hurt.",
      "If you are in the United States, the National Domestic Violence Hotline is 1-800-799-7233 or https://www.thehotline.org. If a child is being hurt, tell a trusted adult, contact local emergency services, or call or text Childhelp at 1-800-422-4453.",
      "If you are in immediate danger, call your local emergency number.",
    ].join("\n\n");
  }

  return [
    "Call 911, or your local emergency number, now. I want you with someone who can help you in person.",
    "I will not guess at what is wrong. Let them care for you.",
  ].join("\n\n");
}
