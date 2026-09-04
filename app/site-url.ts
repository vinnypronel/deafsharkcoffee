const LOCAL_SITE_URL = "http://localhost:3000";

export function siteUrl(): URL {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.BETTER_AUTH_URL?.trim();
  const deploymentTarget = process.env.DEPLOY_TARGET?.trim().toLowerCase();
  const deploymentBuild = deploymentTarget === "staging" || deploymentTarget === "production";
  if (!configured) {
    if (deploymentBuild) throw new Error("NEXT_PUBLIC_SITE_URL is required for deployment builds.");
    return new URL(LOCAL_SITE_URL);
  }

  try {
    const parsed = new URL(configured);
    const localHostname = ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
    if ((parsed.protocol === "http:" || parsed.protocol === "https:") && !(deploymentBuild && localHostname)) {
      return parsed;
    }
  } catch {
    // The fallback keeps local builds usable; launch checks must reject it in production.
  }

  if (deploymentBuild) throw new Error("NEXT_PUBLIC_SITE_URL must be a non-local HTTP(S) URL for deployment builds.");
  return new URL(LOCAL_SITE_URL);
}
