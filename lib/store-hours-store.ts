import { env } from "cloudflare:workers";
import { DEFAULT_WEEKLY_HOURS, parseWeeklyHours, type WeeklyHours } from "./store-hours";

export type StoreHoursRecord = { weeklyHours: WeeklyHours; hoursNote: string };

export class StoreHoursMigrationError extends Error {}

/* weekly_hours and hours_note come from migration 0017. They are read with raw
   SQL, outside the Drizzle schema, so the site keeps serving the default hours
   instead of failing if that migration has not been applied yet. */
export async function readStoreHours(): Promise<StoreHoursRecord> {
  try {
    const row = await env.DB.prepare("SELECT weekly_hours, hours_note FROM store_settings WHERE id = 1")
      .first<{ weekly_hours: string | null; hours_note: string | null }>();
    return { weeklyHours: parseWeeklyHours(row?.weekly_hours), hoursNote: row?.hours_note ?? "" };
  } catch {
    return { weeklyHours: DEFAULT_WEEKLY_HOURS, hoursNote: "" };
  }
}

export async function writeStoreHours(weeklyHours: WeeklyHours, hoursNote: string) {
  try {
    await env.DB.prepare("UPDATE store_settings SET weekly_hours = ?, hours_note = ?, updated_at = unixepoch() WHERE id = 1")
      .bind(JSON.stringify(weeklyHours), hoursNote || null)
      .run();
  } catch (error) {
    if (error instanceof Error && /no such column/i.test(error.message)) {
      throw new StoreHoursMigrationError("Hours editing needs the latest database update (migration 0017). Ask the site developer to apply it.");
    }
    throw error;
  }
}
