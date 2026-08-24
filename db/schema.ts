import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const sessions = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    token: text("token").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("session_token_unique").on(table.token),
    index("idx_session_user_id").on(table.userId),
  ],
);

export const accounts = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    issuer: text("issuer").notNull().default(""),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp" }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp" }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("idx_account_user_id").on(table.userId),
    uniqueIndex("idx_account_issuer_account_id").on(table.issuer, table.accountId),
  ],
);

export const verifications = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [index("idx_verification_identifier").on(table.identifier)],
);

export const rateLimits = sqliteTable("rateLimit", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: integer("last_request").notNull(),
});

export const orders = sqliteTable(
  "orders",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    orderNumber: text("order_number").notNull().unique(),
    customerName: text("customer_name").notNull(),
    phone: text("phone").notNull(),
    itemsJson: text("items_json").notNull(),
    subtotalCents: integer("subtotal_cents").notNull(),
    taxCents: integer("tax_cents").notNull(),
    totalCents: integer("total_cents").notNull(),
    status: text("status").notNull().default("new"),
    coffeeStatus: text("coffee_status").notNull().default("not_needed"),
    kitchenStatus: text("kitchen_status").notNull().default("not_needed"),
    source: text("source").notNull().default("website"),
    paymentMethod: text("payment_method").notNull().default("pickup"),
    pickupEta: text("pickup_eta").notNull().default("15 min"),
    fulfillmentType: text("fulfillment_type").notNull().default("asap"),
    scheduledFor: integer("scheduled_for", { mode: "timestamp" }),
    customerUserId: text("customer_user_id"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("idx_orders_status_created_at").on(table.status, table.createdAt),
  ],
);

export const customerProfiles = sqliteTable("customer_profiles", {
  userId: text("user_id").primaryKey(),
  email: text("email").notNull(),
  displayName: text("display_name").notNull(),
  phone: text("phone"),
  points: integer("points").notNull().default(0),
  lifetimePoints: integer("lifetime_points").notNull().default(0),
  birthdayMonth: integer("birthday_month"),
  birthdayDay: integer("birthday_day"),
  signupBonusAwarded: integer("signup_bonus_awarded", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const loyaltyTransactions = sqliteTable(
  "loyalty_transactions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id").notNull(),
    orderId: integer("order_id"),
    reference: text("reference"),
    pointsChange: integer("points_change").notNull(),
    balanceAfter: integer("balance_after").notNull(),
    reason: text("reason").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  },
  (table) => [
    index("idx_loyalty_user_created_at").on(table.userId, table.createdAt),
    uniqueIndex("idx_loyalty_order_unique").on(table.orderId),
    uniqueIndex("idx_loyalty_reference_unique").on(table.reference),
  ],
);

export const memberOffers = sqliteTable(
  "member_offers",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id").notNull(),
    offerType: text("offer_type").notNull(),
    code: text("code").notNull(),
    status: text("status").notNull().default("active"),
    issuedAt: integer("issued_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    redeemedAt: integer("redeemed_at", { mode: "timestamp" }),
    redeemedBy: text("redeemed_by"),
  },
  (table) => [
    uniqueIndex("idx_member_offer_user_type_unique").on(table.userId, table.offerType),
    uniqueIndex("idx_member_offer_code_unique").on(table.code),
    index("idx_member_offer_status_issued_at").on(table.status, table.issuedAt),
  ],
);

export const menuAvailability = sqliteTable("menu_availability", {
  productId: text("product_id").primaryKey(),
  available: integer("available", { mode: "boolean" }).notNull().default(true),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const storeSettings = sqliteTable("store_settings", {
  id: integer("id").primaryKey().default(1),
  prepTimeMinutes: integer("prep_time_minutes").notNull().default(15),
  paused: integer("paused", { mode: "boolean" }).notNull().default(false),
  openTime: text("open_time").notNull().default("06:00"),
  closeTime: text("close_time").notNull().default("20:00"),
  cutoffMinutes: integer("cutoff_minutes").notNull().default(30),
  schedulingEnabled: integer("scheduling_enabled", { mode: "boolean" }).notNull().default(true),
  schedulingHorizonMinutes: integer("scheduling_horizon_minutes").notNull().default(240),
  slotMinutes: integer("slot_minutes").notNull().default(15),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const newsletterSubscriptions = sqliteTable(
  "newsletter_subscriptions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    email: text("email").notNull(),
    status: text("status").notNull().default("pending"),
    consentText: text("consent_text").notNull(),
    consentSource: text("consent_source").notNull().default("website_footer"),
    consentedAt: integer("consented_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  },
  (table) => [uniqueIndex("idx_newsletter_email_unique").on(table.email)],
);

export const contactInquiries = sqliteTable(
  "contact_inquiries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    topic: text("topic").notNull().default("general"),
    message: text("message").notNull(),
    status: text("status").notNull().default("new"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  },
  (table) => [index("idx_contact_status_created_at").on(table.status, table.createdAt)],
);

export const employmentApplications = sqliteTable(
  "employment_applications",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    fullName: text("full_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    position: text("position").notNull(),
    employmentType: text("employment_type").notNull(),
    daysJson: text("days_json").notNull().default("[]"),
    shift: text("shift"),
    startDate: text("start_date"),
    isAdult: integer("is_adult", { mode: "boolean" }).notNull(),
    experience: text("experience"),
    why: text("why"),
    resumeKey: text("resume_key"),
    resumeName: text("resume_name"),
    resumeType: text("resume_type"),
    resumeSize: integer("resume_size"),
    status: text("status").notNull().default("new"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  },
  (table) => [index("idx_employment_status_created_at").on(table.status, table.createdAt)],
);

export const featuredContent = sqliteTable("featured_content", {
  slot: integer("slot").primaryKey(),
  productId: text("product_id").notNull(),
  categoryLabel: text("category_label").notNull(),
  title: text("title").notNull(),
  buttonLabel: text("button_label").notNull().default("Add to cart"),
  priceCents: integer("price_cents").notNull(),
  mediaUrl: text("media_url").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const events = sqliteTable(
  "events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    dateLabel: text("date_label").notNull(),
    timeLabel: text("time_label").notNull(),
    location: text("location").notNull(),
    entryLabel: text("entry_label").notNull(),
    details: text("details").notNull(),
    buttonLabel: text("button_label").notNull().default("Learn more"),
    buttonHref: text("button_href").notNull().default("/contact"),
    imageLeftUrl: text("image_left_url").notNull(),
    imageRightUrl: text("image_right_url").notNull(),
    imageCaption: text("image_caption"),
    published: integer("published", { mode: "boolean" }).notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  },
  (table) => [index("idx_events_published_sort").on(table.published, table.sortOrder)],
);
