import { desc, eq } from "drizzle-orm";
import { ensureSchema, getDb } from "../../../db";
import { menuAvailability, menuContent, storeSettings } from "../../../db/schema";
import { requireStaff } from "../../../lib/staff-auth";
import { effectiveOrderingHours, validateWeeklyHours } from "../../../lib/store-hours";
import { readStoreHours, StoreHoursMigrationError, writeStoreHours } from "../../../lib/store-hours-store";

const DEFAULT_SETTINGS = {
  id: 1,
  prepTimeMinutes: 15,
  paused: false,
  openTime: "06:00",
  closeTime: "18:30",
  cutoffMinutes: 30,
  schedulingEnabled: true,
  schedulingHorizonMinutes: 240,
  slotMinutes: 15,
};

async function readSettings() {
  const [settings] = await getDb().select().from(storeSettings).where(eq(storeSettings.id, 1)).limit(1);
  return settings ?? DEFAULT_SETTINGS;
}

export async function GET() {
  try {
    await ensureSchema();
    const [items, content, settings, storeHours] = await Promise.all([
      getDb().select().from(menuAvailability).orderBy(desc(menuAvailability.updatedAt)),
      getDb().select().from(menuContent).orderBy(desc(menuContent.updatedAt)),
      readSettings(),
      readStoreHours(),
    ]);
    const hours = effectiveOrderingHours({ ...settings, weeklyHours: storeHours.weeklyHours });
    return Response.json({
      availability: Object.fromEntries(items.map((item) => [item.productId, item.available])),
      menu: content,
      prepTime: settings.prepTimeMinutes,
      paused: settings.paused,
      hours: {
        openTime: hours.openTime,
        closeTime: hours.closeTime,
        closed: hours.closed,
        cutoffMinutes: settings.cutoffMinutes,
      },
      weeklyHours: storeHours.weeklyHours,
      hoursNote: storeHours.hoursNote,
      scheduling: {
        enabled: settings.schedulingEnabled,
        horizonMinutes: settings.schedulingHorizonMinutes,
        slotMinutes: settings.slotMinutes,
      },
    });
  } catch (error) {
    console.error(JSON.stringify({ event: "menu_state_failed", errorType: error instanceof Error ? error.name : "UnknownError" }));
    return Response.json({ error: "Unable to load menu state right now." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const staff = await requireStaff(request);
    if (staff.response) return staff.response;
    await ensureSchema();
    const payload = (await request.json()) as {
      productId?: string;
      available?: boolean;
      prepTime?: number;
      paused?: boolean;
      weeklyHours?: unknown;
      hoursNote?: unknown;
    };

    const settingsUpdate: { prepTimeMinutes?: number; paused?: boolean; updatedAt: Date } = { updatedAt: new Date() };
    if (typeof payload.prepTime === "number") {
      settingsUpdate.prepTimeMinutes = Math.min(120, Math.max(5, Math.round(payload.prepTime)));
    }
    if (typeof payload.paused === "boolean") settingsUpdate.paused = payload.paused;

    if (settingsUpdate.prepTimeMinutes !== undefined || settingsUpdate.paused !== undefined) {
      await getDb().insert(storeSettings).values({
        ...DEFAULT_SETTINGS,
        ...settingsUpdate,
        updatedAt: new Date(),
      }).onConflictDoUpdate({ target: storeSettings.id, set: settingsUpdate });
    }

    if (payload.weeklyHours !== undefined) {
      const weeklyHours = validateWeeklyHours(payload.weeklyHours);
      if (!weeklyHours) {
        return Response.json({ error: "Check the hours. Each open day needs a closing time later than its opening time." }, { status: 400 });
      }
      const hoursNote = typeof payload.hoursNote === "string" ? payload.hoursNote.trim().slice(0, 160) : "";
      await getDb().insert(storeSettings).values({ ...DEFAULT_SETTINGS, updatedAt: new Date() }).onConflictDoNothing({ target: storeSettings.id });
      await writeStoreHours(weeklyHours, hoursNote);
    }

    if (payload.productId && typeof payload.available === "boolean") {
      await getDb()
        .insert(menuAvailability)
        .values({
          productId: payload.productId,
          available: payload.available,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: menuAvailability.productId,
          set: { available: payload.available, updatedAt: new Date() },
        });
    }

    const [settings, storeHours] = await Promise.all([readSettings(), readStoreHours()]);
    return Response.json({
      success: true,
      prepTime: settings.prepTimeMinutes,
      paused: settings.paused,
      productId: payload.productId,
      available: payload.available,
      weeklyHours: storeHours.weeklyHours,
      hoursNote: storeHours.hoursNote,
    });
  } catch (error) {
    if (error instanceof StoreHoursMigrationError) return Response.json({ error: error.message }, { status: 503 });
    const message = error instanceof Error ? error.message : "Unable to update menu state";
    return Response.json({ error: message }, { status: 500 });
  }
}
