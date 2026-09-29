import { env } from "cloudflare:workers";

/* Menu items staff deleted from the dashboard. `menu_content.removed`
   (migration 0023) is read with raw SQL like the pause timer, so a database
   that has not been migrated yet keeps serving the full menu. */

export class MenuRemovalMigrationError extends Error {
  constructor() {
    super("Deleting menu items needs database migration 0023. Apply the D1 migrations, then try again.");
    this.name = "MenuRemovalMigrationError";
  }
}

export async function readRemovedMenuIds(): Promise<string[]> {
  try {
    const rows = await env.DB.prepare("SELECT product_id FROM menu_content WHERE removed = 1").all<{ product_id: string }>();
    return rows.results.map((row) => row.product_id);
  } catch {
    return [];
  }
}

/** Marks an item deleted or restores it. The row is created from the base
    menu data when staff have never edited the item. */
export async function writeMenuItemRemoved(
  product: { id: string; name: string; category: string; description: string; price: number; photo?: string },
  removed: boolean,
) {
  try {
    await env.DB.prepare(
      `INSERT INTO menu_content (product_id, name, category, description, price_cents, photo_url, updated_at, removed)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(product_id) DO UPDATE SET removed = excluded.removed, updated_at = excluded.updated_at`,
    ).bind(
      product.id,
      product.name,
      product.category,
      product.description,
      Math.round(product.price * 100),
      product.photo ?? null,
      Math.floor(Date.now() / 1000),
      removed ? 1 : 0,
    ).run();
  } catch (error) {
    if (error instanceof Error && /no such column|no column named/i.test(error.message)) throw new MenuRemovalMigrationError();
    throw error;
  }
}
