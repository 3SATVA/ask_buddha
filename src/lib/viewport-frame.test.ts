import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { viewportFrame } from "./viewport-frame";

describe("viewportFrame", () => {
  it("keeps the portrait sized to the full screen when the keyboard opens", () => {
    const open = viewportFrame({ offsetTop: 0, height: 470, seenLayoutHeight: 844 });
    assert.equal(open.layoutHeight, 844);
    assert.equal(open.height, 470);
    assert.equal(open.keyboard, true);
  });

  it("follows an iOS visual-viewport pan so the shell stays on screen", () => {
    const panned = viewportFrame({ offsetTop: 180, height: 470, seenLayoutHeight: 844 });
    assert.equal(panned.offsetTop, 180);
    assert.equal(panned.height, 470);
    assert.equal(panned.layoutHeight, 844);
    assert.equal(panned.keyboard, true);
  });

  it("does not treat the browser toolbar as a keyboard", () => {
    const toolbar = viewportFrame({ offsetTop: 0, height: 760, seenLayoutHeight: 844 });
    assert.equal(toolbar.keyboard, false);
    assert.equal(toolbar.layoutHeight, 844);
  });

  it("grows the remembered screen when the keyboard closes", () => {
    const closed = viewportFrame({ offsetTop: 0, height: 844, seenLayoutHeight: 470 });
    assert.equal(closed.layoutHeight, 844);
    assert.equal(closed.keyboard, false);
  });
});
