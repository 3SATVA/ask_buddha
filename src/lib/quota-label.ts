export const DAY_PASS_FOOTER = "UNLIMITED MESSAGES ACTIVATED";
export const MONTHLY_FOOTER = "MONTHLY UNLIMITED ACTIVATED";
export const DAY_PASS_CONFIRMATION = "Unlimited messages unlocked!";
export const MONTHLY_CONFIRMATION = "Monthly unlimited unlocked!";

export const UNLIMITED_FOOTER = DAY_PASS_FOOTER;
export const UNLOCK_CONFIRMATION = DAY_PASS_CONFIRMATION;

export type UnlockLabelKind = "day" | "subscription";

/** A monthly subscription wins when a day pass is active at the same time. */
export function shownUnlockKind(
  kinds: Array<UnlockLabelKind | null | undefined>,
): UnlockLabelKind | null {
  let day = false;
  for (const kind of kinds) {
    if (kind === "subscription") return "subscription";
    if (kind === "day") day = true;
  }
  return day ? "day" : null;
}

export function remainingLabel(
  remaining: number | null,
  limit: number,
  unlockKind: UnlockLabelKind | null,
  fairUseReached: boolean,
) {
  if (fairUseReached) return "Rest until tomorrow";
  if (unlockKind === "subscription") return MONTHLY_FOOTER;
  if (unlockKind === "day") return DAY_PASS_FOOTER;
  if (remaining == null) return "A few quiet questions, each day.";
  if (remaining === 1) return "1 question left today";
  return `${remaining} of ${limit} questions left today`;
}

export function unlockConfirmation(kind: UnlockLabelKind | null) {
  return kind === "subscription" ? MONTHLY_CONFIRMATION : DAY_PASS_CONFIRMATION;
}
