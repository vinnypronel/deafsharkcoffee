const SHEET_COUNT = 12;
const FRAMES_PER_SHEET = 10;
const COLUMNS = 5;
const FRAME_WIDTH = 480;
const FRAME_HEIGHT = 270;
const LAST_FRAME = SHEET_COUNT * FRAMES_PER_SHEET - 1;

// All sheets are decoded once before scrubbing: scrolling never fetches or
// decodes a frame. Fixed bitmap budget: 62,208,000 bytes (~59 MiB).
export function startMobileHeroFrames(
  wrap: HTMLElement,
  pin: HTMLElement,
  draw: (source: CanvasImageSource, width: number, height: number, sx?: number, sy?: number) => void,
  refresh: () => void,
  poster: HTMLImageElement,
  reduced: boolean,
) {
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
  let geometryDirty = false;
  let pinHeight = pin.getBoundingClientRect().height;
  let pinTop = parseFloat(getComputedStyle(pin).top) || 0;

  const paintPoster = () => {
    if (!disposed && painted < 0 && poster.naturalWidth) {
      draw(poster, poster.naturalWidth, poster.naturalHeight);
    }
  };
  poster.addEventListener("load", paintPoster);
  paintPoster();

  const paint = (index: number) => {
    const sheet = sheets.get(Math.floor(index / FRAMES_PER_SHEET));
    if (!sheet || (painted === index && !needsPaint)) return;
    const cell = index % FRAMES_PER_SHEET;
    draw(sheet, FRAME_WIDTH, FRAME_HEIGHT,
      (cell % COLUMNS) * FRAME_WIDTH, Math.floor(cell / COLUMNS) * FRAME_HEIGHT);
    painted = index;
    needsPaint = false;
  };

  const update = (now: number) => {
    raf = 0;
    if (disposed || document.hidden) return;
    if (geometryDirty) {
      refresh();
      pinHeight = pin.getBoundingClientRect().height;
      pinTop = parseFloat(getComputedStyle(pin).top) || 0;
      geometryDirty = false;
      needsPaint = true;
    }
    if (!ready || reduced) { paintPoster(); return; }
    const rect = wrap.getBoundingClientRect();
    if (rect.bottom <= 0 || rect.top >= window.innerHeight) return;
    const progress = Math.min(1, Math.max(0, (pinTop - rect.top) / Math.max(1, rect.height - pinHeight)));
    const target = progress * LAST_FRAME;
    const dt = lastTime ? Math.min(Math.max(now - lastTime, 0), 50) : 16.67;
    lastTime = now;
    current += (target - current) * (1 - Math.exp(-dt / 65));
    if (Math.abs(target - current) < 0.05) current = target;
    paint(Math.round(current));
    if (current !== target) raf = requestAnimationFrame(update);
  };
  const schedule = () => {
    if (!raf && !disposed && !document.hidden) raf = requestAnimationFrame(update);
  };

  // Two modest sheets at a time; the poster stays visible until the complete
  // sequence is ready, rather than repeatedly freezing on missing frames.
  const load = async () => {
    if (disposed || reduced || ready || loading || document.hidden) return;
    loading = true;
    let next = 0;
    const worker = async () => {
      while (next < SHEET_COUNT && !disposed && !document.hidden) {
        const index = next++;
        if (sheets.has(index)) continue;
        try {
          const response = await fetch(`/hero-atlas-v2/${String(index).padStart(2, "0")}.jpg`, {
            signal: controller.signal, cache: "force-cache",
          });
          if (!response.ok) throw new Error("Hero sheet unavailable");
          const bitmap = await createImageBitmap(await response.blob());
          if (disposed) { bitmap.close(); return; }
          sheets.set(index, bitmap);
        } catch { /* Keep the poster; retry on visibility, pageshow, or online. */ }
      }
    };
    await Promise.all([worker(), worker()]);
    loading = false;
    ready = sheets.size === SHEET_COUNT;
    if (ready) schedule();
  };
  const resize = () => {
    geometryDirty = true;
    schedule();
  };
  const resume = () => {
    lastTime = 0;
    if (document.hidden) {
      cancelAnimationFrame(raf);
      raf = 0;
    } else {
      void load();
      resize();
    }
  };
  const observer = new ResizeObserver(resize);
  observer.observe(pin);
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("pageshow", resume);
  window.addEventListener("online", resume);
  document.addEventListener("visibilitychange", resume);
  void load();
  schedule();

  return () => {
    disposed = true;
    cancelAnimationFrame(raf);
    controller.abort();
    observer.disconnect();
    window.removeEventListener("scroll", schedule);
    window.removeEventListener("pageshow", resume);
    window.removeEventListener("online", resume);
    document.removeEventListener("visibilitychange", resume);
    poster.removeEventListener("load", paintPoster);
    sheets.forEach((bitmap) => bitmap.close());
    sheets.clear();
  };
}
