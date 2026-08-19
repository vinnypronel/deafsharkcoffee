"use client";

import { useEffect, useRef } from "react";

type ScrollHeroProps = {
  src?: string;
  poster?: string;
  /* How many viewport heights of scroll the video is stretched across. */
  scrollHeights?: number;
  children?: React.ReactNode;
};

/*
  Scroll-bound video rendered to a <canvas>.

  A hidden <video> element drives the timing while a <canvas> displays
  each frame. This avoids exposing a <video> tag in the visible DOM,
  which prevents browser extensions from overlaying controls on it.

  The page runs Lenis smooth scrolling, which writes its interpolated position back
  to window.scrollY, so reading scrollY inside a rAF loop already gives the eased
  value. That is why the scroll listener is a loop rather than a scroll event: the
  loop samples once per frame, in sync with the compositor, instead of firing many
  times per frame and fighting the browser for seek work.
*/
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

    // Create video element off-DOM so extensions cannot detect it
    const video = document.createElement("video");
    video.src = src;
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.crossOrigin = "anonymous";
    videoRef.current = video;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frame = 0;
    let duration = 0;
    let current = 0;
    let seeking = false;
    let posterDrawn = false;

    // Draw the poster image as the initial frame
    const posterImg = new Image();
    posterImg.src = poster;
    posterImg.onload = () => {
      if (!posterDrawn) {
        drawSource(posterImg, posterImg.naturalWidth, posterImg.naturalHeight);
        posterDrawn = true;
      }
    };

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

    /*
      Cover-fit with a focal point, done here rather than with a CSS transform.

      A CSS scale below 1 shrinks the element and exposes the panel background as
      bands down the sides. Drawing the frame ourselves cannot do that: the source
      is always scaled to at least fill the canvas, and panning only changes WHICH
      part of the frame is shown, never whether it fills.

        scale = max(cw / vw, ch / vh) * zoom     zoom >= 1, so it always covers
        dx    = (cw - vw * scale) * focusX       focusX 0 hugs the left edge,
        dy    = (ch - vh * scale) * focusY       1 hugs the right edge

      Both slack terms are negative or zero, so there is no way to leave a gap.
    */
    const readVar = (name: string, fallback: number) => {
      const v = parseFloat(getComputedStyle(canvas).getPropertyValue(name));
      return Number.isFinite(v) ? v : fallback;
    };

    const drawSource = (source: CanvasImageSource, sw: number, sh: number) => {
      if (!sw || !sh) return;
      resizeCanvas();
      const cw = canvas.width;
      const ch = canvas.height;
      const zoom = Math.min(Math.max(readVar("--hero-zoom", 1), 0.2), 2);
      const focusX = Math.min(Math.max(readVar("--hero-focus-x", 0.5), 0), 1);
      const focusY = Math.min(Math.max(readVar("--hero-focus-y", 0.5), 0), 1);
      /*
        --hero-fit blends the base scale between contain (0) and cover (1).
        Contain suits the wide desktop panel, where leaving espresso around the frame
        is the point. On a tall narrow phone panel the two aspects diverge so far that
        contain would shrink the video to a stamp with huge empty bands, so mobile
        switches to cover and crops instead.
      */
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

      /*
        Fill the surround by mirroring the frame outward across each edge.

        A flat colour cannot blend, because the footage is vignetted: its backdrop is
        lighter toward the centre and darker at the corners, so any single brown leaves
        a seam somewhere. Stretching the outermost strip fixes the colour but smears
        bright detail into streaks, which was visible along the top where the droplets
        are. Mirroring reflects real image content back across the boundary, so the
        pixels either side of every seam are identical by construction and the result
        stays organic. Measured seam difference is 0.00 on all four edges.

        All of this is skipped when the frame covers the panel, since the gaps are zero.
      */
      const gapR = cw - (dx + dw);
      const gapB = ch - (dy + dh);

      /* reflect a source region into place, flipping across the shared edge */
      const mirror = (
        sxS: number, syS: number, swS: number, shS: number,
        dxD: number, dyD: number, dwD: number, dhD: number,
        flipX: boolean, flipY: boolean,
      ) => {
        if (swS <= 0 || shS <= 0 || dwD <= 0 || dhD <= 0) return;
        ctx.save();
        ctx.translate(flipX ? dxD + dwD : dxD, flipY ? dyD + dhD : dyD);
        ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
        ctx.drawImage(source, sxS, syS, swS, shS, 0, 0, dwD, dhD);
        ctx.restore();
      };

      /* band depths expressed back in source pixels, clamped to the frame */
      const srcL = Math.min(sw, dx / scale);
      const srcR = Math.min(sw, gapR / scale);
      const srcT = Math.min(sh, dy / scale);
      const srcB = Math.min(sh, gapB / scale);

      if (dx > 0) mirror(0, 0, srcL, sh, 0, dy, dx, dh, true, false);
      if (gapR > 0) mirror(sw - srcR, 0, srcR, sh, dx + dw, dy, gapR, dh, true, false);
      if (dy > 0) mirror(0, 0, sw, srcT, dx, 0, dw, dy, false, true);
      if (gapB > 0) mirror(0, sh - srcB, sw, srcB, dx, dy + dh, dw, gapB, false, true);

      /* corners reflect across both axes at once */
      if (dx > 0 && dy > 0) mirror(0, 0, srcL, srcT, 0, 0, dx, dy, true, true);
      if (gapR > 0 && dy > 0) mirror(sw - srcR, 0, srcR, srcT, dx + dw, 0, gapR, dy, true, true);
      if (dx > 0 && gapB > 0) mirror(0, sh - srcB, srcL, srcB, 0, dy + dh, dx, gapB, true, true);
      ctx.drawImage(source, dx, dy, dw, dh);

      /* Cover the extra mirrored arm and bracelets on the bottom-right */
      if (gapB > 0) {
        const armStartX = Math.max(0, dx + dw * 0.42);
        const armW = cw - armStartX;
        if (armW > 0) {
          const grad = ctx.createLinearGradient(armStartX, dy + dh, cw, dy + dh);
          grad.addColorStop(0, "rgba(35, 22, 14, 0)");
          grad.addColorStop(0.15, "rgba(46, 30, 20, 0.98)");
          grad.addColorStop(0.6, "rgba(48, 30, 20, 1)");
          grad.addColorStop(0.85, "rgba(75, 50, 35, 1)");
          grad.addColorStop(1, "rgba(110, 78, 56, 1)");
          ctx.fillStyle = grad;
          ctx.fillRect(armStartX, dy + dh, armW, ch - (dy + dh));
        }
      }
    };

    const drawFrame = () => drawSource(video, video.videoWidth, video.videoHeight);

    const readDuration = () => {
      duration = Number.isFinite(video.duration) ? video.duration : 0;
    };
    readDuration();
    video.addEventListener("loadedmetadata", readDuration);

    /*
      Nothing else paints the first frame: the loop only issues seeks, and frames are
      drawn on seeked. Without this the canvas stays an empty 0x0 bitmap until the
      first scroll, so the hero shows bare panel background on load.
    */
    const onLoadedData = () => drawFrame();
    video.addEventListener("loadeddata", onLoadedData);
    if (video.readyState >= 2) drawFrame();

    if (reduced) return;

    const tick = () => {
      frame = requestAnimationFrame(tick);
      if (!duration) return;

      const rect = wrap.getBoundingClientRect();
      const pinRect = pin.getBoundingClientRect();

      /*
        Keep the bitmap matched to the panel.

        The canvas has a fixed pixel buffer, so if the panel resizes and the buffer is
        not rebuilt, CSS stretches the old bitmap to the new box and the whole hero is
        distorted. A window resize listener misses cases where the panel changes on its
        own, and a ResizeObserver is the usual answer but cannot be relied on alone.
        The loop already measures the panel every frame, so comparing two numbers here
        costs nothing and covers every case.
      */
      const dprNow = Math.min(window.devicePixelRatio || 1, 2);
      const wantW = Math.round(pinRect.width * dprNow);
      const wantH = Math.round(pinRect.height * dprNow);
      if (wantW > 0 && wantH > 0 && (canvas.width !== wantW || canvas.height !== wantH)) {
        resizeCanvas();
        if (video.readyState >= 2) drawFrame();
        else if (posterDrawn) drawSource(posterImg, posterImg.naturalWidth, posterImg.naturalHeight);
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
      if (video.readyState >= 2) drawFrame();
      else if (posterDrawn) drawSource(posterImg, posterImg.naturalWidth, posterImg.naturalHeight);
    };
    window.addEventListener("resize", handleResize);

    const observer = new ResizeObserver(handleResize);
    observer.observe(pin);

    return () => {
      cancelAnimationFrame(frame);
      video.removeEventListener("loadedmetadata", readDuration);
      video.removeEventListener("loadeddata", onLoadedData);
      video.removeEventListener("seeked", onSeeked);
      video.pause();
      video.src = "";
      window.removeEventListener("resize", handleResize);
      observer.disconnect();
    };
  }, []);

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
