"use client";

import { useEffect, useRef } from "react";

const MOBILE_PROGRESS_QUERY = "(max-width: 780px), (orientation: portrait)";

export function MobileScrollProgress() {
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const progress = progressRef.current;
    const root = document.scrollingElement;
    if (!progress || !root) return;
    const media = window.matchMedia(MOBILE_PROGRESS_QUERY);
    const nativeTimeline = CSS.supports("animation-timeline", "scroll(root block)");
    let frame = 0;
    let maxScroll = 0;
    let measure = true;
    let last = -1;
    let lastPercent = 0;

    const update = () => {
      frame = 0;
      if (!media.matches) return;
      if (measure) {
        maxScroll = Math.max(0, root.scrollHeight - root.clientHeight);
        measure = false;
      }
      const next = maxScroll ? Math.min(Math.max(window.scrollY / maxScroll, 0), 1) : 0;
      if (!nativeTimeline && next !== last) progress.style.setProperty("--page-scroll-progress", String(next));
      last = next;
      const percent = Math.round(next * 100);
      if (percent !== lastPercent) {
        progress.setAttribute("aria-valuenow", String(percent));
        lastPercent = percent;
      }
    };

    const requestUpdate = () => {
      if (media.matches && !frame) frame = window.requestAnimationFrame(update);
    };
    const invalidate = () => {
      measure = true;
      requestUpdate();
    };

    update();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", invalidate, { passive: true });
    window.addEventListener("pageshow", invalidate);
    media.addEventListener("change", invalidate);
    const observer = new ResizeObserver(invalidate);
    observer.observe(root);
    observer.observe(document.body);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", invalidate);
      window.removeEventListener("pageshow", invalidate);
      media.removeEventListener("change", invalidate);
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
      <div className="mobile-scroll-progress-fill" />
      <div className="mobile-scroll-progress-tip" />
    </div>
  );
}
