import { openai } from "@ai-sdk/openai";
import { createTextStreamResponse, streamText, type ModelMessage } from "ai";
import { NextResponse, type NextRequest } from "next/server";
import {
  FAIR_USE_MESSAGE,
  INVALID_MESSAGE,
  LIMIT_MESSAGE,
  MISSING_KEY_MESSAGE,
  UPSTREAM_MESSAGE,
  decideAsk,
} from "@/lib/ask";
import { normalizeConversation } from "@/lib/conversation";
import { crisisMessage } from "@/lib/crisis";
import {
  dailyLimit,
  hasOpenAIKey,
  maxOutputTokens,
  openaiModel,
  supportUrl,
  unlimitedDailyCap,
} from "@/lib/config";
import { instructionsForTurn } from "@/lib/prompt";
import { QUOTA_COOKIE, parseQuota, quotaSetCookie } from "@/lib/quota";
import { UNLOCK_SUPPRESS_HEADER, unlockSuppressedByHeader } from "@/lib/tester-device";
import {
  presentedUnlock,
  readUnlock,
  reportMissingUnlockSecret,
  unlockSecret,
} from "@/lib/unlock-cookie";

export const maxDuration = 60;

function quotaPayload(used: number, unlockKind: "day" | "subscription" | null) {
  const limit = dailyLimit();
  const cap = unlimitedDailyCap();
  return {
    used,
    limit,
    remaining: Math.max(0, limit - used),
    unlocked: Boolean(unlockKind),
    unlockKind,
    fairUseRemaining: unlockKind ? Math.max(0, cap - used) : null,
    supportUrl: supportUrl(),
  };
}

function unlockKindFor(request: NextRequest) {
  if (unlockSuppressedByHeader(request.headers.get(UNLOCK_SUPPRESS_HEADER))) return null;
  const secret = unlockSecret();
  const presented = presentedUnlock(request);
  if (presented && !secret) {
    reportMissingUnlockSecret();
    return null;
  }
  return readUnlock(presented, secret)?.kind ?? null;
}

export async function GET(request: NextRequest) {
  const used = parseQuota(request.cookies.get(QUOTA_COOKIE)?.value);
  return NextResponse.json(quotaPayload(used, unlockKindFor(request)), {
    headers: { "Cache-Control": "no-store" },
  });
}

function jsonError(
  status: number,
  error: "invalid" | "limit" | "fair_use" | "missing_key" | "upstream",
  message: string,
  used: number,
  unlockKind: "day" | "subscription" | null,
) {
  return NextResponse.json(
    { error, message, ...quotaPayload(used, unlockKind) },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

function textStream(text: string, headers?: HeadersInit) {
  const stream = new ReadableStream<string>({
    async start(controller) {
      const parts = text.split(/(\s+)/);
      for (const part of parts) {
        controller.enqueue(part);
        await new Promise((resolve) => setTimeout(resolve, 14));
      }
      controller.close();
    },
  });

  return createTextStreamResponse({
    stream,
    headers: { "Cache-Control": "no-store", ...headers },
  });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const conversation = normalizeConversation(body);
  const question = conversation?.question ?? null;
  const used = parseQuota(request.cookies.get(QUOTA_COOKIE)?.value);
  const limit = dailyLimit();
  const cap = unlimitedDailyCap();
  const unlockKind = unlockKindFor(request);
  const decision = decideAsk({
    question,
    used,
    limit,
    hasKey: hasOpenAIKey(),
    unlocked: Boolean(unlockKind),
    unlimitedCap: cap,
  });

  if (decision.type === "invalid") {
    return jsonError(400, "invalid", INVALID_MESSAGE, used, unlockKind);
  }

  if (decision.type === "crisis") {
    return textStream(crisisMessage(decision.kind), {
      "X-Questions-Remaining": String(Math.max(0, limit - used)),
      "X-Questions-Unlocked": unlockKind ? "1" : "0",
    });
  }

  if (decision.type === "limit") {
    return jsonError(429, "limit", LIMIT_MESSAGE, used, unlockKind);
  }

  if (decision.type === "fair_use") {
    return jsonError(429, "fair_use", FAIR_USE_MESSAGE, used, unlockKind);
  }

  if (decision.type === "missing_key") {
    return jsonError(503, "missing_key", MISSING_KEY_MESSAGE, used, unlockKind);
  }

  if (!conversation) {
    return jsonError(400, "invalid", INVALID_MESSAGE, used, unlockKind);
  }

  const nextUsed = used + 1;
  const fairUseRemaining = Math.max(0, cap - used);
  const messages: ModelMessage[] = [
    ...conversation.history,
    { role: "user", content: conversation.question },
  ];
  const result = streamText({
    model: openai(openaiModel()),
    instructions: instructionsForTurn(unlockKind ? fairUseRemaining : Math.max(0, limit - used), {
      unlimited: Boolean(unlockKind) && fairUseRemaining > 1,
    }),
    messages,
    maxOutputTokens: maxOutputTokens(),
    providerOptions: {
      openai: { reasoningEffort: "low" },
    },
    maxRetries: 1,
    abortSignal: request.signal,
    onError({ error }) {
      const message = error instanceof Error ? error.message : "unknown error";
      console.error("ASK BUDDHA model error:", message);
    },
  });

  let sawText = false;
  let failed = false;
  const stream = new ReadableStream<string>({
    async start(controller) {
      const reader = result.stream.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value.type === "text-delta") {
            sawText = true;
            controller.enqueue(value.text);
          } else if (value.type === "error") {
            failed = true;
            break;
          }
        }
      } catch (error) {
        failed = true;
        const message = error instanceof Error ? error.message : "unknown error";
        console.error("ASK BUDDHA stream error:", message);
      } finally {
        try {
          if (!sawText) controller.enqueue(UPSTREAM_MESSAGE);
          else if (failed) controller.enqueue(`\n\n${UPSTREAM_MESSAGE}`);
        } catch {
          // The client may already have gone.
        }
        controller.close();
        reader.releaseLock();
      }
    },
  });

  return createTextStreamResponse({
    stream,
    headers: {
      "Cache-Control": "no-store",
      "Set-Cookie": quotaSetCookie(nextUsed),
      "X-Questions-Remaining": String(Math.max(0, limit - nextUsed)),
      "X-Questions-Unlocked": unlockKind ? "1" : "0",
      ...(unlockKind
        ? { "X-Fair-Use-Remaining": String(Math.max(0, cap - nextUsed)) }
        : {}),
    },
  });
}
