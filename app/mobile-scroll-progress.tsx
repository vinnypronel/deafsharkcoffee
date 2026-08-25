"use client";

import { useEffect, useRef } from "react";

export function MobileScrollProgress() {
  const progressRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      const root = document.documentElement;
      const maxScroll = Math.max(root.scrollHeight - window.innerHeight, 0);
      const remaining = maxScroll - window.scrollY;
      const next = maxScroll === 0 || remaining <= 1
        ? 100
        : Math.min(Math.max(window.scrollY / maxScroll, 0), 1) * 100;
      if (fillRef.current) {
        fillRef.current.style.height = `${next}%`;
        fillRef.current.style.opacity = next > 0.15 ? "1" : "0";
      }
      progressRef.current?.setAttribute("aria-valuenow", String(Math.round(next)));
    };

    const requestUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    const observer = new ResizeObserver(requestUpdate);
    observer.observe(document.documentElement);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={progressRef}
      className="mobile-scroll-progress"
      role="progressbar"
      aria-label="Page scroll progress"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={0}
    >
      <div
        ref={fillRef}
        className="mobile-scroll-progress-fill"
        style={{ height: "0%", opacity: 0 }}
      />
    </div>
  );
}
