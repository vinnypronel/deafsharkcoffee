const SHEET_COUNT = 24;
const FRAMES_PER_SHEET = 10;
const COLUMNS = 5;
const LAST_FRAME = SHEET_COUNT * FRAMES_PER_SHEET - 1;
const SHEET_LIMIT = 5;
const PREVIEW_COLUMNS = 8;
const PREVIEW_ROWS = 6;
// Decode a moving window around the current frame. The preview is available
// across the entire scroll range while full-resolution sheets arrive.
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
  const previewWidth = mobile ? 110 : 240;
  const previewHeight = mobile ? 118 : 135;
  const sheets = new Map<number, ImageBitmap>();
  const blobs = new Map<number, Blob>();
  const decoding = new Set<number>();
  const failedSheets = new Set<number>();
  const controller = new AbortController();
  let disposed = false;
  let raf = 0;
  let painted = -1;
  let needsPaint = true;
  let geometryDirty = true;
  let top = 0;
  let distance = 1;
  let bottom = 0;
  let wantedSheet = -1;
  let direction = 1;
  let previousScroll = window.scrollY;
  let preview: ImageBitmap | null = null;
  let previewRequested = false;
  let previewFrame = -1;

  const sheetUrl = (index: number) => {
    const number = String(index).padStart(2, "0");
    return mobile ? `/hero-frames-v4/mobile/${number}.jpg` : `/hero-frames-v5/desktop/${number}.webp`;
  };
  const touch = (index: number, bitmap: ImageBitmap) => {
    sheets.delete(index);
    sheets.set(index, bitmap);
  };
  const trimSheets = () => {
    while (sheets.size > SHEET_LIMIT) {
      const visibleSheet = Math.floor(painted / FRAMES_PER_SHEET);
      const oldest = [...sheets.keys()].find((index) => index !== wantedSheet && index !== visibleSheet);
      if (oldest === undefined) break;
      const bitmap = sheets.get(oldest);
      sheets.delete(oldest);
      bitmap?.close();
    }
  };
  const fetchFrameBlob = async (url: string) => {
    const response = await fetch(url, { signal: controller.signal, cache: "force-cache" });
    if (!response.ok) throw new Error("Hero frames unavailable");
    return response.blob();
  };
  const decodeSheet = async (index: number) => {
    const blob = blobs.get(index) ?? await fetchFrameBlob(sheetUrl(index));
    if (disposed) return false;
    blobs.set(index, blob);
    const bitmap = await createImageBitmap(blob);
    if (disposed || bitmap.width !== width * COLUMNS || bitmap.height !== height * 2) {
      bitmap.close();
      if (disposed) return false;
      throw new Error("Incomplete hero sheet");
    }
    sheets.set(index, bitmap);
    return true;
  };

  const loadPreview = async () => {
    if (previewRequested) return;
    previewRequested = true;
    try {
      const blob = await fetchFrameBlob(`/hero-scrub-preview-${mobile ? "mobile" : "desktop"}.webp`);
      if (disposed) return;
      const bitmap = await createImageBitmap(blob);
      if (disposed || bitmap.width !== previewWidth * PREVIEW_COLUMNS || bitmap.height !== previewHeight * PREVIEW_ROWS) {
        bitmap.close();
        return;
      }
      preview = bitmap;
      schedule();
    } catch { /* Full sheets and the poster are still available. */ }
  };

  const warmWindow = () => {
    if (wantedSheet < 0 || disposed || document.hidden || decoding.size >= 2) return;
    // Give the requested sheet the spare slot when a swipe overtakes a preload.
    // Speculative sheets are loaded one at a time only after the target is ready.
    const candidates = sheets.has(wantedSheet) && !decoding.size
      ? [wantedSheet + direction, wantedSheet + 2 * direction, wantedSheet - direction]
      : [wantedSheet];
    const index = candidates.find((candidate) => candidate >= 0 && candidate < SHEET_COUNT
      && !sheets.has(candidate) && !decoding.has(candidate) && !failedSheets.has(candidate));
    if (index === undefined) return;
    decoding.add(index);
    void decodeSheet(index).then((decoded) => {
      if (!decoded || disposed) return;
      trimSheets();
      if (wantedSheet === index) schedule();
    }).catch(() => {
      if (disposed) return;
      // Retry on reconnect or when scrolling back into this part of the clip.
      failedSheets.add(index);
      blobs.delete(index);
    }).finally(() => {
      decoding.delete(index);
      warmWindow();
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
    if (!sheet || (painted === index && previewFrame < 0 && !needsPaint)) return;
    touch(sheetIndex, sheet);
    const cell = index % FRAMES_PER_SHEET;
    draw(sheet, width, height, (cell % COLUMNS) * width, Math.floor(cell / COLUMNS) * height);
    painted = index;
    previewFrame = -1;
    needsPaint = false;
  };

  const paintPreview = (index: number) => {
    if (!preview) return;
    const frame = Math.round(index * (PREVIEW_COLUMNS * PREVIEW_ROWS - 1) / LAST_FRAME);
    if (previewFrame === frame && !needsPaint) return;
    draw(preview, previewWidth, previewHeight, (frame % PREVIEW_COLUMNS) * previewWidth, Math.floor(frame / PREVIEW_COLUMNS) * previewHeight);
    previewFrame = frame;
    needsPaint = false;
  };

  const measure = () => {
    if (geometryDirty) {
      needsPaint = refresh() || needsPaint;
      const rect = wrap.getBoundingClientRect();
      // Use the stable media height on mobile, so Safari's toolbar animation
      // cannot move the timeline backwards while the user scrolls forwards.
      const pinHeight = pin.querySelector("canvas")?.getBoundingClientRect().height;
      const pinTop = parseFloat(getComputedStyle(pin).top) || 0;
      top = rect.top + window.scrollY - pinTop;
      bottom = rect.bottom + window.scrollY;
      distance = Math.max(1, rect.height - (pinHeight || pin.getBoundingClientRect().height));
      geometryDirty = false;
    }
  };
  const update = () => {
    raf = 0;
    if (disposed || document.hidden) return;
    measure();
    const scroll = window.scrollY;
    if (scroll > bottom || scroll + window.innerHeight < top) {
      wantedSheet = -1;
      return;
    }
    const target = Math.min(1, Math.max(0, (scroll - top) / distance)) * LAST_FRAME;
    if (reduced) { paintPoster(); return; }
    if (scroll !== previousScroll) direction = scroll > previousScroll ? 1 : -1;
    previousScroll = scroll;
    const frame = Math.round(target);
    const sheet = Math.floor(frame / FRAMES_PER_SHEET);
    if (wantedSheet !== sheet) {
      wantedSheet = sheet;
      failedSheets.delete(sheet);
    }
    if (sheets.has(sheet)) paint(frame);
    else if (preview) paintPreview(frame);
    else if (needsPaint) {
      if (painted >= 0) paint(painted);
      else paintPoster();
    }
    warmWindow();
    void loadPreview();
  };
  const schedule = () => {
    if (!raf && !disposed && !document.hidden) raf = requestAnimationFrame(update);
  };

  const resize = () => {
    geometryDirty = true;
    needsPaint = true;
    schedule();
  };
  const resume = () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
      raf = 0;
    } else {
      failedSheets.clear();
      resize();
    }
  };
  const observer = new ResizeObserver(resize);
  observer.observe(wrap);
  observer.observe(pin.querySelector("canvas") ?? pin);
  window.addEventListener("scroll", schedule, { passive: true });
  // On phones the wrapper and canvas use stable viewport units. Observe those
  // surfaces directly so toolbar movement does not invalidate the canvas.
  window.addEventListener("pageshow", resume);
  window.addEventListener("online", resume);
  document.addEventListener("visibilitychange", resume);
  schedule();

  return () => {
    if (disposed) return;
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
    preview?.close();
    sheets.clear();
    blobs.clear();
    decoding.clear();
  };
}
