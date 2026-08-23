const STORE_TIME_ZONE = "America/New_York";
const SEPTEMBER_HOURS_START = "2026-09-01";

type StoredHours = { openTime: string; closeTime: string };

function storeDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: STORE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function effectiveOrderingHours(settings: StoredHours, date = new Date()) {
  if (storeDateKey(date) < SEPTEMBER_HOURS_START) {
    return { openTime: "06:00", closeTime: "17:00" };
  }
  return { openTime: settings.openTime, closeTime: settings.closeTime };
}
