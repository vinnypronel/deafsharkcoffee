import { storeClock } from "./store-clock.ts";

/* Birthday drink: one free drink up to $8, in store only, on the birthday
   itself. The birthday has to be on the account before that day, so nobody can
   sign up at the counter on the day and claim it. Redeemed once per year. */

export const BIRTHDAY_DRINK_MAX_CENTS = 800;
export const BIRTHDAY_OFFER_PREFIX = "birthday_drink_";

export function birthdayOfferType(year: number) {
  return `${BIRTHDAY_OFFER_PREFIX}${year}`;
}

function isLeapYear(year: number) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function validBirthday(month: unknown, day: unknown) {
  if (!Number.isInteger(month) || !Number.isInteger(day)) return false;
  const m = Number(month);
  const d = Number(day);
  if (m < 1 || m > 12 || d < 1) return false;
  return d <= new Date(2000, m, 0).getDate();
}

export type BirthdayStatus = {
  onFile: boolean;
  month: number | null;
  day: number | null;
  /** Today is the customer's birthday in store time. */
  isToday: boolean;
  /** Today is the birthday and it was saved before today. */
  eligibleToday: boolean;
  year: number;
};

export function birthdayStatus(input: {
  month: number | null | undefined;
  day: number | null | undefined;
  setAt: Date | null | undefined;
  now?: Date;
}): BirthdayStatus {
  const today = storeClock(input.now ?? new Date());
  const month = input.month ?? null;
  const day = input.day ?? null;
  if (month === null || day === null) {
    return { onFile: false, month: null, day: null, isToday: false, eligibleToday: false, year: today.year };
  }
  /* A February 29 birthday is celebrated on February 28 in other years. */
  const celebratedDay = month === 2 && day === 29 && !isLeapYear(today.year) ? 28 : day;
  const isToday = today.month === month && today.day === celebratedDay;
  const savedBeforeToday = Boolean(input.setAt) && storeClock(input.setAt as Date).date < today.date;
  return { onFile: true, month, day, isToday, eligibleToday: isToday && savedBeforeToday, year: today.year };
}
