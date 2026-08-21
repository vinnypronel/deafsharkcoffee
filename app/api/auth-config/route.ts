import { env } from "cloudflare:workers";

export async function GET() {
  return Response.json({
    googleEnabled: Boolean(env.GOOGLE_CLIENT_ID?.trim() && env.GOOGLE_CLIENT_SECRET?.trim()),
    emailEnabled: true,
    emailVerificationEnabled: false,
  });
}
