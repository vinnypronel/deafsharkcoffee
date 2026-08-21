import { env } from "cloudflare:workers";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { getDb } from "../db";
import * as schema from "../db/schema";

let authInstance: ReturnType<typeof betterAuth> | undefined;

export function getAuth() {
  if (authInstance) return authInstance;

  const googleClientId = env.GOOGLE_CLIENT_ID?.trim();
  const googleClientSecret = env.GOOGLE_CLIENT_SECRET?.trim();

  authInstance = betterAuth({
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
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      requireEmailVerification: false,
    },
    socialProviders: googleClientId && googleClientSecret
      ? { google: { clientId: googleClientId, clientSecret: googleClientSecret } }
      : {},
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

  return authInstance;
}

export async function getCustomerSession(request: Request) {
  return getAuth().api.getSession({ headers: request.headers });
}
