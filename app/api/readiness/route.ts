import { ensureSchema } from "../../../db";

export async function GET() {
  try {
    await ensureSchema();
    return Response.json(
      { status: "ready", checks: { database: "ok" } },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const requestId = crypto.randomUUID();
    console.error(JSON.stringify({
      service: "deaf-shark-coffee",
      event: "readiness_failed",
      requestId,
      errorType: error instanceof Error ? error.name : "UnknownError",
    }));
    return Response.json(
      { status: "not_ready", requestId },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
