"use client";

import { useEffect, useRef, useState } from "react";

type Phase = "hidden" | "enter" | "exit";

const COVER_MS = 180;
const EXIT_MS = 420;
const FAILSAFE_MS = 4000;
/* Set just before leaving a page, so the next page knows to fade in. The same
   key is read by the inline script in layout.tsx before the first paint. */
const ARRIVING_KEY = "deaf-shark-route";

export function PageTransition() {
  const [phase, setPhase] = useState<Phase>("hidden");
  /* True until the arrival fade has been picked up, so the first render does
     not wipe the mark the inline script set and restart the fade. */
  const arrivingRef = useRef(true);

  useEffect(() => {
    function handleRejection(event: PromiseRejectionEvent) {
      const reason = event.reason;
      const stack = reason?.stack || String(reason?.message || reason || "");
      if (
        stack.includes("chrome-extension://") ||
        stack.includes("moz-extension://") ||
        stack.includes("injectScript") ||
        stack.includes("Failed to fetch")
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }
    window.addEventListener("unhandledrejection", handleRejection);
    return () => window.removeEventListener("unhandledrejection", handleRejection);
  }, []);

  // A page reached through an in-site link fades in and finishes the line.
  useEffect(() => {
    if (document.documentElement.dataset.route === "in") setPhase("exit");
    else arrivingRef.current = false;
  }, []);

  useEffect(() => {
    const timers: number[] = [];
    let leaving = false;

    function settle() {
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.length = 0;
      leaving = false;
      try { window.sessionStorage.removeItem(ARRIVING_KEY); } catch { /* Storage can be blocked. */ }
      setPhase("hidden");
    }

    function handleClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      const anchor = (event.target as Element | null)?.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      if (/^(#|mailto:|tel:)/.test(href)) return;

      let url: URL;
      try { url = new URL(href, window.location.origin); } catch { return; }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return;

      event.preventDefault();
      if (leaving) return;
      leaving = true;
      const destination = url.pathname + url.search + url.hash;
      setPhase("enter");
      timers.push(
        window.setTimeout(() => {
          try { window.sessionStorage.setItem(ARRIVING_KEY, "1"); } catch { /* The next page simply appears without the fade. */ }
          window.location.href = destination;
        }, COVER_MS),
        // A cancelled or failed load must never leave the page faded out.
        window.setTimeout(settle, COVER_MS + FAILSAFE_MS),
      );
    }

    /* Going back can restore this page from the browser's back/forward cache
       exactly as it was left, mid-fade. Nothing re-runs then, so reset here. */
    function handlePageShow(event: PageTransitionEvent) {
      if (event.persisted) settle();
    }

    document.addEventListener("click", handleClick, true);
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("popstate", settle);
    return () => {
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("popstate", settle);
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  useEffect(() => {
    if (phase !== "exit") return;
    const timer = window.setTimeout(() => setPhase("hidden"), EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    const root = document.documentElement;
    if (phase === "enter") root.dataset.route = "out";
    else if (phase === "exit") root.dataset.route = "in";
    else if (!arrivingRef.current) delete root.dataset.route;
    if (phase === "exit") arrivingRef.current = false;
  }, [phase]);

  return <div aria-hidden="true" className={`route-line route-line-${phase}`} />;
}
