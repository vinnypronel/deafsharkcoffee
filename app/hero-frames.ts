const SHEET_COUNT = 24;
const FRAMES_PER_SHEET = 10;
const COLUMNS = 5;
const LAST_FRAME = SHEET_COUNT * FRAMES_PER_SHEET - 1;
const MOBILE_SHEET_LIMIT = 8;
// How far ahead of playback mobile decodes, in sheets of ten frames.
const MOBILE_SHEETS_AHEAD = 3;
// Mobile playback follows the finger with a short ease and a top speed, so a
// fast flick plays the footage through instead of jumping across frames that
// are not decoded yet. At the cap the whole clip takes about 0.8 seconds.
const MOBILE_EASE_MS = 60;
const MOBILE_MAX_FRAMES_PER_MS = 0.3;

// Desktop keeps the complete sequence decoded. Mobile keeps the compressed
// sheets cached but only eight decoded bitmaps resident (about 37 MiB instead
// of 106 MiB), which avoids the memory pressure that made Safari scrolling jank
// while leaving room to decode ahead of the scroll direction.
export function startHeroFrames(
  wrap: HTMLElement,
  pin: HTMLElement,
  draw: (source: CanvasImageSource, width: number, height: number, sx?: number, sy?: number) => void,
  refresh: () => boolean,
  poster: HTMLImageElement,
  reduced: boolean,
  mobile: boolean,
) {
  // Mobile frames are a centered 760x810 crop of the 1440x810 source.
  const width = mobile ? 330 : 800;
  const height = mobile ? 352 : 450;
  const sheets = new Map<number, ImageBitmap>();
  const blobs = new Map<number, Blob>();
  const fetching = new Map<number, Promise<Blob | null>>();
  const decoding = new Map<number, Promise<ImageBitmap | null>>();
  const controller = new AbortController();
  let disposed = false;
  let raf = 0;
  let ready = false;
  let loading = false;
  let current = 0;
  let painted = -1;
  let lastTime = 0;
  let needsPaint = true;
  let geometryDirty = true;
  let top = 0;
  let distance = 1;
  let bottom = 0;
  let retryTimer = 0;
  let attempts = 0;
  let wantedSheet = 0;
  let wantedFrame = 0;
  let lastWarmCenter = -1;
  let lastWarmDirection = 0;
  let lastViewportWidth = window.innerWidth || 0;

  const sheetUrl = (index: number) => `/${mobile ? "hero-frames-v4/mobile" : "hero-frames-v3/desktop"}/${String(index).padStart(2, "0")}.jpg`;
  const touch = (index: number, bitmap: ImageBitmap) => {
    sheets.delete(index);
    sheets.set(index, bitmap);
  };
  const trimMobile = () => {
    if (!mobile) return;
    while (sheets.size > MOBILE_SHEET_LIMIT) {
      const oldest = [...sheets.keys()].find((index) => index !== wantedSheet);
      if (oldest === undefined) break;
      const bitmap = sheets.get(oldest);
      sheets.delete(oldest);
      bitmap?.close();
    }
  };
  const fetchSheet = (index: number) => {
    if (index < 0 || index >= SHEET_COUNT) return Promise.resolve(null);
    const cached = blobs.get(index);
    if (cached) return Promise.resolve(cached);
    const pending = fetching.get(index);
    if (pending) return pending;
    const request = fetch(sheetUrl(index), { signal: controller.signal, cache: "force-cache" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Hero sheet unavailable");
        const blob = await response.blob();
        if (!disposed) blobs.set(index, blob);
        return disposed ? null : blob;
      })
      .catch(() => null)
      .finally(() => fetching.delete(index));
    fetching.set(index, request);
    return request;
  };
  const decodeSheet = (index: number) => {
    const cached = sheets.get(index);
    if (cached) { touch(index, cached); return Promise.resolve(cached); }
    const pending = decoding.get(index);
    if (pending) return pending;
    const request = fetchSheet(index).then(async (blob) => {
      if (blob === null || disposed) return null;
      const bitmap = await createImageBitmap(blob);
      if (disposed) { bitmap.close(); return null; }
      if (bitmap.width !== width * COLUMNS || bitmap.height !== height * 2) {
        bitmap.close();
        return null;
      }
      sheets.set(index, bitmap);
      trimMobile();
      return bitmap;
    }).finally(() => decoding.delete(index));
    decoding.set(index, request);
    return request;
  };
  const warmMobileWindow = (index: number, direction: 1 | -1) => {
    if (!mobile || disposed) return;
    wantedSheet = index;
    if (lastWarmCenter === index && lastWarmDirection === direction && sheets.has(index)) return;
    lastWarmCenter = index;
    lastWarmDirection = direction;
    void decodeSheet(index).then((bitmap) => {
      if (!bitmap || disposed) return;
      ready = true;
      if (wantedSheet === index && painted !== wantedFrame) schedule();
      void (async () => {
        /* Decode the sheets playback is heading into, one at a time so the
           work never spikes, then the one behind for a change of direction. */
        const nearby = [];
        for (let step = 1; step <= MOBILE_SHEETS_AHEAD; step++) nearby.push(index + direction * step);
        nearby.push(index - direction);
        for (const sheet of nearby) {
          if (disposed || wantedSheet !== index) return;
          if (sheet >= 0 && sheet < SHEET_COUNT) await decodeSheet(sheet);
        }
      })();
    });
  };

  const paintPoster = () => {
    if (!disposed && painted < 0 && needsPaint && poster.naturalWidth) {
      const pw = poster.naturalWidth;
      const ph = poster.naturalHeight;
      // Crop the landscape poster the same way as the mobile frames, so the
      // hand-off from poster to footage does not jump.
      if (mobile) draw(poster, Math.round(ph * width / height), ph, Math.round((pw - ph * width / height) * 0.5), 0);
      else draw(poster, pw, ph);
      needsPaint = false;
    }
  };
  poster.addEventListener("load", paintPoster);
  paintPoster();

  const paint = (index: number) => {
    const sheetIndex = Math.floor(index / FRAMES_PER_SHEET);
    const sheet = sheets.get(sheetIndex);
    if (!sheet || (painted === index && !needsPaint)) return;
    touch(sheetIndex, sheet);
    const cell = index % FRAMES_PER_SHEET;
    draw(sheet, width, height, (cell % COLUMNS) * width, Math.floor(cell / COLUMNS) * height);
    painted = index;
    needsPaint = false;
  };

  const measure = () => {
    if (geometryDirty) {
      needsPaint = refresh() || needsPaint;
      const rect = wrap.getBoundingClientRect();
      // Use the stable media height on mobile, so Safari's toolbar animation
      // cannot move the timeline backwards while the user scrolls forwards.
      const pinHeight = mobile ? pin.querySelector("canvas")?.getBoundingClientRect().height
        : pin.getBoundingClientRect().height;
      const pinTop = parseFloat(getComputedStyle(pin).top) || 0;
      top = rect.top + window.scrollY - pinTop;
      bottom = rect.bottom + window.scrollY;
      distance = Math.max(1, rect.height - (pinHeight || pin.getBoundingClientRect().height));
      geometryDirty = false;
    }
  };
  const update = (now: number) => {
    raf = 0;
    if (disposed || document.hidden) return;
    measure();
    if (!ready || reduced) { paintPoster(); return; }
    const scroll = window.scrollY;
    if (scroll > bottom || scroll + window.innerHeight < top) { lastTime = 0; return; }
    const target = Math.min(1, Math.max(0, (scroll - top) / distance)) * LAST_FRAME;
    if (mobile) {
      const elapsed = lastTime ? Math.min(Math.max(now - lastTime, 0), 50) : 16.67;
      const gap = target - current;
      const limit = elapsed * MOBILE_MAX_FRAMES_PER_MS;
      const step = Math.min(Math.max(gap * (1 - Math.exp(-elapsed / MOBILE_EASE_MS)), -limit), limit);
      const next = Math.abs(gap - step) < 0.05 ? target : current + step;
      const frame = Math.round(next);
      const sheet = Math.floor(frame / FRAMES_PER_SHEET);
      wantedFrame = frame;
      warmMobileWindow(sheet, gap >= 0 ? 1 : -1);
      if (!sheets.has(sheet)) {
        /* Hold the current frame until its sheet is decoded; the decode
           schedules the next update itself. */
        lastTime = 0;
        return;
      }
      lastTime = now;
      current = next;
      paint(frame);
      if (current !== target) raf = requestAnimationFrame(update);
      else lastTime = 0;
      return;
    }
    const dt = lastTime ? Math.min(Math.max(now - lastTime, 0), 50) : 16.67;
    lastTime = now;
    current += (target - current) * (1 - Math.exp(-dt / 45));
    if (Math.abs(target - current) < 0.05) current = target;
    paint(Math.round(current));
    if (current !== target) raf = requestAnimationFrame(update);
    else lastTime = 0;
  };
  const schedule = () => {
    if (!raf && !disposed && !document.hidden) raf = requestAnimationFrame(update);
  };

  const load = async () => {
    if (disposed || reduced || (!mobile && ready) || loading || document.hidden) return;
    loading = true;
    attempts++;
    measure();
    if (mobile) {
      const initialFrame = Math.round(Math.min(1, Math.max(0, (window.scrollY - top) / distance)) * LAST_FRAME);
      wantedFrame = initialFrame;
      // Open on the frame for the current scroll position, not a play-in from zero.
      if (painted < 0) current = initialFrame;
      warmMobileWindow(Math.floor(initialFrame / FRAMES_PER_SHEET), 1);
      /* Cache the remaining compressed JPEGs without retaining their decoded
         pixels. Two workers keep network time short without a decode storm. */
      let nextBlob = 0;
      const cacheWorker = async () => {
        while (nextBlob < SHEET_COUNT && !disposed && !document.hidden) await fetchSheet(nextBlob++);
      };
      await Promise.all([cacheWorker(), cacheWorker()]);
      loading = false;
      return;
    }
    let next = 0;
    const worker = async () => {
      while (next < SHEET_COUNT && !disposed && !document.hidden) {
        const index = next++;
        if (sheets.has(index)) continue;
        try {
          const blob = await fetchSheet(index);
          if (blob === null) throw new Error("Hero sheet unavailable");
          const bitmap = await createImageBitmap(blob);
          if (disposed) { bitmap.close(); return; }
          if (bitmap.width !== width * COLUMNS || bitmap.height !== height * 2) {
            bitmap.close();
            throw new Error("Incomplete hero sheet");
          }
          sheets.set(index, bitmap);
        } catch { /* Keep the poster until all frames are decoded. */ }
      }
    };
    await Promise.all([worker(), worker()]);
    loading = false;
    if (disposed) return;
    ready = sheets.size === SHEET_COUNT;
    if (ready) {
      // On a fast initial scroll, begin at the latest position, not frame zero.
      measure();
      current = Math.min(1, Math.max(0, (window.scrollY - top) / distance)) * LAST_FRAME;
      schedule();
    } else if (!document.hidden && attempts < 3) {
      retryTimer = window.setTimeout(() => { retryTimer = 0; void load(); }, attempts * 1000);
    }
  };
  const resize = () => {
    const viewportWidth = window.innerWidth || 0;
    /* Safari changes the visual viewport height while its address bar moves.
       The mobile canvas uses stable lvh sizing, so remeasuring the entire hero
       on those height-only events creates work without changing the timeline. */
    if (!mobile || viewportWidth !== lastViewportWidth) {
      lastViewportWidth = viewportWidth;
      geometryDirty = true;
    }
    needsPaint = true;
    schedule();
  };
  const resume = () => {
    lastTime = 0;
    window.clearTimeout(retryTimer);
    retryTimer = 0;
    if (document.hidden) {
      cancelAnimationFrame(raf);
      raf = 0;
    } else {
      attempts = 0;
      void load();
      resize();
    }
  };
  const observer = new ResizeObserver(resize);
  observer.observe(wrap);
  observer.observe(pin);
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener("pageshow", resume);
  window.addEventListener("online", resume);
  document.addEventListener("visibilitychange", resume);
  void load();
  schedule();

  return () => {
    disposed = true;
    cancelAnimationFrame(raf);
    window.clearTimeout(retryTimer);
    controller.abort();
    observer.disconnect();
    window.removeEventListener("scroll", schedule);
    window.removeEventListener("resize", resize);
    window.removeEventListener("pageshow", resume);
    window.removeEventListener("online", resume);
    document.removeEventListener("visibilitychange", resume);
    poster.removeEventListener("load", paintPoster);
    sheets.forEach((bitmap) => bitmap.close());
    sheets.clear();
    blobs.clear();
    fetching.clear();
    decoding.clear();
  };
}
