import { desc, eq } from "drizzle-orm";
import { ensureSchema, getDb } from "../../../db";
import { menuAvailability, menuContent, storeSettings } from "../../../db/schema";
import { requireStaff } from "../../../lib/staff-auth";
import { effectiveOrderingHours } from "../../../lib/store-hours";

const DEFAULT_SETTINGS = {
  id: 1,
  prepTimeMinutes: 15,
  paused: false,
  openTime: "06:00",
  closeTime: "20:00",
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
    const [items, content, settings] = await Promise.all([
      getDb().select().from(menuAvailability).orderBy(desc(menuAvailability.updatedAt)),
      getDb().select().from(menuContent).orderBy(desc(menuContent.updatedAt)),
      readSettings(),
    ]);
    const hours = effectiveOrderingHours(settings);
    return Response.json({
      availability: Object.fromEntries(items.map((item) => [item.productId, item.available])),
      menu: content,
      prepTime: settings.prepTimeMinutes,
      paused: settings.paused,
      hours: {
        openTime: hours.openTime,
        closeTime: hours.closeTime,
        cutoffMinutes: settings.cutoffMinutes,
      },
      scheduling: {
        enabled: settings.schedulingEnabled,
        horizonMinutes: settings.schedulingHorizonMinutes,
        slotMinutes: settings.slotMinutes,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load menu state";
    return Response.json({ error: message }, { status: 500 });
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

    const settings = await readSettings();
    return Response.json({
      success: true,
      prepTime: settings.prepTimeMinutes,
      paused: settings.paused,
      productId: payload.productId,
      available: payload.available,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update menu state";
    return Response.json({ error: message }, { status: 500 });
  }
}
