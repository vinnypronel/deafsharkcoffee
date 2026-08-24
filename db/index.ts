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
        d1.prepare(`CREATE TABLE IF NOT EXISTS menu_content (
          product_id text PRIMARY KEY NOT NULL,
          name text NOT NULL,
          category text NOT NULL,
          description text NOT NULL,
          price_cents integer NOT NULL,
          photo_url text,
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
          coffee_status text DEFAULT 'not_needed' NOT NULL,
          kitchen_status text DEFAULT 'not_needed' NOT NULL,
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
          phone text,
          points integer DEFAULT 0 NOT NULL,
          lifetime_points integer DEFAULT 0 NOT NULL,
          birthday_month integer,
          birthday_day integer,
          signup_bonus_awarded integer DEFAULT false NOT NULL,
          created_at integer NOT NULL,
          updated_at integer NOT NULL
        )`),
        d1.prepare(`CREATE TABLE IF NOT EXISTS loyalty_transactions (
          id integer PRIMARY KEY AUTOINCREMENT,
          user_id text NOT NULL,
          order_id integer,
          reference text,
          points_change integer NOT NULL,
          balance_after integer NOT NULL,
          reason text NOT NULL,
          created_at integer NOT NULL
        )`),
        d1.prepare(`CREATE TABLE IF NOT EXISTS member_offers (
          id integer PRIMARY KEY AUTOINCREMENT,
          user_id text NOT NULL,
          offer_type text NOT NULL,
          code text NOT NULL,
          status text DEFAULT 'active' NOT NULL,
          issued_at integer NOT NULL,
          redeemed_at integer,
          redeemed_by text
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
        d1.prepare(`CREATE TABLE IF NOT EXISTS featured_content (
          slot integer PRIMARY KEY NOT NULL,
          product_id text NOT NULL,
          category_label text NOT NULL,
          title text NOT NULL,
          button_label text DEFAULT 'Add to cart' NOT NULL,
          price_cents integer NOT NULL,
          media_url text NOT NULL,
          updated_at integer NOT NULL
        )`),
        d1.prepare(`CREATE TABLE IF NOT EXISTS events (
          id integer PRIMARY KEY AUTOINCREMENT,
          title text NOT NULL,
          description text NOT NULL,
          date_label text NOT NULL,
          time_label text NOT NULL,
          location text NOT NULL,
          entry_label text NOT NULL,
          details text NOT NULL,
          button_label text DEFAULT 'Learn more' NOT NULL,
          button_href text DEFAULT '/contact' NOT NULL,
          image_left_url text NOT NULL,
          image_right_url text NOT NULL,
          image_caption text,
          published integer DEFAULT true NOT NULL,
          sort_order integer DEFAULT 0 NOT NULL,
          created_at integer NOT NULL,
          updated_at integer NOT NULL
        )`),
        d1.prepare(`INSERT OR IGNORE INTO store_settings (
          id, prep_time_minutes, paused, open_time, close_time, cutoff_minutes,
          scheduling_enabled, scheduling_horizon_minutes, slot_minutes, updated_at
        ) VALUES (1, 15, false, '06:00', '20:00', 30, true, 240, 15, unixepoch())`),
        d1.prepare("CREATE INDEX IF NOT EXISTS idx_orders_status_created_at ON orders (status, created_at)"),
        d1.prepare("CREATE INDEX IF NOT EXISTS idx_loyalty_user_created_at ON loyalty_transactions (user_id, created_at)"),
        d1.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_loyalty_order_unique ON loyalty_transactions (order_id)"),
        d1.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_member_offer_user_type_unique ON member_offers (user_id, offer_type)"),
        d1.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_member_offer_code_unique ON member_offers (code)"),
        d1.prepare("CREATE INDEX IF NOT EXISTS idx_member_offer_status_issued_at ON member_offers (status, issued_at)"),
        d1.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_newsletter_email_unique ON newsletter_subscriptions (email)"),
        d1.prepare("CREATE INDEX IF NOT EXISTS idx_contact_status_created_at ON contact_inquiries (status, created_at)"),
        d1.prepare("CREATE INDEX IF NOT EXISTS idx_employment_status_created_at ON employment_applications (status, created_at)"),
        d1.prepare("CREATE INDEX IF NOT EXISTS idx_events_published_sort ON events (published, sort_order)"),
      ]);

      await d1.batch([
        d1.prepare(`INSERT OR IGNORE INTO featured_content (slot, product_id, category_label, title, button_label, price_cents, media_url, updated_at) VALUES (1, 'strawberry-matcha', 'Non-Coffee', 'Strawberry Matcha', 'Add to cart', 775, '/featured-strawberry-matcha.mp4', unixepoch())`),
        d1.prepare(`INSERT OR IGNORE INTO featured_content (slot, product_id, category_label, title, button_label, price_cents, media_url, updated_at) VALUES (2, 'ocean-blend-bag', 'Coffee Beans', 'Ocean Blend', 'Add to cart', 1900, '/featured-ocean-blend.mp4', unixepoch())`),
        d1.prepare(`INSERT OR IGNORE INTO featured_content (slot, product_id, category_label, title, button_label, price_cents, media_url, updated_at) VALUES (3, 'chicken-pesto', 'Sandwiches', 'Chicken Pesto', 'Add to cart', 775, '/featured-chicken-pesto.mp4', unixepoch())`),
        d1.prepare(`INSERT INTO events (title, description, date_label, time_label, location, entry_label, details, button_label, button_href, image_left_url, image_right_url, image_caption, published, sort_order, created_at, updated_at)
          SELECT 'Puppy Party', 'An evening for the neighborhood and their dogs, hosted by Mango the Doxy. Free entry, a menu made for dogs, raffles and prizes through the night. BYOB.', 'Friday, August 21, 2026', '6:00 to 9:00 PM', '900 Green Lane, Union NJ 07083', 'Free entry', 'BYOB, puppies, dog menu, raffles, prizes', 'RSVP for Puppy Party · FREE', '/contact', '/events/puppy-mango.jpg', '/events/puppy-party-flyer.jpg', 'Mango the Doxy, your host.', true, 0, unixepoch(), unixepoch()
          WHERE NOT EXISTS (SELECT 1 FROM events)`),
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

      try {
        await d1.prepare("ALTER TABLE orders ADD COLUMN coffee_status text DEFAULT 'not_needed' NOT NULL").run();
      } catch {
        // column already exists
      }

      try {
        await d1.prepare("ALTER TABLE orders ADD COLUMN kitchen_status text DEFAULT 'not_needed' NOT NULL").run();
      } catch {
        // column already exists
      }

      for (const statement of [
        "ALTER TABLE customer_profiles ADD COLUMN phone text",
        "ALTER TABLE customer_profiles ADD COLUMN lifetime_points integer DEFAULT 0 NOT NULL",
        "ALTER TABLE customer_profiles ADD COLUMN birthday_month integer",
        "ALTER TABLE customer_profiles ADD COLUMN birthday_day integer",
        "ALTER TABLE customer_profiles ADD COLUMN signup_bonus_awarded integer DEFAULT false NOT NULL",
        "ALTER TABLE loyalty_transactions ADD COLUMN reference text",
      ]) {
        try {
          await d1.prepare(statement).run();
        } catch {
          // column already exists
        }
      }

      await d1.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_loyalty_reference_unique ON loyalty_transactions (reference)").run();

      await d1.prepare("PRAGMA optimize").run();
    })();
  }
  return schemaReady;
}
