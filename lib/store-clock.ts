/* Wall-clock parts in the shop's own time zone. Birthdays and promotion
   windows are judged by the calendar in Union, NJ, not by UTC or by whatever
   zone a customer's phone is set to. */

const STORE_TIME_ZONE = "America/New_York";

export type StoreClock = {
  year: number;
  month: number;
  day: number;
  weekday: number;
  /** "YYYY-MM-DD", sortable as a string. */
  date: string;
  /** "HH:MM", 24 hour, sortable as a string. */
  time: string;
};

export function storeClock(at: Date = new Date()): StoreClock {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: STORE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const part = (type: string) => parts.find((entry) => entry.type === type)?.value ?? "";
  return {
    year: Number(part("year")),
    month: Number(part("month")),
    day: Number(part("day")),
    weekday: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(part("weekday")),
    date: `${part("year")}-${part("month")}-${part("day")}`,
    time: `${part("hour")}:${part("minute")}`,
  };
}
