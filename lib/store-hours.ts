const STORE_TIME_ZONE = "America/New_York";

type StoredHours = { openTime: string; closeTime: string };
type EffectiveOrderingHours = { openTime: string; closeTime: string; closed: boolean };

function storeWeekday(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: STORE_TIME_ZONE,
    weekday: "short",
  }).format(date);
}

export function effectiveOrderingHours(settings: StoredHours, date = new Date()): EffectiveOrderingHours {
  const weekday = storeWeekday(date);
  if (weekday === "Sun") {
    return { openTime: "00:00", closeTime: "00:00", closed: true };
  }
  if (weekday === "Sat") {
    return { openTime: "08:00", closeTime: "14:00", closed: false };
  }
  return { openTime: settings.openTime, closeTime: settings.closeTime, closed: false };
}
