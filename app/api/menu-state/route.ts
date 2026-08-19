import { desc } from "drizzle-orm";
import { ensureSchema, getDb } from "../../../db";
import { menuAvailability } from "../../../db/schema";

let globalShopState = {
  prepTime: 15,
  paused: false,
};

export async function GET() {
  try {
    await ensureSchema();
    const items = await getDb()
      .select()
      .from(menuAvailability)
      .orderBy(desc(menuAvailability.updatedAt));
    return Response.json({
      availability: Object.fromEntries(items.map((item) => [item.productId, item.available])),
      prepTime: globalShopState.prepTime,
      paused: globalShopState.paused,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load menu state";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    await ensureSchema();
    const payload = (await request.json()) as {
      productId?: string;
      available?: boolean;
      prepTime?: number;
      paused?: boolean;
    };

    if (typeof payload.prepTime === "number") {
      globalShopState.prepTime = Math.max(5, payload.prepTime);
    }

    if (typeof payload.paused === "boolean") {
      globalShopState.paused = payload.paused;
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

    return Response.json({
      success: true,
      prepTime: globalShopState.prepTime,
      paused: globalShopState.paused,
      productId: payload.productId,
      available: payload.available,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update menu state";
    return Response.json({ error: message }, { status: 500 });
  }
}
