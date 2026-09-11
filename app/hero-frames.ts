const SHEET_COUNT = 24;
const FRAMES_PER_SHEET = 10;
const COLUMNS = 5;
const LAST_FRAME = SHEET_COUNT * FRAMES_PER_SHEET - 1;

// Decode the entire sequence before enabling scrubbing. No media seeks, image
// decoding or network requests in the scroll loop. Pixel budgets are fixed:
// mobile 119 MiB, desktop 330 MiB, released on unmount / reduced-motion change.
export function startHeroFrames(
  wrap: HTMLElement,
  pin: HTMLElement,
  draw: (source: CanvasImageSource, width: number, height: number, sx?: number, sy?: number) => void,
  refresh: () => boolean,
  poster: HTMLImageElement,
  reduced: boolean,
  mobile: boolean,
) {
  const width = mobile ? 480 : 800;
  const height = mobile ? 270 : 450;
  const sheets = new Map<number, ImageBitmap>();
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

  const paintPoster = () => {
    if (!disposed && painted < 0 && needsPaint && poster.naturalWidth) {
      draw(poster, poster.naturalWidth, poster.naturalHeight);
      needsPaint = false;
    }
  };
  poster.addEventListener("load", paintPoster);
  paintPoster();

  const paint = (index: number) => {
    const sheet = sheets.get(Math.floor(index / FRAMES_PER_SHEET));
    if (!sheet || (painted === index && !needsPaint)) return;
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
    if (disposed || reduced || ready || loading || document.hidden) return;
    loading = true;
    attempts++;
    let next = 0;
    const worker = async () => {
      while (next < SHEET_COUNT && !disposed && !document.hidden) {
        const index = next++;
        if (sheets.has(index)) continue;
        try {
          const response = await fetch(`/hero-frames-v3/${mobile ? "mobile" : "desktop"}/${String(index).padStart(2, "0")}.jpg`, {
            signal: controller.signal, cache: "force-cache",
          });
          if (!response.ok) throw new Error("Hero sheet unavailable");
          const bitmap = await createImageBitmap(await response.blob());
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
  const resize = () => { geometryDirty = true; schedule(); };
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
  };
}
