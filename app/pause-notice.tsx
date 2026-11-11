"use client";

import { createContext, useContext, useEffect, useState } from "react";

/** 12:34, or 1:02:03 past an hour. */
export function formatCountdown(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return hours ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

/* Shown wherever a customer tries to order while the shop has paused online
   ordering. A timed pause counts down to the second and calls onEnd at zero,
   so ordering reopens without a reload. */
/* Set by the menu page when ordering is off because the shop is closed rather
   than paused by staff, so every notice can say when ordering opens again. */
export type ClosedOrdering = { title: string; detail: string } | null;
export const ClosedOrderingContext = createContext<ClosedOrdering>(null);
export const useClosedOrdering = () => useContext(ClosedOrderingContext);

export function PauseNotice({ until, onEnd }: { until: number | null; onEnd?: () => void }) {
  const closed = useClosedOrdering();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!until) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [until]);

  useEffect(() => {
    if (until && now >= until) onEnd?.();
  }, [now, until, onEnd]);

  const resumesAt = until ? new Date(until).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "";

  if (closed) {
    return (
      <div className="pause-notice">
        <strong>{closed.title}</strong>
        <span>{closed.detail}</span>
      </div>
    );
  }

  return (
    <div className="pause-notice">
      <strong>Online ordering is paused</strong>
      {until ? (
        <span>
          Back in <b className="pause-countdown" aria-hidden="true">{formatCountdown(until - now)}</b>
          <span className="sr-only">at about {resumesAt}</span>. Your cart stays saved.
        </span>
      ) : (
        <span>It will be back shortly. Your cart stays saved, or you can order at the counter.</span>
      )}
    </div>
  );
}
