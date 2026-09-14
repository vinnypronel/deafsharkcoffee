"use client";

import { useEffect, useRef } from "react";
import type Lenis from "lenis";

const DESKTOP_QUERY = "(min-width: 1181px)";
const MIN_THUMB_HEIGHT = 48;
const HIDE_DELAY = 650;
/* How close to the right edge the pointer has to be to reveal the thumb. */
const EDGE_REVEAL_PX = 28;

type WindowWithLenis = Window & { __lenis?: Lenis };

export function DesktopScrollThumb() {
  const thumbRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const thumb = thumbRef.current;
    if (!thumb) return;

    const desktop = window.matchMedia(DESKTOP_QUERY);
    let hideTimer = 0;
    let frame = 0;
    let hovering = false;
    let nearEdge = false;
    let drag: { pointerId: number; startY: number; startScroll: number; ratio: number } | null = null;

    const metrics = () => {
      const viewportHeight = window.innerHeight;
      const scrollHeight = document.documentElement.scrollHeight;
      const maxScroll = Math.max(0, scrollHeight - viewportHeight);
      const thumbHeight = Math.max(MIN_THUMB_HEIGHT, (viewportHeight * viewportHeight) / Math.max(scrollHeight, 1));
      const maxTop = Math.max(0, viewportHeight - thumbHeight);
      return { maxScroll, thumbHeight, maxTop };
    };

    const currentScroll = () => (window as WindowWithLenis).__lenis?.scroll ?? window.scrollY;

    const place = (scroll: number) => {
      const { maxScroll, thumbHeight, maxTop } = metrics();
      if (!desktop.matches || maxScroll === 0) {
        thumb.style.opacity = "0";
        thumb.style.pointerEvents = "none";
        return false;
      }
      const top = (Math.min(Math.max(scroll, 0), maxScroll) / maxScroll) * maxTop;
      thumb.style.height = `${thumbHeight}px`;
      thumb.style.transform = `translate3d(0, ${top}px, 0)`;
      thumb.style.pointerEvents = "auto";
      return true;
    };

    const show = () => {
      window.clearTimeout(hideTimer);
      thumb.style.opacity = "1";
    };

    /* Stays up while the pointer is on it, near the edge, or dragging. */
    const scheduleHide = () => {
      window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => {
        if (!hovering && !nearEdge && !drag) thumb.style.opacity = "0";
      }, HIDE_DELAY);
    };

    const scheduleUpdate = (reveal: boolean) => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        if (place(currentScroll()) && reveal) {
          show();
          scheduleHide();
        }
      });
    };

    const handleScroll = () => {
      /* While dragging, pointermove already placed the thumb this frame. */
      if (!drag) scheduleUpdate(true);
    };

    const handleResize = () => scheduleUpdate(false);

    const handleWindowPointerMove = (event: PointerEvent) => {
      if (drag || event.pointerType !== "mouse") return;
      const wasNear = nearEdge;
      nearEdge = event.clientX >= window.innerWidth - EDGE_REVEAL_PX;
      if (nearEdge && !wasNear && place(currentScroll())) show();
      if (!nearEdge && wasNear) scheduleHide();
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      const { maxScroll, maxTop } = metrics();
      if (maxScroll === 0 || maxTop === 0) return;
      event.preventDefault();
      /* One pixel of thumb travel moves the page by the whole scroll range
         divided by the track, so the page keeps up with the pointer exactly. */
      drag = { pointerId: event.pointerId, startY: event.clientY, startScroll: currentScroll(), ratio: maxScroll / maxTop };
      document.documentElement.classList.add("scroll-thumb-dragging");
      show();
      /* Capture keeps the drag alive when the pointer leaves the thin bar. */
      try {
        thumb.setPointerCapture(event.pointerId);
      } catch {
        // The pointer is already gone; the drag ends on the next pointerup.
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      const { maxScroll } = metrics();
      const target = Math.min(Math.max(drag.startScroll + (event.clientY - drag.startY) * drag.ratio, 0), maxScroll);
      /* Immediate jumps skip the smooth-scroll easing, which is what made
         dragging feel laggy. */
      const lenis = (window as WindowWithLenis).__lenis;
      if (lenis) lenis.scrollTo(target, { immediate: true, force: true });
      else window.scrollTo(0, target);
      place(target);
    };

    const endDrag = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      drag = null;
      if (thumb.hasPointerCapture(event.pointerId)) thumb.releasePointerCapture(event.pointerId);
      document.documentElement.classList.remove("scroll-thumb-dragging");
      scheduleHide();
    };

    const handleEnter = () => { hovering = true; show(); };
    const handleLeave = () => { hovering = false; scheduleHide(); };

    place(currentScroll());
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize, { passive: true });
    window.addEventListener("pointermove", handleWindowPointerMove, { passive: true });
    desktop.addEventListener("change", handleResize);
    thumb.addEventListener("pointerdown", handlePointerDown);
    thumb.addEventListener("pointermove", handlePointerMove);
    thumb.addEventListener("pointerup", endDrag);
    thumb.addEventListener("pointercancel", endDrag);
    thumb.addEventListener("pointerenter", handleEnter);
    thumb.addEventListener("pointerleave", handleLeave);

    return () => {
      window.clearTimeout(hideTimer);
      if (frame) window.cancelAnimationFrame(frame);
      document.documentElement.classList.remove("scroll-thumb-dragging");
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("pointermove", handleWindowPointerMove);
      desktop.removeEventListener("change", handleResize);
      thumb.removeEventListener("pointerdown", handlePointerDown);
      thumb.removeEventListener("pointermove", handlePointerMove);
      thumb.removeEventListener("pointerup", endDrag);
      thumb.removeEventListener("pointercancel", endDrag);
      thumb.removeEventListener("pointerenter", handleEnter);
      thumb.removeEventListener("pointerleave", handleLeave);
    };
  }, []);

  return <div ref={thumbRef} className="desktop-scroll-thumb" aria-hidden="true" />;
}
