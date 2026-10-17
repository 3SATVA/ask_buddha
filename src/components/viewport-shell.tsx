"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { viewportFrame } from "@/lib/viewport-frame";

/**
 * Pins the home screen to the visual viewport. The document itself does not
 * scroll, so opening the keyboard cannot slide the portrait off the top.
 */
export function ViewportShell({ children }: { children: ReactNode }) {
  const shellRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;

    const root = document.documentElement;
    root.classList.add("app-scroll-lock");
    let seenLayoutHeight = window.innerHeight;

    const apply = () => {
      const vv = window.visualViewport;
      const next = viewportFrame({
        offsetTop: vv?.offsetTop ?? 0,
        height: vv?.height ?? window.innerHeight,
        seenLayoutHeight,
      });
      seenLayoutHeight = next.layoutHeight;
      shell.style.setProperty("--vv-top", `${next.offsetTop}px`);
      shell.style.setProperty("--vv-height", `${next.height}px`);
      shell.style.setProperty("--layout-height", `${next.layoutHeight}px`);
      shell.dataset.keyboard = next.keyboard ? "open" : "closed";
      if (window.scrollX !== 0 || window.scrollY !== 0) window.scrollTo(0, 0);
    };

    const pinFocus = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.tagName !== "TEXTAREA" && target.tagName !== "INPUT") return;
      const pin = () => {
        if (window.scrollX !== 0 || window.scrollY !== 0) window.scrollTo(0, 0);
        apply();
      };
      pin();
      requestAnimationFrame(pin);
      window.setTimeout(pin, 60);
      window.setTimeout(pin, 320);
    };

    const onOrientation = () => {
      window.setTimeout(() => {
        seenLayoutHeight = window.visualViewport?.height ?? window.innerHeight;
        apply();
      }, 250);
    };

    apply();
    const vv = window.visualViewport;
    vv?.addEventListener("resize", apply);
    vv?.addEventListener("scroll", apply);
    window.addEventListener("resize", apply);
    window.addEventListener("scroll", apply, { passive: true });
    window.addEventListener("orientationchange", onOrientation);
    shell.addEventListener("focusin", pinFocus);

    return () => {
      vv?.removeEventListener("resize", apply);
      vv?.removeEventListener("scroll", apply);
      window.removeEventListener("resize", apply);
      window.removeEventListener("scroll", apply);
      window.removeEventListener("orientationchange", onOrientation);
      shell.removeEventListener("focusin", pinFocus);
      root.classList.remove("app-scroll-lock");
    };
  }, []);

  return (
    <main ref={shellRef} className="app-shell">
      {children}
    </main>
  );
}
