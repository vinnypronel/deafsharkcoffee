import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("../app/menu-image-cache.ts", import.meta.url), "utf8");
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { createMenuImageCache } = await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);

function harness(capacity) {
  const images = [];
  const cache = createMenuImageCache(() => {
    const image = { decode: () => new Promise((resolve, reject) => { image.resolve = resolve; image.reject = reject; }) };
    images.push(image);
    return image;
  }, capacity);
  return { cache, images };
}
const flush = () => new Promise(resolve => setImmediate(resolve));

test("hovered photos bypass background work while rapid selections stay bounded", async () => {
  const { cache, images } = harness();
  for (let i = 0; i < 8; i++) void cache.load(`background-${i}`);
  assert.equal(images.filter(image => image.src).length, 3);
  void cache.load("hover-A", true);
  void cache.load("hover-B", true);
  void cache.load("hover-C", true);
  assert.equal(images.filter(image => image.src).length, 4);
  images[0].resolve();
  await flush();
  assert.equal(images.at(-1).src, "hover-C", "latest hover must start before stale queued selections");
  assert.equal(images.at(-1).fetchPriority, "high");
  assert.equal(images.at(-2).src, undefined);
});

test("queued preloads are promoted and duplicate requests share their decode", async () => {
  const { cache, images } = harness();
  for (let i = 0; i < 3; i++) void cache.load(`busy-${i}`);
  const pending = cache.load("selected");
  assert.equal(cache.load("selected", true), pending);
  assert.equal(images.length, 4);
  assert.equal(images[3].src, "selected");
  assert.equal(images[3].fetchPriority, "high");
  assert.equal(cache.isReady("selected"), false);
  images[3].resolve();
  await pending;
  assert.equal(cache.isReady("selected"), true);
});

test("out-of-order decodes stay associated with their source and failures can retry", async () => {
  const { cache, images } = harness();
  const a = cache.load("A", true);
  const b = cache.load("B", true);
  images[1].resolve();
  await b;
  assert.equal(cache.isReady("A"), false);
  assert.equal(cache.isReady("B"), true);
  images[0].reject(new Error("offline"));
  await assert.rejects(a, /offline/);
  const retry = cache.load("A", true);
  images[2].resolve();
  await retry;
  assert.equal(cache.isReady("A"), true);
});

test("decoded image retention is bounded and recently used photos stay warm", async () => {
  const { cache, images } = harness(2);
  for (const src of ["A", "B"]) {
    const loaded = cache.load(src);
    images.at(-1).resolve();
    await loaded;
    await flush();
  }
  await cache.load("A", true);
  const c = cache.load("C");
  images.at(-1).resolve();
  await c;
  assert.equal(cache.isReady("A"), true);
  assert.equal(cache.isReady("B"), false);
  assert.equal(cache.isReady("C"), true);
});

test("every optimized menu photo maps to an existing original and output asset", () => {
  const manifest = JSON.parse(readFileSync(new URL("../app/menu-preview-images.json", import.meta.url), "utf8"));
  assert.ok(Object.keys(manifest).length > 0);
  for (const [original, preview] of Object.entries(manifest)) {
    assert.ok(existsSync(new URL(`../public${original}`, import.meta.url)), original);
    assert.ok(existsSync(new URL(`../public${preview}`, import.meta.url)), preview);
    assert.match(preview, /\/menu\/previews\/.+-[0-9a-f]{10}\.webp$/);
  }
});
