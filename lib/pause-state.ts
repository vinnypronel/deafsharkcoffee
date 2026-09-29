import { env } from "cloudflare:workers";

/* Online ordering pause, optionally timed. `paused_until` (migration 0022) is
   read with raw SQL like the weekly hours, so a database that has not been
   migrated yet still pauses and resumes, just without an end time. */

export type PauseState = {
  paused: boolean;
  /** When a timed pause ends, in epoch milliseconds; null for "until resumed". */
  pausedUntil: number | null;
};

export const PAUSE_MINUTE_CHOICES = [15, 30, 45, 60, 90, 120] as const;

export function effectivePause(paused: boolean, pausedUntilSeconds: number | null, now = Date.now()): PauseState {
  if (!paused) return { paused: false, pausedUntil: null };
  if (pausedUntilSeconds && pausedUntilSeconds * 1000 <= now) return { paused: false, pausedUntil: null };
  return { paused: true, pausedUntil: pausedUntilSeconds ? pausedUntilSeconds * 1000 : null };
}

export async function readPauseState(): Promise<PauseState> {
  try {
    const row = await env.DB.prepare("SELECT paused, paused_until FROM store_settings WHERE id = 1")
      .first<{ paused: number | null; paused_until: number | null }>();
    return effectivePause(Boolean(row?.paused), row?.paused_until ?? null);
  } catch {
    const row = await env.DB.prepare("SELECT paused FROM store_settings WHERE id = 1").first<{ paused: number | null }>();
    return effectivePause(Boolean(row?.paused), null);
  }
}

/** Sets the end time of a pause that was just switched on or off. */
export async function writePauseUntil(paused: boolean, minutes: number | null) {
  const until = paused && minutes ? Math.floor(Date.now() / 1000) + minutes * 60 : null;
  try {
    await env.DB.prepare("UPDATE store_settings SET paused_until = ? WHERE id = 1").bind(until).run();
  } catch {
    /* Column not migrated yet: the pause still works, without a countdown. */
  }
}

export function validPauseMinutes(value: unknown): number | null {
  return typeof value === "number" && (PAUSE_MINUTE_CHOICES as readonly number[]).includes(value) ? value : null;
}
