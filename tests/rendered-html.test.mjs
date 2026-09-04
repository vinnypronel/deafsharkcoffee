import assert from "node:assert/strict";
import test from "node:test";

async function render(path = "/", headers = {}) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: "text/html", ...headers } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Deaf Shark storefront", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /Deaf Shark Coffee/);
  assert.match(html, /Coffee from El Salvador/i);
  assert.match(html, /Order online/i);
  assert.doesNotMatch(html, /codex-preview/);
  assert.doesNotMatch(html, /Your site is taking shape/);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.match(response.headers.get("permissions-policy") ?? "", /camera=\(\)/);
});

test("serves a non-cacheable liveness endpoint without exposing configuration", async () => {
  const response = await render("/api/health", { accept: "application/json" });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { status: "ok", service: "deaf-shark-coffee" });
});

test("server-renders public support and legal routes", async () => {
  for (const [path, expected] of [
    ["/contact", /Come see us/i],
    ["/privacy", /Privacy Policy/i],
    ["/terms", /Terms of Service/i],
    ["/employment", /Join the counter in Union/i],
  ]) {
    const response = await render(path);
    assert.equal(response.status, 200, path);
    assert.match(await response.text(), expected, path);
  }
});

test("protects the counter dashboard for anonymous visitors", async () => {
  const response = await render("/dashboard", { "x-deaf-shark-render-test": "denied" });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Deaf Shark Coffee/i);
  assert.match(html, /Staff access required/i);
  assert.doesNotMatch(html, /Pause online orders/i);
});

test("protects both preparation-station screens for anonymous visitors", async () => {
  for (const station of ["coffee", "kitchen"]) {
    const response = await render(`/kds/${station}`, { "x-deaf-shark-render-test": "denied" });
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /Staff access required/i);
    assert.doesNotMatch(html, /Enable sound/i);
  }
});

test("server-renders the expanded photographed menu", async () => {
  const response = await render("/menu");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Grab &amp; Go/i);
  assert.match(html, /Poland Spring Water/i);
  assert.match(html, /Snapple/i);
  assert.match(html, /The NJ Classic/i);
  assert.match(html, /Chicken Wings with French Fries/i);
  assert.match(html, /Chicken Deluxe/i);
  assert.match(html, /role="tab"[^>]*><span class="category-nav-label">Matcha<\/span>/i);
  assert.match(html, /role="tab"[^>]*><span class="category-nav-label">Tea<\/span>/i);
  assert.match(html, /role="tab"[^>]*><span class="category-nav-label">Smoothies<\/span>/i);
});
