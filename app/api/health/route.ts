export async function GET() {
  return Response.json(
    { status: "ok", service: "deaf-shark-coffee" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
