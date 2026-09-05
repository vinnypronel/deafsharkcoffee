"use client";

import { useEffect, useRef } from "react";

const DESKTOP_QUERY = "(min-width: 1181px)";
const MIN_THUMB_HEIGHT = 48;
const HIDE_DELAY = 650;

export function DesktopScrollThumb() {
  const thumbRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const thumb = thumbRef.current;
    if (!thumb) return;

    const desktop = window.matchMedia(DESKTOP_QUERY);
    let hideTimer = 0;
    let frame = 0;

    const update = (show: boolean) => {
      frame = 0;

      if (!desktop.matches) {
        thumb.style.opacity = "0";
        return;
      }

      const viewportHeight = window.innerHeight;
      const scrollHeight = document.documentElement.scrollHeight;
      const maxScroll = Math.max(0, scrollHeight - viewportHeight);

      if (maxScroll === 0) {
        thumb.style.opacity = "0";
        return;
      }

      const thumbHeight = Math.max(
        MIN_THUMB_HEIGHT,
        (viewportHeight * viewportHeight) / scrollHeight,
      );
      const maxTop = Math.max(0, viewportHeight - thumbHeight);
      const top = (window.scrollY / maxScroll) * maxTop;

      thumb.style.height = `${thumbHeight}px`;
      thumb.style.transform = `translate3d(0, ${top}px, 0)`;
      if (show) thumb.style.opacity = "1";
    };

    const scheduleUpdate = (show: boolean) => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => update(show));
    };

    const handleScroll = () => {
      scheduleUpdate(true);
      window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => {
        thumb.style.opacity = "0";
      }, HIDE_DELAY);
    };

    const handleResize = () => {
      window.clearTimeout(hideTimer);
      scheduleUpdate(false);
    };

    update(false);
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize, { passive: true });
    desktop.addEventListener("change", handleResize);

    return () => {
      window.clearTimeout(hideTimer);
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
      desktop.removeEventListener("change", handleResize);
    };
  }, []);

  return <div ref={thumbRef} className="desktop-scroll-thumb" aria-hidden="true" />;
}
