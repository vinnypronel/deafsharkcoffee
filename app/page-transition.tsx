"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";

export function PageTransition() {
  const pathname = usePathname();
  const [transitionState, setTransitionState] = useState<"idle" | "entering" | "covering" | "exiting">("exiting");
  const isNavigatingRef = useRef(false);
  const targetUrlRef = useRef<string | null>(null);

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

  // When pathname changes (or on initial load), exit the curtain smoothly upwards
  useEffect(() => {
    // Reveal the newly loaded page immediately
    const timer = setTimeout(() => {
      setTransitionState("exiting");
      const endTimer = setTimeout(() => {
        setTransitionState("idle");
        isNavigatingRef.current = false;
      }, 380);
      return () => clearTimeout(endTimer);
    }, 15);

    return () => clearTimeout(timer);
  }, [pathname]);

  // Intercept internal link clicks to trigger the drop-down transition
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }

      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (!href) return;

      // Ignore hash links, mailto, tel, target="_blank", or external urls
      if (
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        target.target === "_blank" ||
        target.hasAttribute("download")
      ) {
        return;
      }

      const currentPath = window.location.pathname;
      const url = new URL(href, window.location.origin);

      if (url.origin !== window.location.origin) return;

      // If it's navigating to a different page route
      if (url.pathname !== currentPath) {
        e.preventDefault();
        if (isNavigatingRef.current) return;
        isNavigatingRef.current = true;
        targetUrlRef.current = url.pathname + url.search + url.hash;

        // Phase 1: Drop curtain down from top to bottom
        setTransitionState("entering");

        setTimeout(() => {
          setTransitionState("covering");
          // Navigate once the curtain completely covers the screen
          window.location.href = targetUrlRef.current || href;
        }, 370);
      }
    }

    document.addEventListener("click", handleClick, { capture: true });
    return () => document.removeEventListener("click", handleClick, { capture: true });
  }, []);

  if (transitionState === "idle") {
    return null;
  }

  const isEntering = transitionState === "entering" || transitionState === "covering";
  const isExiting = transitionState === "exiting";

  return (
    <div
      className={`page-transition-curtain ${isEntering ? "curtain-enter" : ""} ${isExiting ? "curtain-exit" : ""}`}
      aria-hidden="true"
    >
      <div className="curtain-glow" />
      <div className="curtain-content">
        <div className="curtain-stamp-wrap">
          <img src="/deafshark-logo-640.webp" alt="" className="curtain-stamp-logo" decoding="async" />
        </div>
        <div className="curtain-brand-line">
          <img src="/favicon.png" alt="" className="curtain-fin-icon" />
          <span className="curtain-brand-title">Deaf Shark Coffee</span>
        </div>
        <div className="curtain-divider" />
        <span className="curtain-origin-tag">Roasted in Union, NJ · El Salvador Origin</span>
      </div>
    </div>
  );
}
