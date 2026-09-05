"use client";

import { useEffect, useRef } from "react";

type ScrollHeroProps = {
  src?: string;
  /* Phones get a lighter cut of the same footage. */
  mobileSrc?: string;
  poster?: string;
  /* How many viewport heights of scroll the video is stretched across. */
  scrollHeights?: number;
  children?: React.ReactNode;
};

const SOURCE_FPS = 24;

/* Matches .scroll-hero-pin so the canvas fill and the CSS background agree. */
const BACKDROP = "#1a0f0a";

// Module-level cached media elements so navigating back to the home page is instantaneous
let cachedVideo: HTMLVideoElement | null = null;
let cachedVideoSource = "";
let cachedPoster: HTMLImageElement | null = null;
const seekableVideoUrls = new Map<string, string>();
const seekableVideoRequests = new Map<string, Promise<string>>();

/* The production asset server currently answers MP4 range requests with the
   entire file. Chromium can display that response, but it does not consistently
   expose a seekable timeline for scroll scrubbing. Fetch the small clip once and
   use a blob URL so every browser gets a genuinely local, seekable media source. */
function getSeekableVideoUrl(src: string): Promise<string> {
  const ready = seekableVideoUrls.get(src);
  if (ready) return Promise.resolve(ready);

  const pending = seekableVideoRequests.get(src);
  if (pending) return pending;

  const request = fetch(src, { cache: "force-cache" })
    .then((response) => {
      if (!response.ok) throw new Error(`Unable to cache hero video (${response.status})`);
      return response.blob();
    })
    .then((blob) => {
      const url = URL.createObjectURL(blob);
      seekableVideoUrls.set(src, url);
      return url;
    })
    .finally(() => {
      seekableVideoRequests.delete(src);
    });

  seekableVideoRequests.set(src, request);
  return request;
}

/* The head script starts fetching the footage during document parse. Adopting its
   element here means the scrub never waits on a second request after hydration. */
type HeroPreload = {
  __heroScrubVideo?: HTMLVideoElement;
  __heroScrubSrc?: string;
  __heroScrubPoster?: HTMLImageElement;
};

/* iOS Safari will not decode a video element that is detached from the document,
   so drawImage paints nothing and the scrub appears frozen on the poster. Keep the
   element in the DOM at one pixel instead of off-DOM. display:none and
   visibility:hidden both stop decoding, so it has to stay technically visible. */
function attachOffscreen(video: HTMLVideoElement) {
  if (video.isConnected) return;
  video.setAttribute("playsinline", "");
  video.setAttribute("webkit-playsinline", "");
  video.setAttribute("muted", "");
  video.style.cssText = [
    "position:fixed",
    "top:0",
    "left:0",
    "width:1px",
    "height:1px",
    "opacity:0.01",
    "pointer-events:none",
    "z-index:-1",
  ].join(";");
  document.body.appendChild(video);
}

function getSharedVideo(src: string): HTMLVideoElement | null {
  if (typeof document === "undefined") return null;
  const preloaded = (window as unknown as HeroPreload).__heroScrubVideo;
  const preloadedSrc = (window as unknown as HeroPreload).__heroScrubSrc;
  if (!cachedVideo && preloaded && preloadedSrc === src) {
    cachedVideo = preloaded;
    cachedVideoSource = src;
  }
  if (!cachedVideo) {
    cachedVideo = document.createElement("video");
    cachedVideo.src = src;
    cachedVideoSource = src;
    cachedVideo.muted = true;
    cachedVideo.playsInline = true;
    cachedVideo.preload = "auto";
    cachedVideo.load();
  } else if (cachedVideoSource !== src) {
    cachedVideo.pause();
    cachedVideo.src = src;
    cachedVideoSource = src;
    cachedVideo.load();
  }
  cachedVideo.preload = "auto";
  cachedVideo.muted = true;
  cachedVideo.playsInline = true;
  /* This element is a frame source, not a normal autoplaying video. Safari can
     restore media playback state across reloads, so always reclaim it paused. */
  cachedVideo.autoplay = false;
  cachedVideo.loop = false;
  cachedVideo.removeAttribute("autoplay");
  cachedVideo.removeAttribute("loop");
  cachedVideo.pause();
  attachOffscreen(cachedVideo);
  return cachedVideo;
}

