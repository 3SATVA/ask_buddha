import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseReply } from "./scripture";

describe("parseReply", () => {
  it("leaves an ordinary reply as prose", () => {
    assert.deepEqual(parseReply("I am with you. What is heavy tonight?"), [
      { type: "prose", text: "I am with you. What is heavy tonight?" },
    ]);
  });

  it("styles a marked quotation and keeps the reference", () => {
    const text = [
      "I am with you in this.",
      "> Peace I leave with you; my peace I give to you. (John 14:27)",
      "What is weighing on you?",
    ].join("\n");
    assert.deepEqual(parseReply(text), [
      { type: "prose", text: "I am with you in this." },
      {
        type: "scripture",
        quote: "Peace I leave with you; my peace I give to you.",
        reference: "John 14:27",
      },
      { type: "prose", text: "What is weighing on you?" },
    ]);
  });

  it("accepts a numbered book and a verse range", () => {
    assert.deepEqual(
      parseReply('> "Come to me, and I will give you rest." (Matthew 11:28-30)'),
      [
        {
          type: "scripture",
          quote: "Come to me, and I will give you rest.",
          reference: "Matthew 11:28-30",
        },
      ],
    );
    assert.deepEqual(parseReply("> God is love. (1 John 4:8)"), [
      { type: "scripture", quote: "God is love.", reference: "1 John 4:8" },
    ]);
  });

});
