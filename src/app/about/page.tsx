import type { Metadata } from "next";
import Link from "next/link";
import { BuddhaScene } from "@/components/buddha-scene";

export const metadata: Metadata = {
  title: "About — ASK BUDDHA",
  description:
    "ASK BUDDHA is an AI grounded in Theravada Buddhism and the Pali Canon. When it quotes scripture, it quotes those texts. It is not the Buddha, and it is not scripture.",
};

const HELP = [
  {
    title: "Thoughts of suicide or self-harm",
    body: "In the United States, call or text 988 (Suicide & Crisis Lifeline). Outside the United States, the International Association for Suicide Prevention lists local help.",
    links: [
      { href: "https://988lifeline.org", label: "988lifeline.org" },
      {
        href: "https://www.iasp.info/suicidalthoughts/",
        label: "Help outside the United States",
      },
    ],
  },
  {
    title: "If someone is hurting you",
    body: "In the United States, the National Domestic Violence Hotline is 1-800-799-7233. If a child is in danger, tell a trusted adult or contact local emergency services, or call or text Childhelp at 1-800-422-4453.",
    links: [{ href: "https://www.thehotline.org", label: "thehotline.org" }],
  },
  {
    title: "A medical emergency",
    body: "Call 911, or your local emergency number, now. This page cannot diagnose or treat an illness.",
    links: [],
  },
];

export default function AboutPage() {
  return (
    <main className="relative min-h-dvh">
      <BuddhaScene />
      <div className="pointer-events-none fixed inset-0 z-[1] bg-[#071018]/78" />

      <article className="relative z-10 mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] sm:py-12">
        <p className="text-center">
          <Link
            href="/"
            className="font-display text-sm tracking-[0.28em] text-[#2ee59d] hover:text-[#d9ffe9]"
          >
            ASK BUDDHA
          </Link>
        </p>

        <header className="glass-panel rounded-3xl px-5 py-7 sm:px-8">
          <h1 className="font-display text-4xl font-semibold tracking-wide text-[#fff8e8] sm:text-5xl">
            About
          </h1>
          <p className="mt-4 font-display text-xl leading-8 text-[#f7f1e4] italic">
            A quiet conversation, drawn from the Pali Canon, of what the Buddha might say.
          </p>
          <div className="mt-5 space-y-4 text-[0.98rem] leading-7 text-[#f6efe2]">
            <p>
              ASK BUDDHA is an AI. You talk with it, and it answers in a
              first-person voice, doing its best to estimate what the Buddha might
              say. Theravada Buddhism and the Pali Canon shape that voice: the
              Four Noble Truths, the Noble Eightfold Path, the three marks, kamma,
              dependent origination, the brahmaviharas, and mindfulness. He may
              say his own sutta words naturally in the conversation.
            </p>
            <p>
              When he quotes scripture, he quotes the Sutta Pitaka: the
              Dhammapada, the Majjhima, Digha, Samyutta, and Anguttara Nikayas,
              the Sutta Nipata, the Udana, the Itivuttaka, the Theragatha, and
              the Therigatha, and the Vinaya or the Abhidhamma when they help.
              Those quotations are the ones set apart in jade italic type, with
              a citation. He does not quote Mahayana or Vajrayana texts, and he
              does not invent sayings.
            </p>
            <p>
              The hope is a tone of welcome: kind, clear, and steady. It is an
              interpretation offered with affection. It is not a new teaching.
            </p>
          </div>
        </header>

        <section className="glass-panel rounded-3xl px-5 py-7 sm:px-8" aria-labelledby="disclaimer-heading">
          <h2
            id="disclaimer-heading"
            className="font-display text-3xl font-semibold text-[#2ee59d]"
          >
            Please read this
          </h2>
          <ul className="mt-5 space-y-4 text-[0.98rem] leading-7 text-[#f6efe2]">
            <li>
              <strong className="font-medium text-[#fff8e8]">This is not the Buddha.</strong>{" "}
              No program can be him. The voice is an estimate, not a presence.
            </li>
            <li>
              <strong className="font-medium text-[#fff8e8]">This is not scripture.</strong>{" "}
              Nothing written here is the Pali Canon, and nothing here should be
              treated as a new saying.
            </li>
            <li>
              <strong className="font-medium text-[#fff8e8]">
                This is not a substitute for a teacher, or for medical, legal, or mental
                health advice.
              </strong>{" "}
              It cannot sit with you the way a teacher in your community can, and it cannot
              diagnose, treat, or represent you.
            </li>
            <li>
              <strong className="font-medium text-[#fff8e8]">Answers may be imperfect.</strong>{" "}
              A citation can be mistaken. A sentence can miss what you meant.
              When that happens, let the Pali Canon itself be the measure.
            </li>
            <li>
              <strong className="font-medium text-[#fff8e8]">
                Read the suttas, and talk with trusted teachers.
              </strong>{" "}
              A teacher or a wise friend in your community can walk
              with you in a way these words cannot, especially when a question
              is heavy.
            </li>
          </ul>
        </section>

        <section className="glass-panel rounded-3xl px-5 py-7 sm:px-8" aria-labelledby="help-heading">
          <h2 id="help-heading" className="font-display text-3xl font-semibold text-[#2ee59d]">
            If you are in danger
          </h2>
          <p className="mt-4 text-[0.98rem] leading-7 text-[#f6efe2]">
            Please reach a real person. If you are thinking about suicide, if
            someone is hurting you, or if this is a medical emergency, use the
            help below. In the United States, 988 is there day and night.
          </p>
          <ul className="mt-5 space-y-5">
            {HELP.map((item) => (
              <li key={item.title}>
                <h3 className="font-medium text-[#fff8e8]">{item.title}</h3>
                <p className="mt-1 text-sm leading-6 text-[#f6efe2]/90">{item.body}</p>
                {item.links.length > 0 ? (
                  <p className="mt-1 flex flex-col gap-1">
                    {item.links.map((link) => (
                      <a
                        key={link.href}
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-[#2ee59d] underline decoration-[rgba(46,229,157,0.45)] underline-offset-4"
                      >
                        {link.label}
                      </a>
                    ))}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-center text-sm">
          <Link
            href="/"
            className="text-[#2ee59d] underline decoration-[rgba(46,229,157,0.45)] underline-offset-4"
          >
            Return to ask
          </Link>
          <Link
            href="/privacy"
            className="text-[#2ee59d] underline decoration-[rgba(46,229,157,0.45)] underline-offset-4"
          >
            Privacy
          </Link>
          <Link
            href="/terms"
            className="text-[#2ee59d] underline decoration-[rgba(46,229,157,0.45)] underline-offset-4"
          >
            Terms
          </Link>
        </p>
      </article>
    </main>
  );
}
