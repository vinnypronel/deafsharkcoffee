import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("../app/mobile-hero-frames.ts", import.meta.url), "utf8");
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { startMobileHeroFrames } = await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);

function harness(t, reduced = false, delayLast = false) {
  let releaseLast;
  const lastSheet = new Promise(resolve => { releaseLast = resolve; });
  const originals = new Map();
  const set = (key, value) => {
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  };
  let top = 68;
  let pinHeight = 732;
  let now = 0;
  let resize;
  let live = 0;
  let peak = 0;
  let requests = 0;
  const painted = [];
  const callbacks = new Map();
  let next = 0;
  const window = Object.assign(new EventTarget(), { innerHeight: 800 });
  const document = Object.assign(new EventTarget(), { hidden: false });
  set("window", window);
  set("document", document);
  set("getComputedStyle", () => ({ top: "68px" }));
  set("requestAnimationFrame", (fn) => { callbacks.set(++next, fn); return next; });
  set("cancelAnimationFrame", (id) => callbacks.delete(id));
  set("ResizeObserver", class { constructor(callback) { resize = callback; } observe() {} disconnect() {} });
  set("fetch", async (url) => {
    requests++;
    if (delayLast && url.endsWith("/11.jpg")) await lastSheet;
    if (requests > 100) throw new Error("Repeated frame loads");
    return { ok: true, blob: async () => Number(url.match(/(\d+)\.jpg/)[1]) };
  });
  set("createImageBitmap", async (index) => {
    live++;
    peak = Math.max(peak, live);
    return { index, width: 2400, height: 540, close() { live--; } };
  });
  const poster = Object.assign(new EventTarget(), { naturalWidth: 960, naturalHeight: 540 });
  const stop = startMobileHeroFrames(
    { getBoundingClientRect: () => ({ top, bottom: top + 2400, height: 2400 }) },
    { getBoundingClientRect: () => ({ height: pinHeight }) },
    (frame, width, height, sx = 0, sy = 0) => painted.push(frame.index === undefined ? "poster" : frame.index * 10 + sx / 480 + sy / 270 * 5), () => {}, poster, reduced,
  );
  t.after(() => {
    stop();
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  return {
    window, document, painted, stop, releaseLast,
    get live() { return live; }, get peak() { return peak; },
    get requests() { return requests; }, get queued() { return callbacks.size; },
    async flush(count = 70) {
      for (let i = 0; i < 150; i++) await Promise.resolve();
      for (let step = 0; step < count; step++) {
        now += 16.67;
        for (const [id, fn] of [...callbacks]) { callbacks.delete(id); fn(now); }
      }
    },
    resize(height) { pinHeight = height; resize(); },
    async scroll(progress) {
      top = 68 - progress * 1668;
      window.dispatchEvent(new Event("scroll"));
      await this.flush();
    },
  };
}

test("mobile frames follow forward/reverse scroll, coalesce events, and stop working at rest", async (t) => {
  const h = harness(t);
  for (let i = 0; i < 30; i++) h.window.dispatchEvent(new Event("scroll"));
  assert.equal(h.queued, 1);
  await h.scroll(0);
  assert.equal(h.painted.at(-1), 0);
  await h.scroll(1);
  assert.equal(h.painted.at(-1), 119);
  await h.scroll(0.5);
  assert.equal(h.painted.at(-1), 60);
  assert.equal(h.queued, 0);
  assert.equal(h.requests, 12, "scrolling must not trigger more requests");
  assert.equal(h.live, 12);
  assert.equal(h.peak, 12);
  h.stop();
  assert.equal(h.live, 0);
});

test("reduced motion keeps the poster and downloads no animation", async (t) => {
  const h = harness(t, true);
  await h.scroll(0.8);
  assert.ok(h.painted.length > 0);
  assert.ok(h.painted.every(frame => frame === "poster"));
  assert.equal(h.requests, 0);
});

test("hidden and offscreen heroes do not start new frame loads", async (t) => {
  const h = harness(t);
  await h.scroll(0);
  const requests = h.requests;
  h.document.hidden = true;
  await h.scroll(0.6);
  assert.equal(h.requests, requests);
  h.document.hidden = false;
  await h.scroll(2);
  assert.equal(h.requests, requests);
});

test("toolbar resize repaints the current frame without flashing the poster", async (t) => {
  const h = harness(t);
  await h.scroll(0.5);
  const before = h.painted.length;
  h.resize(820);
  await h.flush();
  assert.ok(h.painted.length > before);
  assert.ok(h.painted.slice(before).every(frame => frame !== "poster"));
  assert.equal(h.requests, 12);
});

test("the shipped sequence contains all twelve complete sheets", () => {
  const files = readdirSync(new URL("../public/hero-atlas-v2/", import.meta.url));
  assert.equal(files.length, 12);
  for (let i = 0; i < 12; i++) assert.ok(files.includes(`${String(i).padStart(2, "0")}.jpg`));
});

test("scrubbing waits for the complete decoded sequence instead of stalling on a missing sheet", async (t) => {
  const h = harness(t, false, true);
  await h.scroll(0.8);
  assert.ok(h.painted.every(frame => frame === "poster"));
  h.releaseLast();
  await h.flush();
  assert.equal(h.painted.at(-1), 95);
  assert.equal(h.requests, 12);
});
