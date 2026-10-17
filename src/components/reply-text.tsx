import { parseReply } from "@/lib/scripture";

export function ReplyText({
  text,
  streaming = false,
}: {
  text: string;
  streaming?: boolean;
}) {
  if (!text && streaming) {
    return <p className="font-display text-[#7dffe0] italic">Listening…</p>;
  }

  const blocks = parseReply(text);
  return (
    <div className="space-y-2.5">
      {blocks.map((block, index) =>
        block.type === "prose" ? (
          <p key={index} className="whitespace-pre-wrap">
            {block.text}
          </p>
        ) : (
          <figure key={index} className="scripture-quote">
            {block.quote ? <blockquote>{block.quote}</blockquote> : null}
            {block.reference ? <figcaption>{block.reference}</figcaption> : null}
          </figure>
        ),
      )}
      {streaming ? <span className="caret" aria-hidden="true" /> : null}
    </div>
  );
}
