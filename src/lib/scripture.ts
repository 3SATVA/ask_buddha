export type ReplyBlock =
  | { type: "prose"; text: string }
  | { type: "scripture"; quote: string; reference: string | null };

const QUOTE_LINE = /^>\s?(.*)$/;
const REFERENCE =
  /\s*\(((?:[1-3]\s)?[A-Za-z]+(?:\s[A-Za-z]+)?\s\d+:\d+(?:[-–]\d+)?)\)\s*$/;

function stripWrap(value: string) {
  return value.replace(/^["“”']+|["“”']+$/g, "").trim();
}

function pushScripture(
  blocks: ReplyBlock[],
  quote: string,
  reference: string | null,
) {
  const prev = blocks[blocks.length - 1];
  if (prev?.type === "scripture" && !prev.reference) {
    prev.quote = [prev.quote, quote].filter(Boolean).join(" ").trim();
    prev.reference = reference;
    return;
  }
  blocks.push({ type: "scripture", quote, reference });
}

/** Split a reply into prose and scripture lines marked `> quote (Book 1:1)`. */
export function parseReply(text: string): ReplyBlock[] {
  const blocks: ReplyBlock[] = [];
  let prose: string[] = [];

  const flushProse = () => {
    const value = prose.join("\n").trim();
    prose = [];
    if (value) blocks.push({ type: "prose", text: value });
  };

  for (const line of text.split(/\n/)) {
    const match = line.match(QUOTE_LINE);
    if (!match) {
      prose.push(line);
      continue;
    }

    flushProse();
    const body = stripWrap(match[1].trim());
    const refMatch = body.match(REFERENCE);
    if (refMatch && refMatch.index != null) {
      pushScripture(blocks, stripWrap(body.slice(0, refMatch.index)), refMatch[1].trim());
    } else {
      pushScripture(blocks, body, null);
    }
  }

  flushProse();
  return blocks.filter(
    (block) => block.type === "prose" || block.quote || block.reference,
  );
}

