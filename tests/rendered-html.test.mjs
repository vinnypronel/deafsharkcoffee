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
  assert.match(html, /Cortado/);
  assert.doesNotMatch(html, /codex-preview/);
  assert.doesNotMatch(html, /Your site is taking shape/);
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
  assert.match(html, /From the Fridge/i);
  assert.match(html, /Poland Spring Water/i);
  assert.match(html, /Snapple/i);
  assert.match(html, /Maple Waffle Sandwich/i);
  assert.match(html, /Chicken Wings with French Fries/i);
  assert.match(html, /Taylor Ham, Egg and Cheese/i);
  assert.match(html, /role="tab"[^>]*>Matcha<\/button>/i);
  assert.match(html, /role="tab"[^>]*>Tea<\/button>/i);
  assert.match(html, /role="tab"[^>]*>Smoothies<\/button>/i);
});
