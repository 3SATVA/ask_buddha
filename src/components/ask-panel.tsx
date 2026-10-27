"use client";

import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Paywall } from "@/components/paywall";
import { ReplyText } from "@/components/reply-text";
import { FAIR_USE_MESSAGE, LIMIT_MESSAGE } from "@/lib/messages";
import { remainingLabel, shownUnlockKind, unlockConfirmation } from "@/lib/quota-label";
import {
  listenForUnfinishedTransactions,
  nativeStore,
  refreshNativeEntitlement,
  type UnlockKind,
} from "@/lib/storekit";
import { TESTER_RESET_EVENT, askUnlockHeaders, unlockSuppressed } from "@/lib/tester-device";
import type { StoreName } from "@/lib/products";

type AskError = "invalid" | "limit" | "fair_use" | "missing_key" | "upstream" | "network";

type ChatMessage = {
  id: string;
  role: "user" | "buddha";
  text: string;
};

const STORAGE_KEY = "ask_buddha_conversation";
const OPENING_TEXT = "Friend, what is on your mind today?";

function openingMessage(): ChatMessage {
  return { id: "opening", role: "buddha", text: OPENING_TEXT };
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as ChatMessage;
  return (
    typeof message.id === "string" &&
    (message.role === "user" || message.role === "buddha") &&
    typeof message.text === "string"
  );
}

function loadMessages() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data
      .filter(isChatMessage)
      .filter((message) => message.role === "user" || message.text.trim())
      .slice(-40);
  } catch {
    return [];
  }
}

