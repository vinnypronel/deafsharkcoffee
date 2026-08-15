import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
    source: text("source").notNull().default("website"),
    paymentMethod: text("payment_method").notNull().default("pickup"),
    pickupEta: text("pickup_eta").notNull().default("15 min"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("idx_orders_status_created_at").on(table.status, table.createdAt),
  ],
);

export const menuAvailability = sqliteTable("menu_availability", {
  productId: text("product_id").primaryKey(),
  available: integer("available", { mode: "boolean" }).notNull().default(true),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

