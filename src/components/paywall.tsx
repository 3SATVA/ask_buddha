"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { catalogFor, type StoreName } from "@/lib/products";
import {
  loadStorePrices,
  manageSubscriptions,
  purchaseProduct,
  purchaseWasCancelled,
  restorePurchases,
  type UnlockKind,
} from "@/lib/storekit";

export function Paywall({
  open,
  reason,
  store,
  unlimitedCap,
  subscriptionActive,
  onOpenChange,
  onUnlocked,
}: {
  open: boolean;
  reason: "limit" | "support";
  store: StoreName;
  unlimitedCap: number;
  subscriptionActive: boolean;
  onOpenChange: (open: boolean) => void;
  onUnlocked: (kind: UnlockKind | null) => void;
}) {
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    loadStorePrices(store).then((next) => {
      if (!cancelled) setPrices(next);
    });
    return () => {
      cancelled = true;
    };
  }, [open, store]);

  async function run(id: string, action: () => Promise<{ unlockKind?: UnlockKind | null } | void>) {
    setBusyId(id);
    setNote("");
    try {
      const result = await action();
      onUnlocked(result?.unlockKind ?? null);
      onOpenChange(false);
    } catch (error) {
      if (!purchaseWasCancelled(error)) {
        setNote(error instanceof Error ? error.message : "That purchase could not be confirmed.");
      }
    } finally {
      setBusyId(null);
    }
  }

  const catalog = catalogFor(store);
  const offerings = [catalog.day, catalog.monthly].map((product) => ({
    id: product.id,
    label: `${product.title} · ${prices[product.id] ?? product.fallbackPrice}`,
    detail: product.detail,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(40rem,calc(100dvh-2rem))] overflow-y-auto border border-[rgba(46,229,157,0.28)] bg-[#141a28] text-[#f6efe2] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-3xl font-semibold text-[#fff8e8]">
            {reason === "limit" ? "I am still here" : "Support"}
          </DialogTitle>
          <DialogDescription className="text-base leading-7 text-[#f6efe2]">
            {reason === "limit"
              ? `Today's free messages are used. Unlimited today opens the rest of this day. A month keeps every day open. Each includes ${unlimitedCap} messages in a day.`
              : `A few messages each day are free. Unlimited today opens the rest of this day. A month keeps every day open. Each includes ${unlimitedCap} messages in a day.`}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {offerings.map((offering) => (
            <Button
              key={offering.id}
              type="button"
              disabled={busyId !== null}
              className="h-auto flex-col items-start gap-0 px-3 py-2 text-left whitespace-normal"
              onClick={() => run(offering.id, () => purchaseProduct(offering.id))}
            >
              <span>{busyId === offering.id ? "One moment…" : offering.label}</span>
              <span className="text-xs font-normal text-[#04281a]/80">{offering.detail}</span>
            </Button>
          ))}
          <Button
            type="button"
            variant="outline"
            disabled={busyId !== null}
            className="h-10"
            onClick={() => run("restore", restorePurchases)}
          >
            {busyId === "restore" ? "One moment…" : "Restore Purchases"}
          </Button>
          {subscriptionActive ? (
            <button
              type="button"
              className="text-sm text-[#2ee59d] underline decoration-[rgba(46,229,157,0.45)] underline-offset-4"
              onClick={() => {
                void manageSubscriptions().catch(() => {
                  setNote("Subscription settings could not be opened.");
                });
              }}
            >
              Manage subscription
            </button>
          ) : null}
        </div>
        {note ? (
          <p className="text-sm leading-6 text-[#f6efe2]" role="alert">
            {note}
          </p>
        ) : null}
        <p className="text-xs leading-5 text-[#cbbfa8]">
          {store === "google"
            ? "Google Play charges your Google account. Unlimited today is used once and lasts until midnight UTC. The monthly subscription renews each month until you cancel it in Google Play, at least a day before the period ends."
            : "Apple charges your Apple ID. Unlimited today is used once and lasts until midnight UTC. The monthly subscription renews each month until you cancel it in Settings, at least a day before the period ends."}{" "}
          A fair-use cap of {unlimitedCap} messages applies each UTC day.{" "}
          <Link href="/privacy" className="text-[#2ee59d] underline underline-offset-4">
            Privacy Policy
          </Link>
          {" · "}
          <Link href="/terms" className="text-[#2ee59d] underline underline-offset-4">
            Terms of Use
          </Link>
        </p>
      </DialogContent>
    </Dialog>
  );
}
