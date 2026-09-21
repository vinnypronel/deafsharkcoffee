/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface WorkerEnv extends Env {
  ASSETS: Fetcher;
}

type SupportedImageFormat = "image/jpeg" | "image/png" | "image/webp" | "image/gif" | "image/avif";

function normalizeImageFormat(format: string): SupportedImageFormat {
  switch (format) {
    case "image/jpeg":
    case "image/png":
    case "image/webp":
    case "image/gif":
    case "image/avif":
      return format;
    default:
      return "image/webp";
  }
}

function withSecurityHeaders(request: Request, response: Response): Response {
  if (response.status === 101) return response;

  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  headers.set("Content-Security-Policy", [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://challenges.cloudflare.com https://api.resend.com",
    /* Turnstile widget and its troubleshooting dialog, plus the Google Maps
       embed on the contact page. Anything not listed here renders blank. */
    "frame-src https://challenges.cloudflare.com https://www.cloudflare.com https://maps.google.com https://www.google.com",
  ].join("; "));
  const pathname = new URL(request.url).pathname;
  const method = request.method;
  /* Two public read endpoints carry a short edge cache so a flood is absorbed
     instead of reading D1 on every request; order submission still validates
     hours and pause live, so a few seconds of staleness cannot let a closed
     order through. Only a successful GET is cached. Everything else under /api
     and the operator screens stay uncacheable. */
  const shortCacheApi = method === "GET" && response.ok && (pathname === "/api/menu-state" || pathname === "/api/site-content");
  if (shortCacheApi) {
    headers.set("Cache-Control", "public, max-age=10, stale-while-revalidate=30");
  } else if (pathname.startsWith("/api/") || pathname === "/dashboard" || pathname.startsWith("/kds/")) {
    headers.set("Cache-Control", "no-store");
  }
  if (/\.(?:avif|gif|ico|jpe?g|png|svg|webp|mp4|webm|woff2?)$/i.test(pathname)) {
    headers.set("Cache-Control", pathname.startsWith("/_assets/")
      ? "public, max-age=31536000, immutable"
      : "public, max-age=86400, stale-while-revalidate=604800");
  }
  /* Marketing and menu HTML is identical for every visitor (account and cart are
     client-side), so let the edge cache it briefly: cache-busting query strings
     on the homepage become edge hits instead of a Worker run each. Never cache a
     response that set a cookie or already chose its own caching. */
  if (
    method === "GET" &&
    response.ok &&
    !pathname.startsWith("/api/") &&
    pathname !== "/dashboard" &&
    !pathname.startsWith("/kds/") &&
    !headers.has("Set-Cookie") &&
    !headers.has("Cache-Control") &&
    (response.headers.get("Content-Type") || "").includes("text/html")
  ) {
    headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=600");
  }
  if (new URL(request.url).protocol === "https:") {
    headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: WorkerEnv, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.hostname === "www.deafsharkcoffee.com") {
      url.hostname = "deafsharkcoffee.com";
      return withSecurityHeaders(request, Response.redirect(url.toString(), 301));
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      const response = await handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({
            format: normalizeImageFormat(format),
            quality,
          });
          return result.response();
        },
      }, allowedWidths);
      return withSecurityHeaders(request, response);
    }

    const response = await handler.fetch(request, env, ctx);
    return withSecurityHeaders(request, response);
  },
};

export default worker;
