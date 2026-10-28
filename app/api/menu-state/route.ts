import { desc, eq } from "drizzle-orm";
import { ensureSchema, getDb } from "../../../db";
import { menuAvailability, menuContent, storeSettings } from "../../../db/schema";
import { requireStaff } from "../../../lib/staff-auth";
import { orderingWindowStatus, validateWeeklyHours } from "../../../lib/store-hours";
import { readStoreHours, StoreHoursMigrationError, writeStoreHours } from "../../../lib/store-hours-store";
import { readPauseState, validPauseMinutes, writePauseUntil } from "../../../lib/pause-state";
import { readRemovedMenuIds } from "../../../lib/menu-removed";

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

/* Every open menu page and the counter tablet ask for this every few seconds.
   One answer is shared for a few seconds per Cloudflare location instead of
   reading the database for each request, and any staff change below clears it
   at once. Placing an order never uses this: the order route checks pause and
   stock live, so nobody can order while ordering is off. */
const SHARED_SECONDS = 5;
const sharedKey = () => new Request("https://deafsharkcoffee.com/__shared/menu-state");
const sharedCache = () => (globalThis as { caches?: { default?: Cache } }).caches?.default;

async function clearSharedMenuState() {
  try { await sharedCache()?.delete(sharedKey()); } catch { /* The copy simply expires on its own. */ }
}

async function readSettings() {
  const [settings] = await getDb().select().from(storeSettings).where(eq(storeSettings.id, 1)).limit(1);
  return settings ?? DEFAULT_SETTINGS;
}

export async function GET() {
  try {
    const cache = sharedCache();
    if (cache) {
      const hit = await cache.match(sharedKey()).catch(() => undefined);
      if (hit) return new Response(hit.body, { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
    }
    await ensureSchema();
    const [items, content, settings, storeHours, pause, removed] = await Promise.all([
      getDb().select().from(menuAvailability).orderBy(desc(menuAvailability.updatedAt)),
      getDb().select().from(menuContent).orderBy(desc(menuContent.updatedAt)),
      readSettings(),
      readStoreHours(),
      readPauseState(),
      readRemovedMenuIds(),
    ]);
    const hours = orderingWindowStatus(
      { ...settings, weeklyHours: storeHours.weeklyHours },
      settings.cutoffMinutes,
    );
    const body = JSON.stringify({
      availability: Object.fromEntries(items.map((item) => [item.productId, item.available])),
      menu: content,
      removed,
      prepTime: settings.prepTimeMinutes,
      paused: pause.paused,
      pausedUntil: pause.pausedUntil,
      orderingOpen: hours.orderingOpen && !pause.paused,
      hours: {
        openTime: hours.openTime,
        closeTime: hours.closeTime,
        cutoffTime: hours.cutoffTime,
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
    if (cache) {
      await cache.put(sharedKey(), new Response(body, { headers: { "Content-Type": "application/json", "Cache-Control": `public, max-age=${SHARED_SECONDS}` } })).catch(() => undefined);
    }
    return new Response(body, { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
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
      /* Minutes a pause should last; omitted or unknown means until resumed. */
      pauseMinutes?: unknown;
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
    if (typeof payload.paused === "boolean") {
      await writePauseUntil(payload.paused, validPauseMinutes(payload.pauseMinutes));
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

    await clearSharedMenuState();
    const [settings, storeHours, pause] = await Promise.all([readSettings(), readStoreHours(), readPauseState()]);
    return Response.json({
      success: true,
      prepTime: settings.prepTimeMinutes,
      paused: pause.paused,
      pausedUntil: pause.pausedUntil,
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
