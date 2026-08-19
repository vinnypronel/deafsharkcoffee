"use client";

import { useEffect, useRef } from "react";

type ScrollHeroProps = {
  src?: string;
  poster?: string;
  /* How many viewport heights of scroll the video is stretched across. */
  scrollHeights?: number;
  children?: React.ReactNode;
};

// Module-level cached media elements so navigating back to the home page is instantaneous
let cachedVideo: HTMLVideoElement | null = null;
let cachedPoster: HTMLImageElement | null = null;

function getSharedVideo(src: string): HTMLVideoElement | null {
  if (typeof document === "undefined") return null;
  if (!cachedVideo) {
    cachedVideo = document.createElement("video");
    cachedVideo.src = src;
    cachedVideo.muted = true;
    cachedVideo.playsInline = true;
    cachedVideo.preload = "auto";
    cachedVideo.crossOrigin = "anonymous";
    cachedVideo.load();
  } else if (!cachedVideo.src.endsWith(src) && cachedVideo.src !== src) {
    cachedVideo.src = src;
    cachedVideo.load();
  }
  return cachedVideo;
}

function getSharedPoster(poster: string): HTMLImageElement | null {
  if (typeof document === "undefined") return null;
  if (!cachedPoster || (!cachedPoster.src.endsWith(poster) && cachedPoster.src !== poster)) {
    cachedPoster = new Image();
    cachedPoster.src = poster;
  }
  return cachedPoster;
}

