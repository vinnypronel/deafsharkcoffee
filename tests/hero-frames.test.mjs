import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("../app/hero-frames.ts", import.meta.url), "utf8");
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { startHeroFrames } = await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);

function harness(t, reduced = false, delayLast = false, mobile = true, failLast = false) {
  let releaseLast;
  const lastSheet = new Promise(resolve => { releaseLast = resolve; });
  const originals = new Map();
  const set = (key, value) => {
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  };
  let top = 68;
  let layoutReads = 0;
  let pinHeight = 732;
  let now = 0;
  let resize;
  let live = 0;
  let peak = 0;
  let requests = 0;
  let previewRequests = 0;
  let failed = false;
  const painted = [];
  const callbacks = new Map();
  let next = 0;
  const window = Object.assign(new EventTarget(), { innerHeight: 800, innerWidth: 390, scrollY: 0, setTimeout, clearTimeout });
  const document = Object.assign(new EventTarget(), { hidden: false });
  set("window", window);
  set("document", document);
  set("getComputedStyle", () => ({ top: "68px" }));
  set("requestAnimationFrame", (fn) => { callbacks.set(++next, fn); return next; });
  set("cancelAnimationFrame", (id) => callbacks.delete(id));
  set("ResizeObserver", class { constructor(callback) { resize = callback; } observe() {} disconnect() {} });
  set("fetch", async (url) => {
    if (/\/hero-scrub-preview-(mobile|desktop)\.webp$/.test(url)) {
      previewRequests++;
      return { ok: true, blob: async () => -1 };
    }
    requests++;
    const index = Number(url.match(/(\d+)\.(jpg|webp)$/)[1]);
    if (failLast && !failed && index === 23) {
      failed = true;
      throw new Error("Temporary network failure");
    }
    if (delayLast && index === 23) await lastSheet;
    if (requests > 100) throw new Error("Repeated frame loads");
    return { ok: true, blob: async () => index };
  });
  set("createImageBitmap", async (index) => {
    live++;
    peak = Math.max(peak, live);
    if (index === -1) return { index, width: mobile ? 880 : 1920, height: mobile ? 708 : 810, close() { live--; } };
    return { index, width: mobile ? 1650 : 4000, height: mobile ? 704 : 900, close() { live--; } };
  });
  const poster = Object.assign(new EventTarget(), { naturalWidth: 960, naturalHeight: 540 });
  const stop = startHeroFrames(
    { getBoundingClientRect: () => { layoutReads++; return { top, bottom: top + 2400, height: 2400 }; } },
    { getBoundingClientRect: () => ({ height: pinHeight }), querySelector: () => ({ getBoundingClientRect: () => ({ height: 732 }) }) },
    (frame, width, height, sx = 0, sy = 0) => {
      if (frame.index === undefined) painted.push("poster");
      else if (frame.index === -1) painted.push(`preview:${sx / width + sy / height * 8}`);
      else painted.push(frame.index * 10 + sx / width + sy / height * 5);
    }, () => true, poster, reduced, mobile,
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
    get layoutReads() { return layoutReads; },
    get live() { return live; }, get peak() { return peak; },
    get requests() { return requests; }, get previewRequests() { return previewRequests; }, get queued() { return callbacks.size; },
    async flush(count = 160) {
      for (let i = 0; i < 150; i++) await Promise.resolve();
      for (let step = 0; step < count; step++) {
        now += 16.67;
        for (const [id, fn] of [...callbacks]) { callbacks.delete(id); fn(now); }
        await Promise.resolve();
      }
    },
    resizeCanvas() { resize(); },
    resizeToolbar(height) {
      pinHeight = height;
      window.innerHeight = height + 68;
      window.dispatchEvent(new Event("resize"));
    },
    async scroll(progress, frames) {
      top = 68 - progress * 1668;
      window.scrollY = progress * 1668;
      window.dispatchEvent(new Event("scroll"));
      await this.flush(frames);
    },
  };
}

