const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function publicHttpsUrl(value, label, errors) {
  if (!value) {
    errors.push(`${label} is required.`);
    return null;
  }
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:") errors.push(`${label} must use HTTPS.`);
    if (["localhost", "127.0.0.1", "::1"].includes(parsed.hostname)) errors.push(`${label} cannot use a local hostname.`);
    if (parsed.username || parsed.password) errors.push(`${label} cannot contain credentials.`);
    return parsed;
  } catch {
    errors.push(`${label} must be a valid URL.`);
    return null;
  }
}

export function validateLaunchConfig(values, options = {}) {
  const errors = [];
  const warnings = [];
  const target = options.target ?? values.DEPLOY_TARGET?.trim().toLowerCase();
  if (target && !["staging", "production"].includes(target)) errors.push("DEPLOY_TARGET must be staging or production.");
  if (target) {
    if (!values.CF_WORKER_NAME?.trim()) errors.push("CF_WORKER_NAME is required for deployment builds.");
    if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(values.CF_D1_DATABASE_ID?.trim() ?? "")) {
      errors.push("CF_D1_DATABASE_ID must contain an explicit D1 database UUID.");
    }
    if (!/^[a-z0-9][a-z0-9-]{1,62}$/.test(values.CF_R2_BUCKET_NAME?.trim() ?? "")) errors.push("CF_R2_BUCKET_NAME is required for deployment builds.");
  }
  const authUrl = publicHttpsUrl(values.BETTER_AUTH_URL?.trim(), "BETTER_AUTH_URL", errors);
  const siteUrl = publicHttpsUrl(values.NEXT_PUBLIC_SITE_URL?.trim(), "NEXT_PUBLIC_SITE_URL", errors);
  const orderingUrl = values.NEXT_PUBLIC_ORDERING_URL?.trim();
  const orderingEnabled = values.NEXT_PUBLIC_ORDERING_ENABLED?.trim().toLowerCase() === "true";
  if (orderingUrl) {
    publicHttpsUrl(orderingUrl, "NEXT_PUBLIC_ORDERING_URL", errors);
  } else {
    warnings.push("NEXT_PUBLIC_ORDERING_URL is not configured; hosted online ordering will remain unavailable.");
  }
  if (orderingEnabled && !orderingUrl) {
    errors.push("NEXT_PUBLIC_ORDERING_ENABLED cannot be true until NEXT_PUBLIC_ORDERING_URL is configured.");
  } else if (orderingUrl && !orderingEnabled) {
    warnings.push("Hosted ordering is configured but remains safely disabled until NEXT_PUBLIC_ORDERING_ENABLED is true.");
  }
  if (orderingUrl) {
    try {
      const parsed = new URL(orderingUrl);
      if (parsed.username || parsed.password) errors.push("NEXT_PUBLIC_ORDERING_URL cannot contain credentials.");
    } catch { /* Already reported by publicHttpsUrl. */ }
  }

  if ((values.BETTER_AUTH_SECRET?.trim().length ?? 0) < 32) {
    errors.push("BETTER_AUTH_SECRET must contain at least 32 characters.");
  }
  if (authUrl && siteUrl && authUrl.origin !== siteUrl.origin) {
    errors.push("BETTER_AUTH_URL and NEXT_PUBLIC_SITE_URL must use the same origin.");
  }

  const staffEmails = (values.STAFF_EMAILS ?? "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
  if (staffEmails.length === 0 || staffEmails.some((email) => !emailPattern.test(email))) {
    errors.push("STAFF_EMAILS must contain at least one valid business-controlled email address.");
  }
  for (const key of ["CONTACT_EMAILS", "EMPLOYMENT_EMAILS", "ADMIN_EMAILS"]) {
    const recipients = (values[key] ?? "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
    if (recipients.length === 0 || recipients.some((email) => !emailPattern.test(email))) {
      errors.push(`${key} must contain at least one valid business-controlled email address.`);
    }
  }
  if (!emailPattern.test(values.SUPPORT_EMAIL?.trim().toLowerCase() ?? "")) {
    errors.push("SUPPORT_EMAIL must contain a valid public support address.");
  }

  if (!values.TURNSTILE_SITE_KEY?.trim()) errors.push("TURNSTILE_SITE_KEY is required.");
  if (!values.TURNSTILE_SECRET_KEY?.trim()) errors.push("TURNSTILE_SECRET_KEY is required.");
  const hostnames = (values.TURNSTILE_HOSTNAMES ?? "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
  if (hostnames.length === 0) errors.push("TURNSTILE_HOSTNAMES must contain the production hostname.");
  if (hostnames.some((hostname) => ["localhost", "127.0.0.1", "::1"].includes(hostname))) {
    errors.push("TURNSTILE_HOSTNAMES cannot contain local hostnames in production.");
  }
  if (siteUrl && !hostnames.includes(siteUrl.hostname.toLowerCase())) {
    errors.push("TURNSTILE_HOSTNAMES must include the NEXT_PUBLIC_SITE_URL hostname.");
  }

  const pairedGroups = [
    ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
    ["RESEND_API_KEY", "AUTH_EMAIL_FROM"],
  ];
  for (const group of pairedGroups) {
    const configured = group.filter((key) => values[key]?.trim());
    if (configured.length > 0 && configured.length < group.length) warnings.push(`${group.join(" and ")} should be configured together.`);
  }
  const googleAuthReady = Boolean(values.GOOGLE_CLIENT_ID?.trim() && values.GOOGLE_CLIENT_SECRET?.trim());
  const cloudflareEmailReady = values.CLOUDFLARE_EMAIL_ENABLED?.trim().toLowerCase() === "true" && Boolean(values.AUTH_EMAIL_FROM?.trim());
  const verifiedEmailAuthReady = cloudflareEmailReady || Boolean(values.RESEND_API_KEY?.trim() && values.AUTH_EMAIL_FROM?.trim());
  if (!googleAuthReady && !verifiedEmailAuthReady) {
    errors.push("Configure Google sign-in, Cloudflare Email Service, or Resend so staff have a verified sign-in method.");
  }
  const twilio = ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER"];
  const twilioConfigured = twilio.filter((key) => values[key]?.trim());
  if (twilioConfigured.length > 0 && twilioConfigured.length < twilio.length) warnings.push(`${twilio.join(", ")} should be configured together.`);

  return { errors, warnings };
}

if (process.argv[1] && import.meta.url === new URL(`file:///${process.argv[1].replaceAll("\\", "/")}`).href) {
  const result = validateLaunchConfig(process.env);
  for (const warning of result.warnings) console.warn(`WARNING: ${warning}`);
  for (const error of result.errors) console.error(`ERROR: ${error}`);
  if (result.errors.length > 0) {
    console.error(`Launch configuration is not ready (${result.errors.length} issue${result.errors.length === 1 ? "" : "s"}).`);
    process.exitCode = 1;
  } else {
    console.log("Launch configuration is ready.");
  }
}
