import { asc, eq } from "drizzle-orm";
import { ensureSchema, getDb } from "../../../../db";
import { events, featuredContent, menuContent } from "../../../../db/schema";
import { requireStaff } from "../../../../lib/staff-auth";
import { menuProducts } from "../../../menu-data";

const text = (value: unknown, max = 500) => typeof value === "string" ? value.trim().slice(0, max) : "";
const safeHref = (value: unknown) => {
  const href = text(value, 500);
  return href.startsWith("/") || href.startsWith("https://") || href.startsWith("tel:") ? href : "/contact";
};
const safeMedia = (value: unknown, fallback: string) => {
  const url = text(value, 1000);
  return url.startsWith("/") || url.startsWith("https://") ? url : fallback;
};

export async function GET(request: Request) {
  const staff = await requireStaff(request);
  if (staff.response) return staff.response;
  await ensureSchema();
  const [featured, allEvents, menu] = await Promise.all([
    getDb().select().from(featuredContent).orderBy(asc(featuredContent.slot)),
    getDb().select().from(events).orderBy(asc(events.sortOrder), asc(events.id)),
    getDb().select().from(menuContent).orderBy(asc(menuContent.productId)),
  ]);
  return Response.json({ featured, events: allEvents, menu });
}

export async function PATCH(request: Request) {
  const staff = await requireStaff(request);
  if (staff.response) return staff.response;
  await ensureSchema();
  const payload = await request.json() as Record<string, unknown>;
  const kind = text(payload.kind, 20);

  if (kind === "featured") {
    const slot = Number(payload.slot);
    const productId = text(payload.productId, 100);
    const product = menuProducts.find((item) => item.id === productId);
    if (!Number.isInteger(slot) || slot < 1 || slot > 6 || !product) {
      return Response.json({ error: "Choose a valid featured slot and menu item." }, { status: 400 });
    }
    const values = {
      slot,
      productId,
      categoryLabel: text(payload.categoryLabel, 80) || product.category,
      title: text(payload.title, 120) || product.name,
      buttonLabel: text(payload.buttonLabel, 80) || "Add to cart",
      priceCents: Math.max(0, Math.round(Number(payload.priceCents) || product.price * 100)),
      mediaUrl: safeMedia(payload.mediaUrl, product.video || product.photo || "/chicken-pesto-centered.jpg"),
      updatedAt: new Date(),
    };
    await getDb().insert(featuredContent).values(values).onConflictDoUpdate({ target: featuredContent.slot, set: values });
    return Response.json({ success: true });
  }

  if (kind === "menu") {
    const productId = text(payload.productId, 100);
    const product = menuProducts.find((item) => item.id === productId);
    if (!product) return Response.json({ error: "Choose a valid menu item." }, { status: 400 });
    const categories = ["Coffee", "Non-Coffee", "Breakfast", "Sandwiches", "Bites", "Cold Drinks", "Coffee Beans"];
    const category = text(payload.category, 40);
    const values = {
      productId,
      name: text(payload.name, 120) || product.name,
      category: categories.includes(category) ? category : product.category,
      description: text(payload.description, 500) || product.description,
      priceCents: Math.max(0, Math.min(100000, Math.round(Number(payload.priceCents) || product.price * 100))),
      photoUrl: safeMedia(payload.photoUrl, product.photo || "") || null,
      updatedAt: new Date(),
    };
    await getDb().insert(menuContent).values(values).onConflictDoUpdate({ target: menuContent.productId, set: values });
    return Response.json({ success: true, menu: values });
  }

  if (kind === "event") {
    const id = Number(payload.id);
    const values = {
      title: text(payload.title, 120),
      description: text(payload.description, 1500),
      dateLabel: text(payload.dateLabel, 100),
      timeLabel: text(payload.timeLabel, 100),
      location: text(payload.location, 180),
      entryLabel: text(payload.entryLabel, 100),
      details: text(payload.details, 500),
      buttonLabel: text(payload.buttonLabel, 100) || "Learn more",
      buttonHref: safeHref(payload.buttonHref),
      imageLeftUrl: safeMedia(payload.imageLeftUrl, "/events/puppy-mango.jpg"),
      imageRightUrl: safeMedia(payload.imageRightUrl, "/events/puppy-party-flyer.jpg"),
      imageCaption: text(payload.imageCaption, 160) || null,
      published: payload.published !== false,
      sortOrder: Math.max(0, Math.round(Number(payload.sortOrder) || 0)),
      updatedAt: new Date(),
    };
    if (!values.title || !values.description || !values.dateLabel || !values.timeLabel) {
      return Response.json({ error: "Event title, description, date, and time are required." }, { status: 400 });
    }
    if (Number.isInteger(id) && id > 0) {
      await getDb().update(events).set(values).where(eq(events.id, id));
      return Response.json({ success: true, id });
    }
    const [created] = await getDb().insert(events).values({ ...values, createdAt: new Date() }).returning({ id: events.id });
    return Response.json({ success: true, id: created.id }, { status: 201 });
  }

  return Response.json({ error: "Unsupported content type." }, { status: 400 });
}

export async function DELETE(request: Request) {
  const staff = await requireStaff(request);
  if (staff.response) return staff.response;
  await ensureSchema();
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id < 1) return Response.json({ error: "Invalid event." }, { status: 400 });
  await getDb().delete(events).where(eq(events.id, id));
  return Response.json({ success: true });
}
