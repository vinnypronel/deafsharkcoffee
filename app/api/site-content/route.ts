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
    console.error(JSON.stringify({ event: "site_content_failed", errorType: error instanceof Error ? error.name : "UnknownError" }));
    return Response.json({ error: "Unable to load site content right now." }, { status: 500 });
  }
}