test("mobile frames follow forward/reverse scroll, coalesce events, and stop working at rest", async (t) => {
  const h = harness(t);
  for (let i = 0; i < 30; i++) h.window.dispatchEvent(new Event("scroll"));
  assert.equal(h.queued, 1);
  await h.scroll(0);
  assert.equal(h.painted.at(-1), 0);
  assert.equal(h.requests, 3, "only the first sheet and its two neighbors load at rest");
  assert.equal(h.previewRequests, 1);
  const beforeJump = h.painted.length;
  await h.scroll(1);
  assert.deepEqual(h.painted.slice(beforeJump), ["preview:47", 239], "a flick does not replay intermediate frames");
  assert.equal(h.painted.at(-1), 239);
  await h.scroll(0.5);
  assert.equal(h.painted.at(-1), 120);
  assert.equal(h.queued, 0);
  const requests = h.requests;
  await h.scroll(1);
  assert.equal(h.requests, requests, "reversing reuses previously downloaded sheets");
  assert.ok(h.live <= 6, "mobile keeps five sheets and the preview atlas");
  assert.ok(h.peak <= 8, "at most two full sheet decodes may be in flight");
  h.stop();
  assert.equal(h.live, 0);
});

test("reduced motion keeps the poster and downloads no animation", async (t) => {
  const h = harness(t, true);
  await h.scroll(0.8);
  assert.ok(h.painted.length > 0);
  assert.ok(h.painted.every(frame => frame === "poster"));
  assert.equal(h.requests, 0);
  assert.equal(h.previewRequests, 0);
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

test("canvas resize repaints the current frame without flashing the poster", async (t) => {
  const h = harness(t);
  await h.scroll(0.5);
  const before = h.painted.length;
  const requests = h.requests;
  h.resizeCanvas();
  await h.flush();
  assert.ok(h.painted.length > before);
  assert.ok(h.painted.slice(before).every(frame => frame !== "poster"));
  assert.equal(h.requests, requests);
});

test("both shipped sequences contain all twenty-four sheets", () => {
  for (const [dir, extension] of [["hero-frames-v5/desktop", "webp"], ["hero-frames-v4/mobile", "jpg"]]) {
    const files = readdirSync(new URL(`../public/${dir}/`, import.meta.url));
    assert.equal(files.length, 24);
    for (let i = 0; i < 24; i++) assert.ok(files.includes(`${String(i).padStart(2, "0")}.${extension}`));
  }
});

test("a reverse swipe can draw the latest position while an older request is pending", async (t) => {
  const h = harness(t, false, true);
  await h.scroll(0);
  await h.scroll(1);
  assert.equal(h.painted.at(-1), "preview:47");
  await h.scroll(0.8);
  assert.equal(h.painted.at(-1), 191);
  h.releaseLast();
  await h.flush();
  assert.equal(h.painted.at(-1), 191);
  assert.ok(h.requests < 12);
});


test("desktop starts from a bounded WebP window and never measures layout during scrolling", async (t) => {
  const h = harness(t, false, false, false);
  await h.scroll(0);
  assert.equal(h.requests, 3);
  assert.equal(h.previewRequests, 1);
  const reads = h.layoutReads;
  await h.scroll(0.8);
  assert.equal(h.painted.at(-1), 191);
  await h.scroll(0.2);
  assert.equal(h.painted.at(-1), 48);
  assert.equal(h.layoutReads, reads);
  assert.equal(h.queued, 0);
  assert.ok(h.requests < 12);
  assert.ok(h.live <= 6);
});

test("mobile toolbar height changes do not shift the current animation frame", async (t) => {
  const h = harness(t);
  await h.scroll(0.5);
  const reads = h.layoutReads;
  const painted = h.painted.length;
  h.resizeToolbar(820);
  await h.flush();
  assert.equal(h.painted.at(-1), 120);
  assert.equal(h.layoutReads, reads, "height-only toolbar changes must not remeasure the scroll timeline");
  assert.equal(h.painted.length, painted, "height-only toolbar changes must not redraw the canvas");
});

test("unmount during a decode releases late bitmaps and never schedules more work", async (t) => {
  const h = harness(t, false, true);
  await h.scroll(1);
  h.stop();
  h.releaseLast();
  await h.flush();
  assert.equal(h.live, 0);
  assert.equal(h.queued, 0);
});

test("a failed sheet recovers online without reloading the other decoded sheets", async (t) => {
  const h = harness(t, false, false, true, true);
  await h.scroll(0);
  await h.scroll(1);
  assert.equal(h.painted.at(-1), "preview:47");
  const requests = h.requests;
  h.window.dispatchEvent(new Event("online"));
  await h.flush();
  assert.equal(h.painted.at(-1), 239);
  assert.equal(h.requests, requests + 2, "retry the failed target, then warm its neighbor");
  assert.ok(h.live <= 6);
});
