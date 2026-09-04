import { env } from "cloudflare:workers";

export async function GET() {
  const siteKey = env.TURNSTILE_SITE_KEY?.trim() ?? "";
  return Response.json(
    { siteKey, configured: Boolean(siteKey) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
