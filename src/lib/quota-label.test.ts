import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DAY_PASS_CONFIRMATION,
  DAY_PASS_FOOTER,
  MONTHLY_CONFIRMATION,
  MONTHLY_FOOTER,
  remainingLabel,
  shownUnlockKind,
  unlockConfirmation,
} from "./quota-label";

describe("remainingLabel", () => {
  it("shows the free count until a purchase unlocks messages", () => {
    assert.equal(remainingLabel(7, 10, null, false), "7 of 10 questions left today");
    assert.equal(remainingLabel(1, 10, null, false), "1 question left today");
    assert.equal(remainingLabel(7, 10, "day", false), DAY_PASS_FOOTER);
    assert.equal(remainingLabel(0, 10, "subscription", false), MONTHLY_FOOTER);
    assert.equal(remainingLabel(0, 10, "day", true), "Rest until tomorrow");
    assert.equal(remainingLabel(0, 10, "subscription", true), "Rest until tomorrow");
  });

  it("uses the monthly wording when a day pass and a subscription are both active", () => {
    assert.equal(shownUnlockKind(["day", "subscription"]), "subscription");
    assert.equal(shownUnlockKind(["subscription", "day"]), "subscription");
    assert.equal(shownUnlockKind(["day", null]), "day");
    assert.equal(remainingLabel(7, 10, shownUnlockKind(["day", "subscription"]), false), MONTHLY_FOOTER);
    assert.equal(unlockConfirmation("day"), DAY_PASS_CONFIRMATION);
    assert.equal(unlockConfirmation("subscription"), MONTHLY_CONFIRMATION);
    assert.equal(unlockConfirmation(shownUnlockKind(["day", "subscription"])), MONTHLY_CONFIRMATION);
  });
});