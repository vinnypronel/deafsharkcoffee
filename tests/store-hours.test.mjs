import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_WEEKLY_HOURS,
  effectiveOrderingHours,
  formatClock,
  hoursLines,
  orderingWindowStatus,
  parseWeeklyHours,
  validateWeeklyHours,
} from "../lib/store-hours.ts";

const legacy = { openTime: "06:00", closeTime: "18:30" };

test("default hours read as the current posted schedule", () => {
  assert.deepEqual(hoursLines(DEFAULT_WEEKLY_HOURS), [
    { label: "Mon–Fri", text: "6:00 AM – 6:30 PM" },
    { label: "Sat", text: "8:00 AM – 2:00 PM" },
    { label: "Sun", text: "Closed" },
  ]);
});

test("formats clock times for customers", () => {
  assert.equal(formatClock("00:15"), "12:15 AM");
  assert.equal(formatClock("12:00"), "12:00 PM");
  assert.equal(formatClock("18:30"), "6:30 PM");
});

test("saved weekly hours drive the ordering window", () => {
  const weekly = { ...DEFAULT_WEEKLY_HOURS, sun: { closed: false, open: "09:00", close: "13:00" }, wed: { closed: true, open: "06:00", close: "18:30" } };
  const sundayNoon = new Date("2026-09-13T16:00:00Z");
  const wednesdayNoon = new Date("2026-09-09T16:00:00Z");
  assert.deepEqual(effectiveOrderingHours({ ...legacy, weeklyHours: weekly }, sundayNoon), { openTime: "09:00", closeTime: "13:00", closed: false });
  assert.equal(effectiveOrderingHours({ ...legacy, weeklyHours: weekly }, wednesdayNoon).closed, true);
});

test("ordering opens with the shop and closes exactly 30 minutes before closing", () => {
  const settings = { ...legacy, weeklyHours: DEFAULT_WEEKLY_HOURS };
  assert.equal(orderingWindowStatus(settings, 30, new Date("2026-10-20T09:59:00Z")).orderingOpen, false);
  assert.equal(orderingWindowStatus(settings, 30, new Date("2026-10-20T10:00:00Z")).orderingOpen, true);
  assert.equal(orderingWindowStatus(settings, 30, new Date("2026-10-20T21:59:00Z")).orderingOpen, true);
  assert.equal(orderingWindowStatus(settings, 30, new Date("2026-10-20T22:00:00Z")).orderingOpen, false);
  assert.deepEqual(orderingWindowStatus(settings, 30, new Date("2026-10-20T22:05:00Z")), {
    openTime: "06:00",
    closeTime: "18:30",
    cutoffTime: "18:00",
    closed: false,
    orderingOpen: false,
  });
});

test("rejects invalid admin hours and repairs broken stored hours", () => {
  assert.equal(validateWeeklyHours({ ...DEFAULT_WEEKLY_HOURS, mon: { closed: false, open: "18:00", close: "06:00" } }), null);
  assert.equal(validateWeeklyHours({ ...DEFAULT_WEEKLY_HOURS, tue: { closed: false, open: "6am", close: "18:30" } }), null);
  assert.deepEqual(validateWeeklyHours(DEFAULT_WEEKLY_HOURS), DEFAULT_WEEKLY_HOURS);

  const repaired = parseWeeklyHours(JSON.stringify({ mon: { closed: false, open: "07:00", close: "15:00" }, tue: "junk" }));
  assert.deepEqual(repaired.mon, { closed: false, open: "07:00", close: "15:00" });
  assert.deepEqual(repaired.tue, DEFAULT_WEEKLY_HOURS.tue);
  assert.deepEqual(parseWeeklyHours("not json"), DEFAULT_WEEKLY_HOURS);
});
