/* Secrets and vars the Worker reads at runtime.
   `wrangler types` only generates the bindings declared in wrangler.json, so the
   values set with `wrangler secret put` (and their local .env equivalents) are
   declared here and merged into the generated Env interfaces.
   All optional: the app is expected to run with any of them unset, which is what
   drives the "setup pending" states in the UI. */
interface DeafSharkRuntimeSecrets {
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  STAFF_EMAILS?: string;
  TURNSTILE_SECRET_KEY?: string;
  RESEND_API_KEY?: string;
  AUTH_EMAIL_FROM?: string;
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
