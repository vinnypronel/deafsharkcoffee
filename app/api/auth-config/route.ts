import { env } from "cloudflare:workers";
import { transactionalEmailConfigured } from "../../../lib/transactional-email";
import { ACCOUNTS_ENABLED } from "../../accounts";

export async function GET() {
  const emailEnabled = transactionalEmailConfigured();
  return Response.json({
    googleEnabled: Boolean(env.GOOGLE_CLIENT_ID?.trim() && env.GOOGLE_CLIENT_SECRET?.trim()),
    emailEnabled,
    emailVerificationEnabled: emailEnabled,
    passwordRecoveryEnabled: emailEnabled,
    loyaltyEnabled: env.LOYALTY_ENABLED === "true",
    signupEnabled: ACCOUNTS_ENABLED,
  });
}
