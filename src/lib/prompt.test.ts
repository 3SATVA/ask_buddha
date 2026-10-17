import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { crisisMessage } from "./crisis";
import { instructionsForTurn, loadBuddhaPrompt, questionsLeftNote } from "./prompt";

describe("BUDDHA_PROMPT.md", () => {
  const prompt = loadBuddhaPrompt();

  it("leaves the editor's note in the file and out of what the Buddha is told", () => {
    const raw = readFileSync("BUDDHA_PROMPT.md", "utf8");
    assert.match(raw, /Editing this file changes the Buddha's personality/);
    assert.doesNotMatch(prompt, /Editing this file/);
    assert.match(prompt, /^You are AI Buddha/);
  });

  it("answers as AI Buddha and stays in character", () => {
    assert.match(prompt, /You are AI Buddha/);
    assert.match(prompt, /say that you are AI Buddha/);
    assert.match(prompt, /Do not say "I am an AI and not the Buddha\."/);
    assert.match(prompt, /Do not add disclaimers/);
    assert.doesNotMatch(prompt, /You are an AI interpretation, not the Buddha/);
  });

  it("forbids hedging and keeps each reply very short", () => {
    assert.match(prompt, /Never hedge with "scripture says,"/);
    assert.match(prompt, /"Theravada Buddhists believe,"/);
    assert.match(prompt, /"many Buddhists think,"/);
    assert.match(prompt, /usually one or two sentences/);
  });

  it("speaks simply, mirrors them, and stays concrete", () => {
    assert.match(prompt, /very relatable, simple, warm, modern language/);
    assert.match(prompt, /kind, wise teacher or friend/);
    assert.match(prompt, /Mirror the person's own speaking style/);
    assert.match(prompt, /Never vague, abstract, or opaque/);
    assert.match(prompt, /Be concrete and clear/);
  });

  it("paces a back-and-forth and quotes scripture by the second reply", () => {
    assert.match(prompt, /a guide, not a script/);
    assert.match(prompt, /Do not force the steps/);
    assert.match(prompt, /one short, loving question/);
    assert.match(prompt, /words of love and healing/);
    assert.match(prompt, /By your second reply at the latest/);
    assert.match(prompt, /one quotation from the Pali Canon/);
    assert.match(prompt, /That is not the end of the conversation/);
    assert.match(prompt, /how it lands, or what step feels possible/);
    assert.match(prompt, /When 2 or fewer remain/);
    assert.match(prompt, /do not reply with only a question/);
    assert.match(prompt, /practical, loving advice/);
    assert.match(prompt, /When this is their last message today, close warmly/);
    assert.match(prompt, /do not ask a question that needs a reply/);
    assert.match(prompt, /Friend, what is on your mind today\?/);
    assert.doesNotMatch(prompt, /No quotation yet/);
    assert.doesNotMatch(prompt, /do not quote before you understand them/);
  });

  it("tells him how many messages remain, and which one is the last", () => {
    assert.equal(
      questionsLeftNote(5),
      "The person has 5 messages left today, including this one.",
    );
    assert.equal(
      questionsLeftNote(2),
      "The person has 2 messages left today, including this one.",
    );
    assert.match(questionsLeftNote(2), /2 messages left/);
    assert.doesNotMatch(questionsLeftNote(2), /last message/);
    assert.equal(
      questionsLeftNote(1),
      "The person has 1 message left today. This is their last message today.",
    );
    assert.match(questionsLeftNote(0), /last message today/);

    const told = instructionsForTurn(2);
    assert.match(told, /^You are AI Buddha/);
    assert.match(told, /The person has 2 messages left today, including this one\.$/);
    assert.doesNotMatch(told, /Editing this file/);

    const unlimited = instructionsForTurn(0, { unlimited: true });
    assert.match(unlimited, /unlimited messages right now/);
    assert.match(unlimited, /not their last message/);
    assert.doesNotMatch(unlimited, /This is their last message today/);
  });

  it("quotes the Pali Canon, and not Mahayana or Vajrayana", () => {
    assert.match(prompt, /Theravada Buddhism and the Pali Canon/);
    assert.match(prompt, /Dhammapada/);
    assert.match(prompt, /Majjhima Nikaya/);
    assert.match(prompt, /Digha Nikaya/);
    assert.match(prompt, /Samyutta Nikaya/);
    assert.match(prompt, /Anguttara Nikaya/);
    assert.match(prompt, /Four Noble Truths/);
    assert.match(prompt, /Noble Eightfold Path/);
    assert.match(prompt, /anicca, dukkha, anatta/);
    assert.match(prompt, /Do not quote Mahayana or Vajrayana sources/);
    assert.match(prompt, /Do not invent sayings/);
    assert.match(prompt, /Hatred never ends by hatred/);
    assert.match(prompt, /No Lotus Sutra, no Heart Sutra/);
    assert.doesNotMatch(prompt, /You may quote the Heart Sutra/);
    assert.doesNotMatch(prompt, /You may also draw on the Lotus/);
  });

  it("keeps sparse scripture quotes in the jade-italic marker", () => {
    assert.match(prompt, /by your second reply at the latest/);
    assert.match(prompt, /Do not quote in every reply/);
    assert.match(prompt, /must be from the Pali Canon/);
    assert.match(prompt, /> Exact words you are sure of\. \(Dhammapada 1:5\)/);
    assert.match(prompt, /copied exactly/);
    assert.match(prompt, /use no quote rather than an uncertain one/);
    assert.match(
      prompt,
      /> For hatred does not cease by hatred at any time: hatred ceases by love, this is an old rule\. \(Dhammapada 1:5\)/,
    );
    assert.match(prompt, /Do not guess a verse number/);
  });

  it("still points a person in danger to real help", () => {
    assert.match(prompt, /stay loving and stay in this voice/);
    assert.match(prompt, /call or text 988/);
    assert.match(prompt, /988lifeline\.org/);
    assert.match(prompt, /1-800-799-7233/);
    assert.match(prompt, /call 911/);
  });
});

describe("crisisMessage", () => {
  it("stays in a loving first person and names 988, the hotline, and 911", () => {
    const harm = crisisMessage("self-harm");
    assert.match(harm, /I want you alive/);
    assert.match(harm, /call or text 988/);
    assert.match(harm, /988lifeline\.org/);
    assert.match(harm, /iasp\.info\/suicidalthoughts/);
    assert.doesNotMatch(harm, /I am an AI|not the Buddha|I hear you/i);

    const abuse = crisisMessage("abuse");
    assert.match(abuse, /I am with you/);
    assert.match(abuse, /1-800-799-7233/);
    assert.match(abuse, /thehotline\.org/);
    assert.match(abuse, /1-800-422-4453/);
    assert.doesNotMatch(abuse, /I am an AI|not the Buddha/i);

    const medical = crisisMessage("medical");
    assert.match(medical, /Call 911/);
    assert.match(medical, /I will not guess/);
    assert.doesNotMatch(medical, /I cannot diagnose|I am an AI|not the Buddha/i);
  });
});
