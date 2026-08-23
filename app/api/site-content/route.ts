import { asc, eq } from "drizzle-orm";
import { ensureSchema, getDb } from "../../../db";
import { events, featuredContent } from "../../../db/schema";

export async function GET() {
  try {
    await ensureSchema();
    const [featured, upcoming] = await Promise.all([
      getDb().select().from(featuredContent).orderBy(asc(featuredContent.slot)),
      getDb().select().from(events).where(eq(events.published, true)).orderBy(asc(events.sortOrder), asc(events.id)),
    ]);
    return Response.json({ featured, events: upcoming });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to load site content" }, { status: 500 });
  }
}
