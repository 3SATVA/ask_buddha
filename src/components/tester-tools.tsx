"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { rememberUnlockToken } from "@/lib/unlock-token";
import {
  notifyTesterReset,
  readTesterCode,
  rememberTesterCode,
  setUnlockSuppressed,
} from "@/lib/tester-device";

export function TesterTools({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [code, setCode] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState<"quota" | "unlock" | null>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;
    setSaved(Boolean(readTesterCode()));
    setNote("");
    setCode("");
  }, [open]);

  async function run(action: "quota" | "unlock") {
    const testerCode = readTesterCode();
    if (!testerCode) {
      setSaved(false);
      setNote("Enter the tester code first.");
      return;
    }
    setBusy(action);
    setNote("");
    try {
      const response = await fetch("/api/tester/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action, code: testerCode }),
      });
      const data = (await response.json().catch(() => null)) as { message?: string } | null;
      if (response.status === 401 || response.status === 400) {
        rememberTesterCode(null);
        setSaved(false);
        setNote(data?.message || "That code was not accepted.");
        return;
      }
      if (!response.ok) {
        setNote(data?.message || "Tester reset is not available.");
        return;
      }
      if (action === "unlock") {
        setUnlockSuppressed(true);
        rememberUnlockToken(null);
        notifyTesterReset({ unlockCleared: true });
        setNote("Unlock cleared on this device.");
        return;
      }
      notifyTesterReset({ quotaReset: true });
      setNote("Today's free messages are reset on this device.");
    } catch {
      setNote("Tester reset is not available.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border border-[rgba(46,229,157,0.28)] bg-[#141a28] text-[#f6efe2] sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-cinzel tracking-[0.12em]">Tester tools</DialogTitle>
          <DialogDescription className="text-[#d9d0c3]">
            Only this device. The code stays on this device after you enter it once.
          </DialogDescription>
        </DialogHeader>
        {!saved ? (
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const trimmed = code.trim();
              if (!trimmed) return;
              rememberTesterCode(trimmed);
              setSaved(true);
              setCode("");
              setNote("Code saved on this device.");
            }}
          >
            <label className="sr-only" htmlFor="tester-code">
              Tester code
            </label>
            <input
              id="tester-code"
              type="password"
              autoComplete="off"
              value={code}
              maxLength={200}
              onChange={(event) => setCode(event.target.value)}
              placeholder="Tester code"
              className="h-9 min-w-0 flex-1 rounded-lg border border-white/15 bg-black/30 px-3 text-sm text-[#f6efe2] outline-none"
            />
            <Button type="submit" className="h-9 shrink-0 px-3">
              Save
            </Button>
          </form>
        ) : null}
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={busy != null}
            onClick={() => void run("quota")}
            className="border-white/20 bg-transparent text-[#f6efe2] hover:bg-white/10"
          >
            {busy === "quota" ? "Resetting…" : "Reset today's free messages"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy != null}
            onClick={() => void run("unlock")}
            className="border-white/20 bg-transparent text-[#f6efe2] hover:bg-white/10"
          >
            {busy === "unlock" ? "Clearing…" : "Clear unlock on this device"}
          </Button>
        </div>
        {note ? (
          <p className="text-sm leading-6 text-[#2ee59d]" role="status">
            {note}
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
