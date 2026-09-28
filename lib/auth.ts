import { env } from "cloudflare:workers";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { getDb } from "../db";
import * as schema from "../db/schema";
import { sendPasswordResetEmail, sendVerificationEmail, transactionalEmailConfigured } from "./transactional-email";
import { ACCOUNTS_ENABLED } from "../app/accounts";
import { issueWelcomeOffer } from "./welcome-offer";

function createAuth() {
  const googleClientId = env.GOOGLE_CLIENT_ID?.trim();
  const googleClientSecret = env.GOOGLE_CLIENT_SECRET?.trim();
  const emailEnabled = transactionalEmailConfigured();

  return betterAuth({
    appName: "Deaf Shark Coffee",
    baseURL: env.BETTER_AUTH_URL?.trim() || undefined,
    secret: env.BETTER_AUTH_SECRET?.trim() || undefined,
    database: drizzleAdapter(getDb(), {
      provider: "sqlite",
      schema: {
        user: schema.users,
        session: schema.sessions,
        account: schema.accounts,
        verification: schema.verifications,
        rateLimit: schema.rateLimits,
      },
    }),
    emailAndPassword: {
      enabled: emailEnabled,
      /* Sign-in stays open; only new-account creation follows the master switch,
         so existing customers and staff can still reach their accounts while
         public sign-up is closed before launch. */
      disableSignUp: !ACCOUNTS_ENABLED,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      requireEmailVerification: true,
      sendResetPassword: async ({ user, url }) => sendPasswordResetEmail(user.email, url),
      revokeSessionsOnPasswordReset: true,
    },
    emailVerification: {
      sendVerificationEmail: async ({ user, url }) => sendVerificationEmail(user.email, url),
      /* Off because sign-up fires this as a background task, so a failed send
         could not be reported and the customer was told to check an inbox that
         would never receive anything. POST /api/profile/signup sends it itself
         and awaits the result, so a mail outage is surfaced instead of hidden. */
      sendOnSignUp: false,
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
      expiresIn: 60 * 60,
    },
    socialProviders: googleClientId && googleClientSecret
      ? { google: { clientId: googleClientId, clientSecret: googleClientSecret } }
      : {},
    /* Every new account gets its sign-up coupon the moment it is created,
       whichever way it signed up. A failure here must never block sign-up;
       the account page issues it again on the next visit. */
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            try {
              await issueWelcomeOffer(user.id);
            } catch {
              console.error(JSON.stringify({ event: "welcome_offer_issue_failed" }));
            }
          },
        },
      },
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 100,
      storage: "database",
    },
    advanced: {
      ipAddress: {
        ipAddressHeaders: ["cf-connecting-ip"],
      },
    },
  });
}

let authInstance: ReturnType<typeof createAuth> | undefined;

export function getAuth() {
  authInstance ??= createAuth();
  return authInstance;
}

export async function getCustomerSession(request: Request) {
  return getAuth().api.getSession({ headers: request.headers });
}
