import { env } from "cloudflare:workers";
import { transactionalEmailConfigured } from "../../../lib/transactional-email";

export async function GET() {
  const emailEnabled = transactionalEmailConfigured();
  return Response.json({
    googleEnabled: Boolean(env.GOOGLE_CLIENT_ID?.trim() && env.GOOGLE_CLIENT_SECRET?.trim()),
    emailEnabled,
    emailVerificationEnabled: emailEnabled,
    passwordRecoveryEnabled: emailEnabled,
  });
}
