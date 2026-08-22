import vinext from "vinext";
import { defineConfig } from "vite";
import { sites } from "./build/sites-vite-plugin";

// Real D1 id for deploys, placeholder id for local dev (Miniflare ignores it).
const D1_DATABASE_ID =
  process.env.CF_D1_DATABASE_ID ?? "2946c7c3-7c7e-44af-a194-39c442fce372";

// Hosting bindings. Inlined because `.openai/` is gitignored and is not
// present on CI, where importing it broke the build.
const d1: string | null = "DB";
const r2: string | null = "UPLOADS";

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";
const localAuthVars = Object.fromEntries(
  ["BETTER_AUTH_SECRET", "BETTER_AUTH_URL", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "STAFF_EMAILS", "TURNSTILE_SECRET_KEY"]
    .flatMap((key) => process.env[key] ? [[key, process.env[key]]] : []),
);

const localBindingConfig = {
  name: "deaf-shark-coffee",
  main: "./worker/index.ts",
  compatibility_date: "2026-08-20",
  compatibility_flags: ["nodejs_compat"],
  vars: localAuthVars,
  images: { binding: "IMAGES" },
  d1_databases: d1
    ? [
        {
          binding: d1,
          database_name: "deaf-shark-coffee",
          database_id: D1_DATABASE_ID,
          migrations_dir: "./drizzle",
        },
      ]
    : [],
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: "site-creator-r2",
        },
      ]
    : [],
};

export default defineConfig(async () => {
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    server: isCodexSeatbeltSandbox
      ? { watch: { useFsEvents: false, usePolling: true } }
      : undefined,
    plugins: [
      vinext(),
      sites(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        config: localBindingConfig,
      }),
    ],
  };
});
