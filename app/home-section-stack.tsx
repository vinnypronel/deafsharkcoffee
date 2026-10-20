"use client";

import { useEffect } from "react";

/* Phone and tablet only: each home page section stops once its bottom reaches
   the bottom of the screen, and the next section slides up over it like a card.
   The hero and the menu already do this; this carries it through the rest. */
const STACK_MEDIA = "(max-width: 780px), (min-width: 781px) and (orientation: portrait)";
const CARD_SELECTOR = [
  ".mobile-order-overlay-stage:not(.is-standalone)",
  ".take-home-section",
  ".origin-section",
  ".menu-boards-section",
  ".visit-section",
  ".site-footer",
].join(", ");

export function HomeSectionStack() {
  useEffect(() => {
    const main = document.querySelector("main");
    if (!main) return;
    const media = window.matchMedia(STACK_MEDIA);
    let observer: ResizeObserver | null = null;
    let cards: HTMLElement[] = [];

    /* The CSS pins each card at the lower of the header line or the point where
       its bottom meets the screen bottom, which needs each card's own height. */
    const measure = (entries?: ResizeObserverEntry[]) => {
      for (const card of entries ? entries.map((entry) => entry.target as HTMLElement) : cards) {
        card.style.setProperty("--stack-card-h", `${Math.ceil(card.getBoundingClientRect().height)}px`);
      }
    };
    const stop = () => {
      observer?.disconnect();
      observer = null;
      main.classList.remove("home-stack");
      cards.forEach((card) => card.style.removeProperty("--stack-card-h"));
      cards = [];
    };
    const start = () => {
      stop();
      if (!media.matches) return;
      cards = [...main.querySelectorAll<HTMLElement>(CARD_SELECTOR)].filter((card) => card.parentElement === main);
      if (!cards.length) return;
      main.classList.add("home-stack");
      measure();
      observer = new ResizeObserver((entries) => measure(entries));
      cards.forEach((card) => observer?.observe(card));
    };

    start();
    media.addEventListener("change", start);
    return () => {
      media.removeEventListener("change", start);
      stop();
    };
  }, []);

  return null;
}
