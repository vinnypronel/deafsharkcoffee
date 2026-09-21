import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

const REQUIRED_TABLES = [
  "account",
  "contact_inquiries",
  "customer_profiles",
  "employment_applications",
  "events",
  "featured_content",
  "loyalty_transactions",
  "member_offers",
  "menu_availability",
  "menu_content",
  "newsletter_subscriptions",
  "order_notifications",
  "orders",
  "promotions",
  "rateLimit",
  "session",
  "store_settings",
  "user",
  "verification",
] as const;

export function getDb() {
  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Configure the binding before using a database-backed feature.",
    );
  }

  return drizzle(env.DB, { schema });
}

/**
 * Verify that deployment migrations have been applied without changing the
 * database. Schema changes belong in ./drizzle and must run before the Worker
 * version that depends on them is deployed.
 */
/* The table set never changes between deploys, so the check only needs to run
   once per Worker isolate. Caching the successful result removes a SELECT from
   every DB-backed request, which otherwise doubled read load under any flood. A
   failure is not cached, so a genuinely missing migration keeps surfacing. */
let schemaVerified = false;

export async function ensureSchema(): Promise<void> {
  if (schemaVerified) return;
  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Configure the binding before using a database-backed feature.",
    );
  }

  const placeholders = REQUIRED_TABLES.map(() => "?").join(", ");
  const result = await env.DB
    .prepare(`SELECT name FROM sqlite_schema WHERE type = 'table' AND name IN (${placeholders})`)
    .bind(...REQUIRED_TABLES)
    .all<{ name: string }>();
  const existing = new Set(result.results.map((row) => row.name));
  const missing = REQUIRED_TABLES.filter((table) => !existing.has(table));

  if (missing.length > 0) {
    throw new Error(
      `Database migrations are required. Missing tables: ${missing.join(", ")}. Apply the D1 migrations before starting this version.`,
    );
  }

  schemaVerified = true;
}
