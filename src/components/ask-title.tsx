"use client";

import { useRef, useState } from "react";
import { TesterTools } from "@/components/tester-tools";
import { nextTitleTap } from "@/lib/tester-device";

export function AskTitle() {
  const taps = useRef({ count: 0, at: null as number | null });
  const [open, setOpen] = useState(false);

  return (
    <>
      <h1
        className="ask-title pointer-events-auto cursor-default text-center font-cinzel font-semibold select-none"
        style={{ touchAction: "manipulation" }}
        onClick={() => {
          const next = nextTitleTap(taps.current.count, taps.current.at, Date.now());
          taps.current = { count: next.count, at: next.at };
          if (next.open) setOpen(true);
        }}
      >
        ASK BUDDHA
      </h1>
      <TesterTools open={open} onOpenChange={setOpen} />
    </>
  );
}
