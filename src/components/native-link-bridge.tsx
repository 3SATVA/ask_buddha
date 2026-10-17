"use client";

import { useEffect } from "react";

/** Open links that leave this site in the system browser. The native shells have no payment links of their own. */
export function NativeLinkBridge() {
  useEffect(() => {
    let remove = () => {};
    let cancelled = false;
    (async () => {
      const { Capacitor } = await import("@capacitor/core");
      const platform = Capacitor.getPlatform();
      if (cancelled || !Capacitor.isNativePlatform() || (platform !== "ios" && platform !== "android")) {
        return;
      }
      const onClick = (event: MouseEvent) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        const anchor = target.closest("a");
        if (!anchor) return;
        const href = anchor.getAttribute("href");
        if (!href || href.startsWith("#") || href.startsWith("/")) return;
        let url: URL;
        try {
          url = new URL(anchor.href);
        } catch {
          return;
        }
        if (url.origin === window.location.origin) return;
        event.preventDefault();
        void import("@capacitor/browser").then(({ Browser }) => Browser.open({ url: url.toString() }));
      };
      document.addEventListener("click", onClick);
      remove = () => document.removeEventListener("click", onClick);
    })();
    return () => {
      cancelled = true;
      remove();
    };
  }, []);
  return null;
}