export function AskPanel({
  supportUrl,
  initialLimit,
  unlimitedCap,
}: {
  supportUrl: string;
  initialLimit: number;
  unlimitedCap: number;
}) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(() => [openingMessage()]);
  const [hydrated, setHydrated] = useState(false);
  const [status, setStatus] = useState<"idle" | "streaming" | "done" | "error">(
    "idle",
  );
  const [error, setError] = useState("");
  const [remaining, setRemaining] = useState<number | null>(null);
  const [limit, setLimit] = useState(initialLimit);
  const [unlockKind, setUnlockKind] = useState<UnlockKind | null>(null);
  const [fairUseRemaining, setFairUseRemaining] = useState<number | null>(null);
  const [platform, setPlatform] = useState<"unknown" | "ios" | "android" | "web">("unknown");
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallReason, setPaywallReason] = useState<"limit" | "support">("support");
  const [supportNote, setSupportNote] = useState(false);
  const [notice, setNotice] = useState("");
  const logRef = useRef<HTMLDivElement>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function applyQuota(data: {
    remaining?: number;
    limit?: number;
    unlocked?: boolean;
    unlockKind?: UnlockKind | null;
    fairUseRemaining?: number | null;
  }) {
    if (typeof data.remaining === "number") setRemaining(data.remaining);
    if (typeof data.limit === "number") setLimit(data.limit);
    if (typeof data.unlocked === "boolean") {
      setUnlockKind(data.unlocked ? data.unlockKind ?? "day" : null);
    }
    if (typeof data.fairUseRemaining === "number") setFairUseRemaining(data.fairUseRemaining);
    else if (data.fairUseRemaining === null || data.unlocked === false) setFairUseRemaining(null);
  }

  function reloadQuota() {
    return fetch("/api/ask", { headers: askUnlockHeaders(), credentials: "include" })
      .then((response) => response.json())
      .then((data: { remaining?: number; limit?: number; unlocked?: boolean; unlockKind?: UnlockKind | null; fairUseRemaining?: number | null }) => {
        applyQuota(data);
        return data.unlockKind ?? null;
      });
  }

  useEffect(() => {
    return () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    };
  }, []);

  useEffect(() => {
    function onTesterReset(event: Event) {
      const detail = (event as CustomEvent<{ unlockCleared?: boolean }>).detail;
      if (detail?.unlockCleared) {
        setUnlockKind(null);
        setFairUseRemaining(null);
      }
      void reloadQuota();
    }
    window.addEventListener(TESTER_RESET_EVENT, onTesterReset);
    return () => window.removeEventListener(TESTER_RESET_EVENT, onTesterReset);
    // reloadQuota reads the latest unlock header when the tester sheet finishes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const stored = loadMessages();
    // The saved conversation is only in the browser, so it is applied after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMessages(stored.length > 0 ? stored : [openingMessage()]);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [hydrated, messages]);

  useEffect(() => {
    if (
      process.env.NODE_ENV === "development" &&
      new URLSearchParams(window.location.search).get("preview") === "paywall"
    ) {
      return;
    }
    reloadQuota().catch(() => {});
    // Quota is loaded once when the screen opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    let removeListener = () => {};
    (async () => {
      if (
        process.env.NODE_ENV === "development" &&
        new URLSearchParams(window.location.search).get("preview") === "paywall"
      ) {
        setPlatform(new URLSearchParams(window.location.search).get("store") === "google" ? "android" : "ios");
        setRemaining(0);
        setUnlockKind(null);
        setPaywallReason("limit");
        setPaywallOpen(true);
        return;
      }
      const storeKind = await nativeStore();
      if (cancelled) return;
      setPlatform(storeKind === "apple" ? "ios" : storeKind === "google" ? "android" : "web");
      if (!storeKind) return;
      try {
        const quota = await fetch("/api/ask", {
          headers: askUnlockHeaders(),
          credentials: "include",
        }).then((response) => response.json());
        if (cancelled) return;
        applyQuota(quota);
        if (unlockSuppressed()) return;
        await refreshNativeEntitlement(
          quota.unlockKind === "subscription" ? "subscription" : quota.unlockKind === "day" ? "day" : null,
        );
        if (!cancelled) await reloadQuota();
        const handle = await listenForUnfinishedTransactions(() => {
          void reloadQuota();
        });
        removeListener = () => {
          void handle.remove();
        };
      } catch {
        // A failed refresh leaves the free quota in place.
      }
    })();
    return () => {
      cancelled = true;
      removeListener();
    };
    // The native bridge is checked once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const log = logRef.current;
    if (!log) return;
    log.scrollTop = log.scrollHeight;
  }, [messages, status, error]);

  const streaming = status === "streaming";
  const nativeApp = platform === "ios" || platform === "android";
  const store: StoreName = platform === "android" ? "google" : "apple";
  const freeLimitReached = remaining === 0 && !unlockKind;
  const fairUseReached = unlockKind != null && fairUseRemaining === 0;
  const atLimit = freeLimitReached || fairUseReached;
  const canAsk = question.trim().length >= 2 && !streaming && !atLimit;
  const hasConversation = messages.some((message) => message.text.trim());

  useEffect(() => {
    if (nativeApp && freeLimitReached && !streaming) {
      // The free quota arrives after the first paint, which is when the paywall opens.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPaywallReason("limit");
      setPaywallOpen(true);
    }
  }, [nativeApp, freeLimitReached, streaming]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextQuestion = question.trim();
    if (nextQuestion.length < 2 || streaming || atLimit) return;

    const history = messages
      .filter((message) => message.text.trim())
      .map((message) => ({
        role: message.role === "buddha" ? ("assistant" as const) : ("user" as const),
        content: message.text,
      }));
    const userId = crypto.randomUUID();
    const buddhaId = crypto.randomUUID();

    setMessages((current) => [
      ...current,
      { id: userId, role: "user", text: nextQuestion },
      { id: buddhaId, role: "buddha", text: "" },
    ]);
    setQuestion("");
    setError("");
    setStatus("streaming");

    const rollback = (message: string, code: AskError) => {
      setMessages((current) => current.filter((item) => item.id !== buddhaId && item.id !== userId));
      setQuestion(nextQuestion);
      if (code === "fair_use") {
        setFairUseRemaining(0);
        setError("");
        setStatus("idle");
        return;
      }
      setStatus("error");
      setError(message);
      if (code === "limit") setRemaining(0);
    };

    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: askUnlockHeaders({ "Content-Type": "application/json" }),
        credentials: "include",
        body: JSON.stringify({
          messages: [...history, { role: "user", content: nextQuestion }],
        }),
      });

      const remainingHeader = response.headers.get("x-questions-remaining");
      if (remainingHeader != null && remainingHeader !== "") {
        const nextRemaining = Number(remainingHeader);
        if (Number.isInteger(nextRemaining)) setRemaining(nextRemaining);
      }
      const unlockedHeader = response.headers.get("x-questions-unlocked");
      if (unlockedHeader === "0") {
        setUnlockKind(null);
        setFairUseRemaining(null);
      }
      const fairHeader = response.headers.get("x-fair-use-remaining");
      if (fairHeader != null && fairHeader !== "") {
        const nextFair = Number(fairHeader);
        if (Number.isInteger(nextFair)) setFairUseRemaining(nextFair);
      }

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: AskError;
          message?: string;
          remaining?: number;
          unlocked?: boolean;
          unlockKind?: UnlockKind | null;
          fairUseRemaining?: number | null;
        } | null;
        if (typeof data?.remaining === "number") setRemaining(data.remaining);
        if (typeof data?.unlocked === "boolean") {
          setUnlockKind(data.unlocked ? data.unlockKind ?? "day" : null);
        }
        rollback(
          data?.message ?? "Something went quiet. Please try again.",
          data?.error ?? "upstream",
        );
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        rollback("The answer did not come through. Please try again.", "upstream");
        return;
      }

      const decoder = new TextDecoder();
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        const next = full;
        setMessages((current) =>
          current.map((item) => (item.id === buddhaId ? { ...item, text: next } : item)),
        );
      }
      full += decoder.decode();
      if (!full.trim()) {
        rollback("The answer did not come through. Please try again.", "upstream");
        return;
      }
      setMessages((current) =>
        current.map((item) => (item.id === buddhaId ? { ...item, text: full } : item)),
      );
      setStatus("done");
    } catch {
      rollback("The connection stopped. Please try again.", "network");
    }
  }

  function startFresh() {
    if (streaming) return;
    setMessages([openingMessage()]);
    setQuestion("");
    setError("");
    setStatus("idle");
  }

  function onSupportClick(event: MouseEvent<HTMLAnchorElement>) {
    if (supportUrl) return;
    event.preventDefault();
    setSupportNote(true);
  }

  return (
    <div className="chat-column flex min-h-0 w-full flex-col px-3">
      <div
        ref={logRef}
        className="chat-log min-h-0 overflow-y-auto"
        role="log"
        aria-label="Conversation"
        aria-busy={streaming}
      >
        <div className="flex flex-col gap-3">
          {messages.map((message, index) => {
            if (message.role === "buddha" && !message.text && status !== "streaming") return null;
            const mine = message.role === "user";
            const isStreaming = streaming && index === messages.length - 1 && !mine;
            return (
              <div key={message.id} className={mine ? "flex justify-end" : "flex justify-start"}>
                <div className={mine ? "chat-bubble chat-bubble-user" : "chat-bubble chat-bubble-buddha"}>
                  <span className="sr-only">{mine ? "You" : "Buddha"}</span>
                  {mine ? (
                    <p className="whitespace-pre-wrap">{message.text}</p>
                  ) : (
                    <ReplyText text={message.text} streaming={isStreaming} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="composer pointer-events-auto flex shrink-0 flex-col pb-[max(0.6rem,env(safe-area-inset-bottom))]">
        {notice ? (
          <p className="mb-2 px-1 text-center text-sm leading-6 text-[#2ee59d]" role="status">
            {notice}
          </p>
        ) : null}
        {error ? (
          <p className="mb-2 px-1 text-sm leading-6 text-[#f6efe2]" role="alert">
            {error}
          </p>
        ) : null}
        {fairUseReached && !streaming ? (
          <p className="mb-2 px-1 text-sm leading-6 text-[#f7f1e4]" role="status">
            {FAIR_USE_MESSAGE}
          </p>
        ) : null}
        {freeLimitReached && !streaming && !nativeApp ? (
          <p className="mb-2 px-1 text-sm leading-6 text-[#f7f1e4]" role="status">
            {LIMIT_MESSAGE}
          </p>
        ) : null}

        <form onSubmit={onSubmit} className="prompt-shell rounded-[1.15rem] px-4 py-2.5 sm:px-5 sm:py-3">
          <div className="flex items-center gap-2">
            <label htmlFor="question" className="sr-only">
              Your message
            </label>
            <Textarea
              id="question"
              name="question"
              value={question}
              rows={1}
              maxLength={600}
              disabled={streaming || atLimit}
              className="prompt-input max-h-24 min-h-0 flex-1 resize-none border-0 bg-transparent px-1 py-1 text-[16px] text-[#f4f7fb] shadow-none placeholder:text-[#b7c0ca] focus-visible:ring-0 md:text-[16px]"
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
            />
            <Button
              type="submit"
              disabled={!canAsk}
              className="h-9 shrink-0 px-3"
            >
              {streaming ? "Listening…" : "Ask"}
            </Button>
          </div>
        </form>

        <footer className="composer-footer mt-2 flex flex-col items-center gap-1 px-2 text-center">
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-white/75">
            <span className="drop-shadow-[0_1px_6px_rgba(0,0,0,0.65)]">
              {remainingLabel(remaining, limit, unlockKind, fairUseReached)}
            </span>
            {hasConversation ? (
              <button
                type="button"
                onClick={startFresh}
                disabled={streaming}
                className="tracking-[0.14em] uppercase drop-shadow-[0_1px_6px_rgba(0,0,0,0.65)] hover:text-white disabled:opacity-50"
              >
                New conversation
              </button>
            ) : null}
            <Link
              href="/about"
              className="tracking-[0.14em] uppercase drop-shadow-[0_1px_6px_rgba(0,0,0,0.65)] hover:text-white"
            >
              About
            </Link>
            {nativeApp ? (
              <button
                type="button"
                onClick={() => {
                  setPaywallReason(freeLimitReached ? "limit" : "support");
                  setPaywallOpen(true);
                }}
                className="tracking-[0.14em] uppercase drop-shadow-[0_1px_6px_rgba(0,0,0,0.65)] hover:text-white"
              >
                Support
              </button>
            ) : platform === "web" ? (
              <SupportLink
                supportUrl={supportUrl}
                supportNote={supportNote}
                onSupportClick={onSupportClick}
              />
            ) : (
              <span className="tracking-[0.14em] uppercase opacity-0">Support</span>
            )}
          </div>
        </footer>
      </div>
      {nativeApp ? (
        <Paywall
          open={paywallOpen}
          reason={paywallReason}
          store={store}
          unlimitedCap={unlimitedCap}
          subscriptionActive={unlockKind === "subscription"}
          onOpenChange={setPaywallOpen}
          onUnlocked={(kind) => {
            const shown = shownUnlockKind([unlockKind, kind]);
            if (shown) setUnlockKind(shown);
            setNotice(unlockConfirmation(shown));
            if (noticeTimer.current) clearTimeout(noticeTimer.current);
            noticeTimer.current = setTimeout(() => setNotice(""), 4500);
            void reloadQuota();
          }}
        />
      ) : null}
    </div>
  );
}

function SupportLink({
  supportUrl,
  supportNote,
  onSupportClick,
}: {
  supportUrl: string;
  supportNote: boolean;
  onSupportClick: (event: MouseEvent<HTMLAnchorElement>) => void;
}) {
  return (
    <div>
      <a
        href={supportUrl || "#support"}
        onClick={onSupportClick}
        target={supportUrl ? "_blank" : undefined}
        rel={supportUrl ? "noopener noreferrer" : undefined}
        className="drop-shadow-[0_1px_6px_rgba(0,0,0,0.65)] hover:text-white"
      >
        Support this teaching
      </a>
      {supportNote ? (
        <p className="mt-2 text-xs leading-5 text-[#cbbfa8]">
          A giving page can be connected with NEXT_PUBLIC_SUPPORT_URL.
        </p>
      ) : null}
    </div>
  );
}
