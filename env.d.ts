/* Secrets and vars the Worker reads at runtime.
   `wrangler types` only generates the bindings declared in wrangler.json, so the
   values set with `wrangler secret put` (and their local .env equivalents) are
   declared here and merged into the generated Env interfaces.
   Hosted launch configuration is validated separately. Optional integrations
   remain unavailable when their complete credential group is absent. */
interface DeafSharkRuntimeSecrets {
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  STAFF_EMAILS?: string;
  CONTACT_EMAILS?: string;
  EMPLOYMENT_EMAILS?: string;
  ADMIN_EMAILS?: string;
  SUPPORT_EMAIL?: string;
  TURNSTILE_SITE_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
  TURNSTILE_HOSTNAMES?: string;
  RESEND_API_KEY?: string;
  AUTH_EMAIL_FROM?: string;
  CLOUDFLARE_EMAIL_ENABLED?: string;
  EMAIL?: SendEmail;
  /* Order-ready text messages. See lib/sms.ts. */
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_FROM_NUMBER?: string;
}

/* `env` imported from "cloudflare:workers" resolves to Cloudflare.Env. */
declare namespace Cloudflare {
  interface Env extends DeafSharkRuntimeSecrets {}
}

/* The bare global Env is what handler signatures use. */
interface Env extends DeafSharkRuntimeSecrets {}
