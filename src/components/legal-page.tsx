import type { ReactNode } from "react";
import Link from "next/link";
import { BuddhaScene } from "@/components/buddha-scene";

export function LegalPage({
  title,
  lede,
  children,
}: {
  title: string;
  lede: string;
  children: ReactNode;
}) {
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
            {title}
          </h1>
          <p className="mt-4 text-[0.98rem] leading-7 text-[#f6efe2]">{lede}</p>
          <div className="mt-5 space-y-4 text-[0.98rem] leading-7 text-[#f6efe2]">{children}</div>
        </header>
        <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-center text-sm">
          <Link href="/" className="text-[#2ee59d] underline decoration-[rgba(46,229,157,0.45)] underline-offset-4">
            Return to ask
          </Link>
          <Link href="/about" className="text-[#2ee59d] underline decoration-[rgba(46,229,157,0.45)] underline-offset-4">
            About
          </Link>
          <Link href="/privacy" className="text-[#2ee59d] underline decoration-[rgba(46,229,157,0.45)] underline-offset-4">
            Privacy
          </Link>
          <Link href="/terms" className="text-[#2ee59d] underline decoration-[rgba(46,229,157,0.45)] underline-offset-4">
            Terms
          </Link>
        </p>
      </article>
    </main>
  );
}
