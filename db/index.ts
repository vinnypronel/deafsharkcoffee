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
          id integer PRIMARY KEY AUTOINCREMENT,
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
          fulfillment_type text DEFAULT 'asap' NOT NULL,
          scheduled_for integer,
          customer_user_id text,
          created_at integer NOT NULL
        )`),
        d1.prepare(`CREATE TABLE IF NOT EXISTS customer_profiles (
          user_id text PRIMARY KEY NOT NULL,
          email text NOT NULL,
          display_name text NOT NULL,
          points integer DEFAULT 0 NOT NULL,
          created_at integer NOT NULL,
          updated_at integer NOT NULL
        )`),
        d1.prepare(`CREATE TABLE IF NOT EXISTS store_settings (
          id integer PRIMARY KEY DEFAULT 1 NOT NULL,
          prep_time_minutes integer DEFAULT 15 NOT NULL,
          paused integer DEFAULT false NOT NULL,
          open_time text DEFAULT '06:00' NOT NULL,
          close_time text DEFAULT '20:00' NOT NULL,
          cutoff_minutes integer DEFAULT 30 NOT NULL,
          scheduling_enabled integer DEFAULT true NOT NULL,
          scheduling_horizon_minutes integer DEFAULT 240 NOT NULL,
          slot_minutes integer DEFAULT 15 NOT NULL,
          updated_at integer NOT NULL
        )`),
        d1.prepare(`CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
          id integer PRIMARY KEY AUTOINCREMENT,
          email text NOT NULL UNIQUE,
          status text DEFAULT 'pending' NOT NULL,
          consent_text text NOT NULL,
          consent_source text DEFAULT 'website_footer' NOT NULL,
          consented_at integer NOT NULL,
          updated_at integer NOT NULL
        )`),
        d1.prepare(`CREATE TABLE IF NOT EXISTS contact_inquiries (
          id integer PRIMARY KEY AUTOINCREMENT,
          name text NOT NULL,
          email text NOT NULL,
          phone text,
          topic text DEFAULT 'general' NOT NULL,
          message text NOT NULL,
          status text DEFAULT 'new' NOT NULL,
          created_at integer NOT NULL,
          updated_at integer NOT NULL
        )`),
        d1.prepare(`CREATE TABLE IF NOT EXISTS employment_applications (
          id integer PRIMARY KEY AUTOINCREMENT,
          full_name text NOT NULL,
          email text NOT NULL,
          phone text NOT NULL,
          position text NOT NULL,
          employment_type text NOT NULL,
          days_json text DEFAULT '[]' NOT NULL,
          shift text,
          start_date text,
          is_adult integer NOT NULL,
          experience text,
          why text,
          resume_key text,
          resume_name text,
          resume_type text,
          resume_size integer,
          status text DEFAULT 'new' NOT NULL,
          created_at integer NOT NULL,
          updated_at integer NOT NULL
        )`),
        d1.prepare(`INSERT OR IGNORE INTO store_settings (
          id, prep_time_minutes, paused, open_time, close_time, cutoff_minutes,
          scheduling_enabled, scheduling_horizon_minutes, slot_minutes, updated_at
        ) VALUES (1, 15, false, '06:00', '20:00', 30, true, 240, 15, unixepoch())`),
        d1.prepare("CREATE INDEX IF NOT EXISTS idx_orders_status_created_at ON orders (status, created_at)"),
        d1.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_newsletter_email_unique ON newsletter_subscriptions (email)"),
        d1.prepare("CREATE INDEX IF NOT EXISTS idx_contact_status_created_at ON contact_inquiries (status, created_at)"),
        d1.prepare("CREATE INDEX IF NOT EXISTS idx_employment_status_created_at ON employment_applications (status, created_at)"),
      ]);

      try {
        await d1.prepare("ALTER TABLE orders ADD COLUMN customer_user_id text").run();
      } catch {
        // column already exists
      }

      try {
        await d1.prepare("ALTER TABLE orders ADD COLUMN fulfillment_type text DEFAULT 'asap' NOT NULL").run();
      } catch {
        // column already exists
      }

      try {
        await d1.prepare("ALTER TABLE orders ADD COLUMN scheduled_for integer").run();
      } catch {
        // column already exists
      }

      await d1.prepare("PRAGMA optimize").run();
    })();
  }
  return schemaReady;
}
