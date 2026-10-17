import { NextResponse, type NextRequest } from "next/server";
import { dailyLimit } from "@/lib/config";
import {
  reportMissingTesterResetCode,
  testerCodeMatches,
  testerResetCode,
  testerResetSetCookie,
  type TesterResetAction,
} from "@/lib/tester-reset";

export const maxDuration = 15;

const NOT_READY = "Tester reset is not available.";
const REJECTED = "That code was not accepted.";

function isAction(value: unknown): value is TesterResetAction {
  return value === "quota" || value === "unlock";
}

export async function POST(request: NextRequest) {
  const expected = testerResetCode();
  if (!expected) {
    reportMissingTesterResetCode();
    return NextResponse.json(
      { error: "not_configured", message: NOT_READY },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  let body: { action?: unknown; code?: unknown };
  try {
    body = (await request.json()) as { action?: unknown; code?: unknown };
  } catch {
    body = {};
  }

  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!isAction(body.action) || !code || code.length > 200) {
    return NextResponse.json(
      { error: "invalid", message: REJECTED },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (!testerCodeMatches(code, expected)) {
    return NextResponse.json(
      { error: "rejected", message: REJECTED },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (body.action === "quota") {
    return NextResponse.json(
      { ok: true, action: "quota", remaining: dailyLimit(), used: 0 },
      { headers: { "Cache-Control": "no-store", "Set-Cookie": testerResetSetCookie("quota") } },
    );
  }

  return NextResponse.json(
    { ok: true, action: "unlock", unlocked: false, unlockKind: null },
    { headers: { "Cache-Control": "no-store", "Set-Cookie": testerResetSetCookie("unlock") } },
  );
}
