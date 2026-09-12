"use client";

import { useEffect, useState } from "react";
import { createMenuImageCache } from "./menu-image-cache";
import previewImages from "./menu-preview-images.json";

const cache = createMenuImageCache(() => new Image());
const previews: Record<string, string> = previewImages;

export function menuPreviewSrc(src: string) {
  return previews[src] ?? src;
}

export function warmMenuPhoto(src: string) {
  void cache.load(menuPreviewSrc(src)).catch(() => { /* Retry on selection. */ });
}

// The caller keys this component by source. Neither a late decode nor the
// browser's pending-image behavior can pair the last photo with the new label.
export function MenuPreviewPhoto({ src, alt }: { src: string; alt: string }) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">(() => cache.isReady(src) ? "ready" : "loading");
  useEffect(() => {
    let current = true;
    void cache.load(src, true).then(
      () => { if (current) setStatus("ready"); },
      () => { if (current) setStatus("error"); },
    );
    return () => { current = false; };
  }, [src]);

  return <>
    <img className="product-photo" src={src} alt={alt} decoding="async" fetchPriority="high" style={{ visibility: status === "ready" ? "visible" : "hidden" }} />
    {status !== "ready" && <span className="menu-photo-status" role="status">{status === "error" ? "Photo unavailable" : "Loading photo…"}</span>}
  </>;
}
