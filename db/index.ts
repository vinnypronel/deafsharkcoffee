import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function getDb() {
  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database."
    );
  }

  return drizzle(env.DB, { schema });
}

let schemaReady: Promise<void> | undefined;

export function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const d1 = env.DB;
      await d1.batch([
        d1.prepare(`CREATE TABLE IF NOT EXISTS menu_availability (
          product_id text PRIMARY KEY NOT NULL,
          available integer DEFAULT true NOT NULL,
          updated_at integer NOT NULL
        )`),
        d1.prepare(`CREATE TABLE IF NOT EXISTS orders (
          id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
          order_number text NOT NULL UNIQUE,
          customer_name text NOT NULL,
          phone text NOT NULL,
          items_json text NOT NULL,
          subtotal_cents integer NOT NULL,
          tax_cents integer NOT NULL,
          total_cents integer NOT NULL,
          status text DEFAULT 'new' NOT NULL,
          source text DEFAULT 'website' NOT NULL,
          payment_method text DEFAULT 'pickup' NOT NULL,
          pickup_eta text DEFAULT '15 min' NOT NULL,
          created_at integer NOT NULL
        )`),
        d1.prepare("CREATE INDEX IF NOT EXISTS idx_orders_status_created_at ON orders (status, created_at)"),
      ]);
      await d1.prepare("PRAGMA optimize").run();
    })();
  }
  return schemaReady;
}