function getSharedPoster(poster: string): HTMLImageElement | null {
  if (typeof document === "undefined") return null;
  const preloaded = (window as unknown as HeroPreload).__heroScrubPoster;
  if (!cachedPoster && preloaded && preloaded.src.endsWith(poster)) {
    cachedPoster = preloaded;
  }
  if (!cachedPoster || (!cachedPoster.src.endsWith(poster) && cachedPoster.src !== poster)) {
    cachedPoster = new Image();
    cachedPoster.src = poster;
  }
  return cachedPoster;
}

export default function ScrollHero({
  src = "/hero-scrub.mp4",
  mobileSrc = "/hero-scrub-mobile.mp4",
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

    // Matches the preload links in the document head, so the picked file is the
    // one already in the HTTP cache. Resolved once so a resize never refetches.
    const chosenSrc = window.matchMedia("(max-width: 767px)").matches ? mobileSrc : src;

    // Use cached video off-DOM so browser keeps decode cache and extensions cannot detect it
    const video = getSharedVideo(chosenSrc);
    if (!video) return;
    videoRef.current = video;
    video.pause();
    try { video.currentTime = 0; } catch { /* Metadata may not be ready yet. */ }

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

    let zoom = 1;
    let focusX = 0.5;
    let focusY = 0.5;
    let offsetY = 0;
    let fit = 0;
    let mirrorEdges = true;
    let coverArm = true;
    let pinTop = 0;

    const refreshVars = () => {
      const style = getComputedStyle(canvas);
      const readVar = (name: string, fallback: number) => {
        const v = parseFloat(style.getPropertyValue(name));
        return Number.isFinite(v) ? v : fallback;
      };
      zoom = Math.min(Math.max(readVar("--hero-zoom", 1), 0.2), 2);
      focusX = Math.min(Math.max(readVar("--hero-focus-x", 0.5), 0), 1);
      focusY = Math.min(Math.max(readVar("--hero-focus-y", 0.5), 0), 1);
      offsetY = Math.min(Math.max(readVar("--hero-offset-y", 0), -0.5), 0.5);
      fit = Math.min(Math.max(readVar("--hero-fit", 0), 0), 1);
      /* --hero-mirror: 0 fills empty space with the espresso backdrop instead of a
         mirrored copy of the footage, so the frame can sit high with colour below. */
      mirrorEdges = readVar("--hero-mirror", 1) > 0.5;
      coverArm = readVar("--hero-arm-cover", 1) > 0.5;
      pinTop = parseFloat(getComputedStyle(pin).top) || 0;
    };
    refreshVars();

    const drawSource = (source: CanvasImageSource, sw: number, sh: number) => {
      if (!sw || !sh) return;
      resizeCanvas();
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
      ctx.drawImage(source, dx, dy, dw, dh);

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

    /* Browsers drop readyState below HAVE_CURRENT_DATA while a seek is in flight.
       The scrub seeks on nearly every scroll frame, so falling back to the poster
       here strobes between the still and the footage. Once a real frame has been
       painted, keep the last good one on the canvas instead. */
    let hasVideoFrame = false;
    const drawFrame = () => {
      if (video.readyState >= 2 && video.videoWidth > 0) {
        drawSource(video, video.videoWidth, video.videoHeight);
        hasVideoFrame = true;
        return;
      }
      if (hasVideoFrame) return;
      if (posterImg.complete && posterImg.naturalWidth > 0) {
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
      if (window.scrollY <= 1) {
        current = 0;
        try { video.currentTime = 0; } catch { /* The first seek will retry. */ }
      }
    };
    readDuration();
    video.addEventListener("loadedmetadata", readDuration);

    const onLoadedData = () => {
      seeking = false;
      drawFrame();
    };
    video.addEventListener("loadeddata", onLoadedData);
    if (video.readyState >= 2) drawFrame();

    /* iOS also refuses to produce frames from a video that has never played, even
       once it is attached. A muted inline play followed by an immediate pause
       primes the decoder without the footage ever being seen or heard. */
    let primed = false;
    let decoderPriming = false;
    const stopUnexpectedPlayback = () => {
      if (!decoderPriming && !video.paused) video.pause();
    };
    video.addEventListener("play", stopUnexpectedPlayback);

    const primeDecoder = () => {
      if (primed) return;
      primed = true;
      decoderPriming = true;
      const started = video.play();
      if (started && typeof started.then === "function") {
        started.then(() => {
          video.pause();
          decoderPriming = false;
          if (window.scrollY <= 1) {
            current = 0;
            try { video.currentTime = 0; } catch { /* A later scrub will seek. */ }
          }
          drawFrame();
        }).catch(() => {
          /* Autoplay refused. Retry on the first real interaction below. */
          decoderPriming = false;
          primed = false;
        });
      } else {
        video.pause();
        decoderPriming = false;
      }
    };
    primeDecoder();
    const primeOnGesture = () => primeDecoder();
    window.addEventListener("touchstart", primeOnGesture, { passive: true, once: true });
    window.addEventListener("pointerdown", primeOnGesture, { passive: true, once: true });

    type FrameCallbackVideo = HTMLVideoElement & {
      requestVideoFrameCallback?: (cb: () => void) => number;
      cancelVideoFrameCallback?: (handle: number) => void;
      fastSeek?: (time: number) => void;
    };
    const frameVideo = video as FrameCallbackVideo;
    let videoFrameHandle = 0;
    const onVideoFrame = () => {
      drawFrame();
      if (frameVideo.requestVideoFrameCallback) {
        videoFrameHandle = frameVideo.requestVideoFrameCallback(onVideoFrame);
      }
    };
    if (frameVideo.requestVideoFrameCallback) {
      videoFrameHandle = frameVideo.requestVideoFrameCallback(onVideoFrame);
    }

    if (reduced) {
      return () => {
        video.pause();
        video.removeEventListener("loadedmetadata", readDuration);
        video.removeEventListener("loadeddata", onLoadedData);
        video.removeEventListener("play", stopUnexpectedPlayback);
        window.removeEventListener("touchstart", primeOnGesture);
        window.removeEventListener("pointerdown", primeOnGesture);
        if (videoFrameHandle && frameVideo.cancelVideoFrameCallback) {
          frameVideo.cancelVideoFrameCallback(videoFrameHandle);
        }
      };
    }

    let seekIssuedAt = 0;
    let lastFrameAt = performance.now();

    const tick = () => {
      frame = 0;

      const rect = wrap.getBoundingClientRect();
      const heroIsNearViewport = rect.bottom > -100 && rect.top < window.innerHeight + 100;
      if (document.visibilityState === "hidden" || !heroIsNearViewport) {
        video.pause();
        return;
      }

      frame = requestAnimationFrame(tick);

      /* Native mobile media restoration must never turn this scrub source into
         free-running playback. Scrolling advances it only through exact seeks. */
      if (!decoderPriming && !video.paused) video.pause();

      // A seek that never reports back must not wedge the scrub permanently.
      if (seeking && performance.now() - seekIssuedAt > 250) seeking = false;

      if (!duration) {
        readDuration();
        return;
      }

      const pinRect = pin.getBoundingClientRect();

      const dprNow = Math.min(window.devicePixelRatio || 1, 2);
      const wantW = Math.round(pinRect.width * dprNow);
      const wantH = Math.round(pinRect.height * dprNow);
      if (wantW > 0 && wantH > 0 && (canvas.width !== wantW || canvas.height !== wantH)) {
        resizeCanvas();
        drawFrame();
      }
      const total = rect.height - pinRect.height;
      const progress = total <= 0 ? 0 : Math.min(Math.max((pinTop - rect.top) / total, 0), 1);

      let target = progress * (duration - 0.05);

      /* Until the whole clip is buffered, seeking past the loaded range stalls and
         the frame appears to freeze mid-scroll. Ride the buffered edge instead so
         the footage keeps moving and catches up as the rest arrives. */
      if (video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        if (bufferedEnd < duration - 0.05) {
          target = Math.min(target, Math.max(0, bufferedEnd - 0.05));
        }
      }

      /* Frame-rate independent easing. A fixed per-frame fraction converges twice
         as fast on a 120Hz display as on 60Hz, which is why the feel varied. */
      const now = performance.now();
      const deltaMs = Math.min(now - lastFrameAt, 100);
      lastFrameAt = now;
      current += (target - current) * (1 - Math.pow(1 - 0.22, deltaMs / 16.67));

      const frameIndex = Math.round(current * SOURCE_FPS);
      const seekTo = Math.min(Math.max(frameIndex / SOURCE_FPS, 0), duration - 0.001);
      const halfFrame = 0.5 / SOURCE_FPS;
      if (!seeking && video.seekable.length > 0 && Math.abs(seekTo - video.currentTime) > halfFrame) {
        seeking = true;
        seekIssuedAt = performance.now();
        /* fastSeek snaps to the nearest keyframe, which shows up as the footage
           jumping backwards mid-scroll. Exact seeking is worth the extra cost. */
        video.currentTime = seekTo;
      }
    };

    const onSeeked = () => {
      seeking = false;
      drawFrame();
    };
    const onError = () => { seeking = false; };
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("error", onError);

    const ensureTicking = () => {
      if (!frame) frame = requestAnimationFrame(tick);
    };

    ensureTicking();
    window.addEventListener("scroll", ensureTicking, { passive: true });

    let disposed = false;
    void getSeekableVideoUrl(chosenSrc).then((localUrl) => {
      if (disposed || videoRef.current !== video || cachedVideoSource !== chosenSrc) return;
      if (video.src === localUrl) return;

      /* Preserve the current scroll-derived time while changing sources. The
         loadedmetadata handler restores duration and the active animation frame
         performs the exact seek on the new, fully seekable timeline. */
      video.pause();
      duration = 0;
      seeking = false;
      video.src = localUrl;
      video.preload = "auto";
      video.load();
      ensureTicking();
    }).catch(() => {
      /* Keep the direct media URL as a graceful fallback if caching is blocked. */
      ensureTicking();
    });

    const handleResize = () => {
      refreshVars();
      resizeCanvas();
      drawFrame();
      ensureTicking();
    };
    window.addEventListener("resize", handleResize);

    const stopForPageState = () => {
      video.pause();
      if (document.visibilityState === "hidden") {
        seeking = false;
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
      } else {
        lastFrameAt = performance.now();
        ensureTicking();
      }
    };
    const resetForPageExit = () => {
      video.pause();
      current = 0;
      try { video.currentTime = 0; } catch { /* The next mount also resets it. */ }
    };
    document.addEventListener("visibilitychange", stopForPageState);
    window.addEventListener("pagehide", resetForPageExit);

    const observer = new ResizeObserver(handleResize);
    observer.observe(pin);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      video.pause();
      video.removeEventListener("loadedmetadata", readDuration);
      video.removeEventListener("loadeddata", onLoadedData);
      video.removeEventListener("play", stopUnexpectedPlayback);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", ensureTicking);
      document.removeEventListener("visibilitychange", stopForPageState);
      window.removeEventListener("pagehide", resetForPageExit);
      window.removeEventListener("touchstart", primeOnGesture);
      window.removeEventListener("pointerdown", primeOnGesture);
      observer.disconnect();
      if (videoFrameHandle && frameVideo.cancelVideoFrameCallback) {
        frameVideo.cancelVideoFrameCallback(videoFrameHandle);
      }
    };
  }, [src, mobileSrc, poster]);

  return (
    <div
      ref={wrapRef}
      className="relative w-full"
      style={{ height: `${scrollHeights * 100}vh` }}
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
