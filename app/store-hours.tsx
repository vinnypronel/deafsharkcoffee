"use client";

import { useEffect, useState } from "react";
import { DEFAULT_WEEKLY_HOURS, hoursLines, parseWeeklyHours, type WeeklyHours } from "../lib/store-hours";

/** Public hours list. Renders the default hours immediately, then the hours an admin saved. */
export function StoreHours({ className = "business-hours", weeklyHours, hoursNote }: {
  className?: string;
  weeklyHours?: WeeklyHours;
  hoursNote?: string;
}) {
  const [weekly, setWeekly] = useState<WeeklyHours>(DEFAULT_WEEKLY_HOURS);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (weeklyHours) return;
    let cancelled = false;
    fetch("/api/menu-state", { cache: "no-store" })
      .then((response) => response.ok ? response.json() as Promise<{ weeklyHours?: unknown; hoursNote?: unknown }> : null)
      .then((data) => {
        if (cancelled || !data) return;
        setWeekly(parseWeeklyHours(data.weeklyHours));
        setNote(typeof data.hoursNote === "string" ? data.hoursNote : "");
      })
      .catch(() => { /* keep the default hours */ });
    return () => { cancelled = true; };
  }, [weeklyHours]);

  return (
    <div className={className}>
      {hoursLines(weeklyHours ?? weekly).map((line) => <span className="hours-line" key={line.label}><b>{`${line.label}:`}</b>{` ${line.text}`}</span>)}
      {(hoursNote ?? note) && <span className="hours-line hours-note">{hoursNote ?? note}</span>}
    </div>
  );
}
