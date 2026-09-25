"use client";

import { useEffect, useRef } from "react";
import { startHeroFrames } from "./hero-frames";

type ScrollHeroProps = {
  poster?: string;
  scrollHeights?: number;
  children?: React.ReactNode;
};

const BACKDROP = "#1a0f0a";

export default function ScrollHero({
  poster = "/hero-scrub-poster.jpg",
  scrollHeights = 3,
  children,
}: ScrollHeroProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const pin = pinRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !pin || !canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    // Choose a memory budget once per mount; resizing never downloads both sets.
    const mobile = window.matchMedia("(max-width: 767px)").matches;
    const posterImg = new Image();
    posterImg.src = poster;
    let zoom = 1;
    let focusX = 0.5;
    let focusY = 0.5;
    let offsetY = 0;
    let fit = 0;
    let mirrorEdges = true;
    let coverArm = true;

    const refresh = () => {
      const rect = canvas.getBoundingClientRect();
      // The source has a fixed resolution. Avoid a multi-megapixel retina
      // backing store that adds raster cost without adding footage detail.
      // Mobile frames are 330px wide, so a 1x canvas already holds every source
      // pixel and halves the per-frame fill cost while scrolling.
      const ratio = Math.min(window.devicePixelRatio || 1, 1,
        (mobile ? 1440 : 1920) / Math.max(rect.width, rect.height, 1));
      const width = Math.max(1, Math.round(rect.width * ratio));
      const height = Math.max(1, Math.round(rect.height * ratio));
      const changed = canvas.width !== width || canvas.height !== height;
      if (changed) { canvas.width = width; canvas.height = height; }
      const style = getComputedStyle(canvas);
      const readVar = (name: string, fallback: number) => {
        const value = parseFloat(style.getPropertyValue(name));
        return Number.isFinite(value) ? value : fallback;
      };
      zoom = Math.min(Math.max(readVar("--hero-zoom", 1), 0.2), 2);
      focusX = Math.min(Math.max(readVar("--hero-focus-x", 0.5), 0), 1);
      focusY = Math.min(Math.max(readVar("--hero-focus-y", 0.5), 0), 1);
      offsetY = Math.min(Math.max(readVar("--hero-offset-y", 0), -0.5), 0.5);
      fit = Math.min(Math.max(readVar("--hero-fit", 0), 0), 1);
      mirrorEdges = readVar("--hero-mirror", 1) > 0.5;
      coverArm = readVar("--hero-arm-cover", 1) > 0.5;
      return changed;
    };
    refresh();

    const drawSource = (source: CanvasImageSource, sw: number, sh: number, sx = 0, sy = 0) => {
      if (!sw || !sh) return;
      const cw = canvas.width;
      const ch = canvas.height;
      if (!cw || !ch) return;
      const contain = Math.min(cw / sw, ch / sh);
      const cover = Math.max(cw / sw, ch / sh);
      const scale = (contain + (cover - contain) * fit) * zoom;
      const dw = sw * scale;
      const dh = sh * scale;
      const dx = (cw - dw) * focusX;
      const dy = (ch - dh) * focusY + ch * offsetY;

      ctx.fillStyle = BACKDROP;
      ctx.fillRect(0, 0, cw, ch);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "low";

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
        ctx.drawImage(source, sx + sxS, sy + syS, swS, shS, -0.5, -0.5, dwD + 1, dhD + 1);
        ctx.restore();
      };

      const srcL = Math.min(sw, dx / scale);
      const srcR = Math.min(sw, gapR / scale);
      const srcT = Math.min(sh, dy / scale);
      const srcB = Math.min(sh, gapB / scale);

      if (mirrorEdges) {
        if (dx > 0) mirror(0, 0, srcL, sh, 0, dy, dx, dh, true, false);
        if (gapR > 0) mirror(sw - srcR, 0, srcR, sh, dx + dw, dy, gapR, dh, true, false);
        if (dy > 0) mirror(0, 0, sw, srcT, dx, 0, dw, dy, false, true);
        if (gapB > 0) mirror(0, sh - srcB, sw, srcB, dx, dy + dh, dw, gapB, false, true);

        if (dx > 0 && dy > 0) mirror(0, 0, srcL, srcT, 0, 0, dx, dy, true, true);
        if (gapR > 0 && dy > 0) mirror(sw - srcR, 0, srcR, srcT, dx + dw, 0, gapR, dy, true, true);
        if (dx > 0 && gapB > 0) mirror(0, sh - srcB, srcL, srcB, 0, dy + dh, dx, gapB, true, true);
      } else {
        ctx.fillStyle = BACKDROP;
        ctx.fillRect(0, 0, cw, ch);
      }
      ctx.drawImage(source, sx, sy, sw, sh, dx, dy, dw, dh);

      /* Fade the bottom edge of the footage into the backdrop so the frame does
         not end on a hard line when the espresso fills the space below it. */
      if (!mirrorEdges && gapB > 0) {
        const fade = Math.min(dh * 0.35, 160);
        const blend = ctx.createLinearGradient(0, dy + dh - fade, 0, dy + dh);
        blend.addColorStop(0, "rgba(26, 15, 10, 0)");
        blend.addColorStop(1, BACKDROP);
        ctx.fillStyle = blend;
        ctx.fillRect(dx, dy + dh - fade, dw, fade + 1);
      }

      if (coverArm && gapB > 0) {
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

    const start = () => startHeroFrames(wrap, pin, drawSource, refresh, posterImg, motion.matches, mobile);
    let stop = start();
    const motionChanged = () => { stop(); stop = start(); };
    motion.addEventListener("change", motionChanged);
    return () => { stop(); motion.removeEventListener("change", motionChanged); };
  }, [poster]);

  return (
    <div
      ref={wrapRef}
      className="scroll-hero-wrap relative w-full"
      style={{ "--hero-scroll-height": `${scrollHeights * 100}vh` } as React.CSSProperties}
    >
      <div
        ref={pinRef}
        className="scroll-hero-pin w-full overflow-hidden"
      >
        <img
          className="scroll-hero-poster-fill"
          src={poster}
          alt=""
          aria-hidden="true"
          loading="eager"
          decoding="sync"
          fetchPriority="high"
        />
        <img
          className="scroll-hero-poster"
          src={poster}
          alt=""
          aria-hidden="true"
          loading="eager"
          decoding="sync"
          fetchPriority="high"
        />
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
