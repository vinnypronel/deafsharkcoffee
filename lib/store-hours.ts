/* Pure hours logic shared by the server (order checks) and the browser (the
   public hours list and the admin editor). No runtime imports on purpose. */
const STORE_TIME_ZONE = "America/New_York";

export const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
export type Weekday = typeof WEEKDAYS[number];
export type DayHours = { closed: boolean; open: string; close: string };
export type WeeklyHours = Record<Weekday, DayHours>;

export const WEEKDAY_NAMES: Record<Weekday, string> = {
  sun: "Sunday", mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday",
};
const WEEKDAY_SHORT: Record<Weekday, string> = {
  sun: "Sun", mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat",
};
/* Display order for the public list and the admin editor. */
export const DISPLAY_WEEK: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export const DEFAULT_WEEKLY_HOURS: WeeklyHours = {
  sun: { closed: true, open: "08:00", close: "14:00" },
  mon: { closed: false, open: "06:00", close: "18:30" },
  tue: { closed: false, open: "06:00", close: "18:30" },
  wed: { closed: false, open: "06:00", close: "18:30" },
  thu: { closed: false, open: "06:00", close: "18:30" },
  fri: { closed: false, open: "06:00", close: "18:30" },
  sat: { closed: false, open: "08:00", close: "14:00" },
};

const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;
const minutes = (clock: string) => Number(clock.slice(0, 2)) * 60 + Number(clock.slice(3, 5));

function validDay(value: unknown): DayHours | null {
  if (!value || typeof value !== "object") return null;
  const day = value as Partial<DayHours>;
  if (typeof day.closed !== "boolean" || typeof day.open !== "string" || typeof day.close !== "string") return null;
  if (!CLOCK.test(day.open) || !CLOCK.test(day.close)) return null;
  if (!day.closed && minutes(day.close) <= minutes(day.open)) return null;
  return { closed: day.closed, open: day.open, close: day.close };
}

/** Strict check for admin input. Returns null when any day is invalid. */
export function validateWeeklyHours(value: unknown): WeeklyHours | null {
  if (!value || typeof value !== "object") return null;
  const result = {} as WeeklyHours;
  for (const weekday of WEEKDAYS) {
    const day = validDay((value as Record<string, unknown>)[weekday]);
    if (!day) return null;
    result[weekday] = day;
  }
  return result;
}

/** Lenient read of stored hours. Any missing or broken day falls back to the default. */
export function parseWeeklyHours(value: unknown): WeeklyHours {
  let source = value;
  if (typeof source === "string") {
    try { source = JSON.parse(source); } catch { source = null; }
  }
  const record = source && typeof source === "object" ? source as Record<string, unknown> : {};
  const result = {} as WeeklyHours;
  for (const weekday of WEEKDAYS) result[weekday] = validDay(record[weekday]) ?? DEFAULT_WEEKLY_HOURS[weekday];
  return result;
}

type StoredHours = { openTime: string; closeTime: string; weeklyHours?: WeeklyHours | null };
type EffectiveOrderingHours = { openTime: string; closeTime: string; closed: boolean };

function storeWeekday(date: Date): Weekday {
  const short = new Intl.DateTimeFormat("en-US", { timeZone: STORE_TIME_ZONE, weekday: "short" }).format(date);
  return short.slice(0, 3).toLowerCase() as Weekday;
}

export function effectiveOrderingHours(settings: StoredHours, date = new Date()): EffectiveOrderingHours {
  const weekday = storeWeekday(date);
  if (settings.weeklyHours) {
    const day = settings.weeklyHours[weekday];
    return day.closed
      ? { openTime: "00:00", closeTime: "00:00", closed: true }
      : { openTime: day.open, closeTime: day.close, closed: false };
  }
  if (weekday === "sun") {
    return { openTime: "00:00", closeTime: "00:00", closed: true };
  }
  if (weekday === "sat") {
    return { openTime: "08:00", closeTime: "14:00", closed: false };
  }
  return { openTime: settings.openTime, closeTime: settings.closeTime, closed: false };
}

export function formatClock(clock: string) {
  const total = minutes(clock);
  const hour = Math.floor(total / 60);
  const minute = String(total % 60).padStart(2, "0");
  return `${hour % 12 === 0 ? 12 : hour % 12}:${minute} ${hour < 12 ? "AM" : "PM"}`;
}

/** Groups consecutive days with identical hours, e.g. "Mon–Fri: 6:00 AM – 6:30 PM". */
export function hoursLines(weekly: WeeklyHours) {
  const describe = (day: DayHours) => day.closed ? "Closed" : `${formatClock(day.open)} – ${formatClock(day.close)}`;
  const lines: Array<{ label: string; text: string }> = [];
  let start = 0;
  for (let index = 1; index <= DISPLAY_WEEK.length; index += 1) {
    const current = DISPLAY_WEEK[index];
    const previous = DISPLAY_WEEK[index - 1];
    if (current && describe(weekly[current]) === describe(weekly[previous])) continue;
    const first = WEEKDAY_SHORT[DISPLAY_WEEK[start]];
    const last = WEEKDAY_SHORT[previous];
    lines.push({ label: start === index - 1 ? first : `${first}–${last}`, text: describe(weekly[previous]) });
    start = index;
  }
  return lines;
}
