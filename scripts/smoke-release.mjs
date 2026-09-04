const input = process.argv[2];
if (!input) throw new Error("Pass the deployed base URL as the first argument.");
const base = new URL(input);
const local = ["localhost", "127.0.0.1", "::1"].includes(base.hostname);
if (base.protocol !== "https:" && !(local && base.protocol === "http:")) throw new Error("Smoke tests require HTTPS, except for localhost.");
const routes = ["/", "/menu", "/contact", "/employment", "/api/health", "/api/readiness", "/robots.txt", "/sitemap.xml"];
const failures = [];
for (const route of routes) {
  try {
    const response = await fetch(new URL(route, base), { redirect: "follow", signal: AbortSignal.timeout(15_000) });
    const body = await response.text();
    if (!response.ok) failures.push(`${route}: HTTP ${response.status}`);
    if (!local && /http:\/\/(localhost|127\.0\.0\.1)/i.test(body)) failures.push(`${route}: leaks a local URL`);
    if ((route === "/api/health" || route === "/api/readiness") && !/no-store/i.test(response.headers.get("cache-control") ?? "")) failures.push(`${route}: missing no-store`);
    if (route === "/api/health" && JSON.parse(body).status !== "ok") failures.push(`${route}: unhealthy response`);
    if (route === "/api/readiness" && JSON.parse(body).status !== "ready") failures.push(`${route}: dependencies not ready`);
  } catch (error) { failures.push(`${route}: ${error instanceof Error ? error.name : "request failed"}`); }
}
if (failures.length) { failures.forEach((failure) => console.error(`ERROR: ${failure}`)); process.exitCode = 1; }
else console.log(`Smoke checks passed for ${base.origin}.`);
