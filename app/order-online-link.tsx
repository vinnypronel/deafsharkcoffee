"use client";

import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { orderingAdapter } from "./ordering";

export function OrderOnlineLink({
  children,
  className,
  ariaLabel = "Order online",
  onClick,
  tabIndex,
}: {
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  tabIndex?: number;
}) {
  const integrated = orderingAdapter.mode === "integrated";
  const unavailable = !integrated && !orderingAdapter.hostedUrl;
  const [showComingSoon, setShowComingSoon] = useState(false);

  useEffect(() => {
    if (!showComingSoon) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowComingSoon(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    document.body.classList.add("modal-open");
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.classList.remove("modal-open");
    };
  }, [showComingSoon]);

  return (
    <>
      <a
        className={`${className ?? ""} online-order-link${unavailable ? " ordering-unavailable" : ""}`.trim()}
        href={unavailable ? undefined : (integrated ? "/menu" : orderingAdapter.hostedUrl ?? "/contact")}
        role={unavailable ? "button" : undefined}
        aria-label={unavailable ? `${ariaLabel} (coming soon)` : ariaLabel}
        aria-disabled={unavailable || undefined}
        tabIndex={tabIndex ?? (unavailable ? 0 : undefined)}
        title={unavailable ? "Online ordering is coming soon!" : undefined}
        onClick={(event) => {
          if (unavailable) {
            event.preventDefault();
            setShowComingSoon(true);
          }
          onClick?.(event);
        }}
      >
        {children}
      </a>

      {showComingSoon && (
        <div
          className="ordering-coming-soon-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowComingSoon(false);
          }}
        >
          <section className="ordering-coming-soon-card" role="dialog" aria-modal="true" aria-labelledby="ordering-coming-soon-title">
            <button className="ordering-coming-soon-close" type="button" onClick={() => setShowComingSoon(false)} aria-label="Close">
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M3.5 3.5l9 9m0-9-9 9" />
              </svg>
            </button>
            <img src="/favicon.png" alt="" aria-hidden="true" />
            <span className="ordering-coming-soon-eyebrow">Online ordering</span>
            <h2 id="ordering-coming-soon-title">Coming soon!</h2>
            <p>We’re putting the finishing touches on online ordering. In the meantime, call the shop and we’ll be happy to help.</p>
            <a className="primary-button ordering-coming-soon-call" href="tel:+19084818884">
              Call (908) 481-8884
            </a>
          </section>
        </div>
      )}
    </>
  );
}
