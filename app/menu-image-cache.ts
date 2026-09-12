// Keep a bounded set of decoded photos ready for instant menu previews.
// Background work never occupies the slot reserved for the hovered photo.
export function createMenuImageCache(createImage: () => HTMLImageElement, capacity = 24) {
  type Entry = { image: HTMLImageElement; urgent: boolean; ready: boolean; promise: Promise<void>; start: () => void };
  const entries = new Map<string, Entry>();
  const queue: Entry[] = [];
  let active = 0;

  function drain() {
    while (queue.length && active < (queue[0].urgent ? 4 : 3)) queue.shift()!.start();
  }

  function trim() {
    for (const [src, entry] of entries) {
      if (entries.size <= capacity) break;
      if (entry.ready) entries.delete(src);
    }
  }

  function load(src: string, urgent = false): Promise<void> {
    const cached = entries.get(src);
    if (cached) {
      entries.delete(src);
      entries.set(src, cached);
      const queued = queue.indexOf(cached);
      if (urgent && queued !== -1) {
        cached.urgent = true;
        queue.splice(queued, 1);
        queue.unshift(cached);
        drain();
      }
      if (urgent) cached.image.fetchPriority = "high";
      return cached.promise;
    }
    const image = createImage();
    let resolve!: () => void;
    let reject!: (reason: unknown) => void;
    const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
    const entry: Entry = {
      image, urgent, ready: false, promise,
      start() {
        active++;
        image.decoding = "async";
        image.fetchPriority = entry.urgent ? "high" : "low";
        image.src = src;
        image.decode().then(() => {
          entry.ready = true;
          resolve();
          trim();
        }, (error: unknown) => {
          entries.delete(src);
          reject(error);
        }).finally(() => { active--; drain(); });
      },
    };
    entries.set(src, entry);
    if (urgent) queue.unshift(entry);
    else queue.push(entry);
    drain();
    return promise;
  }

  return { load, isReady: (src: string) => entries.get(src)?.ready ?? false };
}
