"use client";

import { useEffect } from "react";
import Lenis from "lenis";

type WindowWithLenis = Window & { __lenis?: Lenis };

export function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const touchDevice = window.matchMedia("(max-width: 768px)").matches || "ontouchstart" in window;
    const dashboard = window.location.pathname.startsWith("/dashboard");

    if (reducedMotion || touchDevice || dashboard) return;

    const lenis = new Lenis({
      duration: 1.2,
      easing: (time) => Math.min(1, 1.001 - Math.pow(2, -10 * time)),
      smoothWheel: true,
      wheelMultiplier: 1,
    });

    (window as WindowWithLenis).__lenis = lenis;

    let frame = 0;
    const animate = (time: number) => {
      lenis.raf(time);
      frame = window.requestAnimationFrame(animate);
    };

    frame = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(frame);
      delete (window as WindowWithLenis).__lenis;
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