export default function ScrollHero({
  src = "/hero-scrub.mp4",
  poster = "/hero-scrub-poster.jpg",
  scrollHeights = 3,
  children,
}: ScrollHeroProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const pin = pinRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !pin || !canvas) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Use cached video off-DOM so browser keeps decode cache and extensions cannot detect it
    const video = getSharedVideo(src);
    if (!video) return;
    videoRef.current = video;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frame = 0;
    let duration = 0;
    let current = 0;
    let seeking = false;
    let posterDrawn = false;

    const posterImg = getSharedPoster(poster) || new Image();
    if (!posterImg.src) posterImg.src = poster;

    const resizeCanvas = () => {
      const rect = pin.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(rect.width * dpr);
      const h = Math.round(rect.height * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };

    const readVar = (name: string, fallback: number) => {
      const v = parseFloat(getComputedStyle(canvas).getPropertyValue(name));
      return Number.isFinite(v) ? v : fallback;
    };

    const drawSource = (source: CanvasImageSource, sw: number, sh: number) => {
      if (!sw || !sh) return;
      resizeCanvas();
      const cw = canvas.width;
      const ch = canvas.height;
      if (!cw || !ch) return;
      const zoom = Math.min(Math.max(readVar("--hero-zoom", 1), 0.2), 2);
      const focusX = Math.min(Math.max(readVar("--hero-focus-x", 0.5), 0), 1);
      const focusY = Math.min(Math.max(readVar("--hero-focus-y", 0.5), 0), 1);
      const fit = Math.min(Math.max(readVar("--hero-fit", 0), 0), 1);
      const contain = Math.min(cw / sw, ch / sh);
      const cover = Math.max(cw / sw, ch / sh);
      const scale = (contain + (cover - contain) * fit) * zoom;
      const dw = sw * scale;
      const dh = sh * scale;
      const dx = (cw - dw) * focusX;
      const dy = (ch - dh) * focusY;

      ctx.clearRect(0, 0, cw, ch);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      const gapR = cw - (dx + dw);
      const gapB = ch - (dy + dh);

      const mirror = (
        sxS: number, syS: number, swS: number, shS: number,
        dxD: number, dyD: number, dwD: number, dhD: number,
        flipX: boolean, flipY: boolean,
      ) => {
        if (swS <= 0 || shS <= 0 || dwD <= 0 || dhD <= 0) return;
        ctx.save();
        ctx.translate(flipX ? dxD + dwD : dxD, flipY ? dyD + dhD : dyD);
        ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
        ctx.drawImage(source, sxS, syS, swS, shS, -0.5, -0.5, dwD + 1, dhD + 1);
        ctx.restore();
      };

      const srcL = Math.min(sw, dx / scale);
      const srcR = Math.min(sw, gapR / scale);
      const srcT = Math.min(sh, dy / scale);
      const srcB = Math.min(sh, gapB / scale);

      if (dx > 0) mirror(0, 0, srcL, sh, 0, dy, dx, dh, true, false);
      if (gapR > 0) mirror(sw - srcR, 0, srcR, sh, dx + dw, dy, gapR, dh, true, false);
      if (dy > 0) mirror(0, 0, sw, srcT, dx, 0, dw, dy, false, true);
      if (gapB > 0) mirror(0, sh - srcB, sw, srcB, dx, dy + dh, dw, gapB, false, true);

      if (dx > 0 && dy > 0) mirror(0, 0, srcL, srcT, 0, 0, dx, dy, true, true);
      if (gapR > 0 && dy > 0) mirror(sw - srcR, 0, srcR, srcT, dx + dw, 0, gapR, dy, true, true);
      if (dx > 0 && gapB > 0) mirror(0, sh - srcB, srcL, srcB, 0, dy + dh, dx, gapB, true, true);
      ctx.drawImage(source, dx, dy, dw, dh);

      if (gapB > 0) {
        const armStartX = Math.max(0, dx + dw * 0.65);
        const armW = cw - armStartX;
        if (armW > 0) {
          const topY = Math.floor(dy + dh) - 1;
          const botH = ch - topY + 2;
          const grad = ctx.createLinearGradient(armStartX, topY, cw, topY);
          grad.addColorStop(0, "rgba(36, 21, 13, 0)");
          grad.addColorStop(0.18, "rgba(36, 21, 13, 0.4)");
          grad.addColorStop(0.42, "rgba(36, 21, 13, 0.95)");
          grad.addColorStop(0.65, "rgba(36, 21, 13, 1)");
          grad.addColorStop(1, "rgba(36, 21, 13, 1)");
          ctx.fillStyle = grad;
          ctx.fillRect(armStartX, topY, armW, botH);
        }
      }
    };

    const drawFrame = () => {
      if (video.readyState >= 2 && video.videoWidth > 0) {
        drawSource(video, video.videoWidth, video.videoHeight);
      } else if (posterImg.complete && posterImg.naturalWidth > 0) {
        drawSource(posterImg, posterImg.naturalWidth, posterImg.naturalHeight);
      }
    };

    // Draw synchronously on mount if poster or video frame is ready in cache
    if (video.readyState >= 2 && video.videoWidth > 0) {
      drawFrame();
    } else if (posterImg.complete && posterImg.naturalWidth > 0) {
      drawSource(posterImg, posterImg.naturalWidth, posterImg.naturalHeight);
      posterDrawn = true;
    } else {
      posterImg.onload = () => {
        if (!posterDrawn) {
          drawSource(posterImg, posterImg.naturalWidth, posterImg.naturalHeight);
          posterDrawn = true;
        }
      };
    }

    const readDuration = () => {
      duration = Number.isFinite(video.duration) ? video.duration : 0;
    };
    readDuration();
    video.addEventListener("loadedmetadata", readDuration);

    const onLoadedData = () => drawFrame();
    video.addEventListener("loadeddata", onLoadedData);
    if (video.readyState >= 2) drawFrame();

    if (reduced) return;

    const tick = () => {
      frame = requestAnimationFrame(tick);
      if (!duration) {
        readDuration();
        return;
      }

      const rect = wrap.getBoundingClientRect();
      const pinRect = pin.getBoundingClientRect();

      const dprNow = Math.min(window.devicePixelRatio || 1, 2);
      const wantW = Math.round(pinRect.width * dprNow);
      const wantH = Math.round(pinRect.height * dprNow);
      if (wantW > 0 && wantH > 0 && (canvas.width !== wantW || canvas.height !== wantH)) {
        resizeCanvas();
        drawFrame();
      }
      const pinTop = parseFloat(getComputedStyle(pin).top) || 0;

      const total = rect.height - pinRect.height;
      const progress = total <= 0 ? 0 : Math.min(Math.max((pinTop - rect.top) / total, 0), 1);

      const target = progress * (duration - 0.05);

      current += (target - current) * 0.22;

      if (!seeking && Math.abs(current - video.currentTime) > 0.008) {
        seeking = true;
        if ("fastSeek" in video && typeof (video as any).fastSeek === "function") {
          (video as any).fastSeek(current);
        } else {
          video.currentTime = current;
        }
      }
    };

    const onSeeked = () => {
      seeking = false;
      drawFrame();
    };
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("error", () => { seeking = false; });

    frame = requestAnimationFrame(tick);

    const handleResize = () => {
      resizeCanvas();
      drawFrame();
    };
    window.addEventListener("resize", handleResize);

    const observer = new ResizeObserver(handleResize);
    observer.observe(pin);

    return () => {
      cancelAnimationFrame(frame);
      video.removeEventListener("loadedmetadata", readDuration);
      video.removeEventListener("loadeddata", onLoadedData);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", () => {});
      window.removeEventListener("resize", handleResize);
      observer.disconnect();
    };
  }, [src, poster]);

  return (
    <div
      ref={wrapRef}
      className="relative w-full"
      style={{ height: `${scrollHeights * 100}vh` }}
    >
      <div ref={pinRef} className="scroll-hero-pin w-full overflow-hidden">
        <canvas
          ref={canvasRef}
          className="scroll-hero-video absolute inset-0 h-full w-full"
          aria-hidden="true"
        />
        <div className="scroll-hero-veil absolute inset-0" />
        <div className="relative z-10 h-full w-full">{children}</div>
      </div>
    </div>
  );
}
