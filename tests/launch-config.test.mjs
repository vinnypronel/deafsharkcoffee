import assert from "node:assert/strict";
import test from "node:test";
import { validateLaunchConfig } from "../scripts/check-launch-config.mjs";

const valid = {
  BETTER_AUTH_SECRET: "a-secure-random-value-with-at-least-32-characters",
  BETTER_AUTH_URL: "https://deafsharkcoffee.com",
  NEXT_PUBLIC_SITE_URL: "https://deafsharkcoffee.com",
  NEXT_PUBLIC_ORDERING_URL: "https://orders.example.com/deaf-shark",
  NEXT_PUBLIC_ORDERING_ENABLED: "false",
  STAFF_EMAILS: "manager@deafsharkcoffee.com",
  CONTACT_EMAILS: "contact@deafsharkcoffee.com",
  EMPLOYMENT_EMAILS: "employment@deafsharkcoffee.com",
  ADMIN_EMAILS: "admin@deafsharkcoffee.com",
  SUPPORT_EMAIL: "help@deafsharkcoffee.com",
  TURNSTILE_SITE_KEY: "site-key",
  TURNSTILE_SECRET_KEY: "secret-key",
  TURNSTILE_HOSTNAMES: "deafsharkcoffee.com,www.deafsharkcoffee.com",
  RESEND_API_KEY: "re_test_key",
  AUTH_EMAIL_FROM: "Deaf Shark Coffee <account@deafsharkcoffee.com>",
  CLOUDFLARE_EMAIL_ENABLED: "false",
  CF_WORKER_NAME: "deaf-shark-coffee-production",
  CF_D1_DATABASE_ID: "11111111-2222-3333-4444-555555555555",
  CF_R2_BUCKET_NAME: "deaf-shark-uploads",
};

test("accepts a complete production launch configuration", () => {
  assert.deepEqual(validateLaunchConfig(valid).errors, []);
});

test("reports that website ordering is closed", () => {
  const result = validateLaunchConfig({ ...valid, NEXT_PUBLIC_ORDERING_URL: "" });
  assert.deepEqual(result.errors, []);
  assert.ok(result.warnings.some((warning) => warning.includes("Website checkout is closed")));
});

test("first-party ordering does not require a hosted provider URL", () => {
  const result = validateLaunchConfig({ ...valid, NEXT_PUBLIC_ORDERING_URL: "", NEXT_PUBLIC_ORDERING_ENABLED: "true" });
  assert.deepEqual(result.errors, []);
});

test("rejects public Turnstile test keys for launch", () => {
  const result = validateLaunchConfig({ ...valid, TURNSTILE_SITE_KEY: "1x00000000000000000000AA" });
  assert.ok(result.errors.some((error) => error.includes("test credentials")));
});

test("accepts Cloudflare Email Service without a Resend key", () => {
  const result = validateLaunchConfig({ ...valid, RESEND_API_KEY: "", CLOUDFLARE_EMAIL_ENABLED: "true" });
  assert.deepEqual(result.errors, []);
});

test("rejects local URLs, weak secrets, and mismatched Turnstile hostnames", () => {
  const result = validateLaunchConfig({
    ...valid,
    BETTER_AUTH_SECRET: "short",
    BETTER_AUTH_URL: "http://localhost:3000",
    NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
    TURNSTILE_HOSTNAMES: "localhost",
  });
  assert.ok(result.errors.length >= 4);
});

test("requires at least one verified staff sign-in method", () => {
  const result = validateLaunchConfig({ ...valid, RESEND_API_KEY: "", AUTH_EMAIL_FROM: "" });
  assert.ok(result.errors.some((error) => error.includes("verified sign-in method")));
});

test("deployment checks require explicit Cloudflare resource identifiers", () => {
  const result = validateLaunchConfig({ ...valid, CF_D1_DATABASE_ID: "" }, { target: "production" });
  assert.ok(result.errors.some((error) => error.includes("D1 database UUID")));
});

test("accepts a complete target-specific deployment configuration", () => {
  assert.deepEqual(validateLaunchConfig(valid, { target: "production" }).errors, []);
});
