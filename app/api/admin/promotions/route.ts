import { eq } from "drizzle-orm";
import { ensureSchema, getDb } from "../../../../db";
import { promotions } from "../../../../db/schema";
import { requireStaff } from "../../../../lib/staff-auth";
import { loadPromotions } from "../../../../lib/promotion-store";
import { validatePromotion, type PromotionFields } from "../../../../lib/promotions";

function rowValues(value: PromotionFields) {
  const { days, ...rest } = value;
  return { ...rest, daysJson: JSON.stringify(days) };
}

async function readPayload(request: Request) {
  try {
    return await request.json() as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const staff = await requireStaff(request);
  if (staff.response) return staff.response;
  await ensureSchema();
  return Response.json({ promotions: await loadPromotions() }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const staff = await requireStaff(request);
  if (staff.response) return staff.response;
  await ensureSchema();

  const payload = await readPayload(request);
  if (!payload) return Response.json({ error: "We could not read that promotion." }, { status: 400 });
  const result = validatePromotion(payload);
  if ("error" in result) return Response.json({ error: result.error }, { status: 400 });

  const now = new Date();
  const [created] = await getDb().insert(promotions).values({ ...rowValues(result.value), createdAt: now, updatedAt: now }).returning();
  return Response.json({ ok: true, id: created.id }, { status: 201 });
}

/* Editing a promotion changes how future completions earn. Points already
   awarded stay as they are: they are in the ledger with their own reference. */
export async function PATCH(request: Request) {
  const staff = await requireStaff(request);
  if (staff.response) return staff.response;
  await ensureSchema();

  const payload = await readPayload(request);
  const id = Number(payload?.id);
  if (!payload || !Number.isInteger(id) || id < 1) return Response.json({ error: "Choose a promotion to update." }, { status: 400 });

  const [existing] = await getDb().select().from(promotions).where(eq(promotions.id, id)).limit(1);
  if (!existing) return Response.json({ error: "That promotion no longer exists." }, { status: 404 });

  if (Object.keys(payload).length === 2 && typeof payload.active === "boolean") {
    await getDb().update(promotions).set({ active: payload.active, updatedAt: new Date() }).where(eq(promotions.id, id));
    return Response.json({ ok: true });
  }

  const result = validatePromotion(payload);
  if ("error" in result) return Response.json({ error: result.error }, { status: 400 });
  await getDb().update(promotions).set({ ...rowValues(result.value), updatedAt: new Date() }).where(eq(promotions.id, id));
  return Response.json({ ok: true });
}
