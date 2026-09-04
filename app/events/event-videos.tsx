"use client";

import { useEffect, useRef, useState, useCallback, useSyncExternalStore } from "react";

interface VideoItem {
  id: string;
  src: string;
  title: string;
  subtitle: string;
  caption: string;
  badge: string;
}

const EVENT_VIDEOS: VideoItem[] = [
  {
    id: "mayor-visit",
    src: "/events/mayor-visit.mp4",
    title: "Mayor's Address",
    subtitle: "Township of Union",
    caption: "Mayor Patricia Guerra-Frazier addressing neighbors and local business owners at Deaf Shark Coffee.",
    badge: "Special Visit",
  },
  {
    id: "salsa-night",
    src: "/events/salsa-night.mp4",
    title: "Salsa & Networking",
    subtitle: "Music & Dancing",
    caption: "Salsa and Networking night with dancing and music on the pavilion.",
    badge: "Community Night",
  },
];

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

function captionsTrack(caption: string): string {
  const vtt = `WEBVTT\n\n00:00:00.000 --> 00:59:59.000\n${caption}\n`;
  return `data:text/vtt;charset=utf-8,${encodeURIComponent(vtt)}`;
}

const subscribeToMount = () => () => {};

function useMounted(): boolean {
  return useSyncExternalStore(subscribeToMount, () => true, () => false);
}

export function EventVideos() {
  const mounted = useMounted();
  const [popoutIndex, setPopoutIndex] = useState<number | null>(null);
  const [popoutTime, setPopoutTime] = useState<number>(0);
  const [popoutAutoPlay, setPopoutAutoPlay] = useState<boolean>(true);

  // References for inline videos to sync timestamps
  const inlineRefs = useRef<(HTMLVideoElement | null)[]>([]);

  const openPopout = useCallback((index: number) => {
    const inlineEl = inlineRefs.current[index];
    if (inlineEl) {
      setPopoutTime(inlineEl.currentTime || 0);
      const isPlaying = !inlineEl.paused;
      setPopoutAutoPlay(isPlaying || true);
      inlineEl.pause();
    } else {
      setPopoutTime(0);
      setPopoutAutoPlay(true);
    }
    setPopoutIndex(index);
  }, []);

  const closePopout = useCallback((lastTime?: number) => {
    if (popoutIndex !== null) {
      const inlineEl = inlineRefs.current[popoutIndex];
      if (inlineEl) {
        if (typeof lastTime === "number") inlineEl.currentTime = lastTime;
        inlineEl.muted = true;
        inlineEl.play().catch(() => {});
      }
    }
    setPopoutIndex(null);
  }, [popoutIndex]);

  return (
    <>
      <div className="ev-films">
        {EVENT_VIDEOS.map((item, idx) => (
          <InlineVideoCard
            key={item.id}
            item={item}
            mounted={mounted}
            videoRef={(el) => { inlineRefs.current[idx] = el; }}
            onExpand={() => openPopout(idx)}
          />
        ))}
      </div>

      {popoutIndex !== null && (
        <PopoutVideoModal
          videos={EVENT_VIDEOS}
          currentIndex={popoutIndex}
          initialTime={popoutTime}
          initialPlay={popoutAutoPlay}
          onIndexChange={(newIdx) => setPopoutIndex(newIdx)}
          onClose={closePopout}
        />
      )}
    </>
  );
}

interface InlineVideoCardProps {
  item: VideoItem;
  mounted: boolean;
  videoRef: (el: HTMLVideoElement | null) => void;
  onExpand: () => void;
}

function InlineVideoCard({ item, mounted, videoRef, onExpand }: InlineVideoCardProps) {
  const localRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  const handleVideoRef = (el: HTMLVideoElement | null) => {
    localRef.current = el;
    videoRef(el);
  };

  const togglePlay = () => {
    const v = localRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const v = localRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setIsMuted(v.muted);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = localRef.current;
    if (!v) return;
    const seekTo = parseFloat(e.target.value);
    v.currentTime = seekTo;
    setCurrentTime(seekTo);
  };

  return (
    <figure className="ev-mayor-film">
      {mounted ? (
        <div
          className={`ev-custom-video-wrap ${isPlaying ? "is-playing" : "is-paused"} ${isHovered ? "is-hovered" : ""}`}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <video
            ref={handleVideoRef}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            onClick={togglePlay}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onTimeUpdate={() => {
              if (localRef.current) {
                setCurrentTime(localRef.current.currentTime);
              }
            }}
            onLoadedMetadata={() => {
              if (localRef.current) {
                setDuration(localRef.current.duration);
              }
            }}
            aria-label={item.caption}
          >
            <source src={item.src} type="video/mp4" />
            <track kind="captions" srcLang="en" label="English" src={captionsTrack(item.caption)} />
          </video>

          {/* Big Center Play Button when Paused */}
          <button
            type="button"
            className="ev-center-play-btn"
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause video" : "Play video"}
          >
            {isPlaying ? (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Bottom Controls Bar on the video */}
          <div className="ev-video-controls-overlay">
            <div className="ev-scrubber-row">
              <input
                type="range"
                min={0}
                max={duration || 100}
                step={0.1}
                value={currentTime}
                onChange={handleSeek}
                className="ev-scrubber-input"
                aria-label="Video timeline scrubber"
                style={{
                  backgroundSize: `${duration > 0 ? (currentTime / duration) * 100 : 0}% 100%`,
                }}
              />
            </div>
            <div className="ev-controls-row">
              <div className="ev-controls-left">
                <button
                  type="button"
                  className="ev-ctrl-btn"
                  onClick={togglePlay}
                  aria-label={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? (
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                  )}
                </button>
                <button
                  type="button"
                  className="ev-ctrl-btn"
                  onClick={toggleMute}
                  aria-label={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
                      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
                      <line x1="12" y1="19" x2="12" y2="23"></line>
                      <line x1="8" y1="23" x2="16" y2="23"></line>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                    </svg>
                  )}
                </button>
                <span className="ev-time-text">
                  {formatTime(currentTime)} <span className="ev-time-divider">/</span> {formatTime(duration)}
                </span>
              </div>
              <div className="ev-controls-right">
                <button
                  type="button"
                  className="ev-ctrl-btn ev-expand-btn"
                  onClick={onExpand}
                  title="Popout Full View"
                  aria-label="Popout full view"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="ev-video-loading" aria-hidden="true" />
      )}
      <figcaption>{item.caption}</figcaption>
    </figure>
  );
}

interface PopoutModalProps {
  videos: VideoItem[];
  currentIndex: number;
  initialTime: number;
  initialPlay: boolean;
  onIndexChange: (idx: number) => void;
  onClose: (lastTime?: number) => void;
}

function PopoutVideoModal({
  videos,
  currentIndex,
  initialTime,
  initialPlay,
  onIndexChange,
  onClose,
}: PopoutModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(initialPlay);
  const [currentTime, setCurrentTime] = useState(initialTime);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const currentVideo = videos[currentIndex];

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      v.pause();
      setIsPlaying(false);
      setShowControls(true);
    }
  }, []);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setIsMuted(v.muted);
  }, []);

  const goToNext = useCallback(() => {
    const nextIdx = (currentIndex + 1) % videos.length;
    onIndexChange(nextIdx);
  }, [currentIndex, onIndexChange, videos.length]);

  const goToPrev = useCallback(() => {
    const prevIdx = (currentIndex - 1 + videos.length) % videos.length;
    onIndexChange(prevIdx);
  }, [currentIndex, onIndexChange, videos.length]);

  // Lock body scroll while popout modal is open
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // Setup video on mount or index switch
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = initialTime;
    v.muted = false;
    setIsMuted(false);
    if (initialPlay) {
      v.play().catch(() => {});
    }
  }, [currentIndex, initialPlay, initialTime]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose(videoRef.current?.currentTime);
      } else if (e.key === " " || e.key === "k") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "m" || e.key === "M") {
        toggleMute();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (videoRef.current) {
          videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
        }
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (videoRef.current) {
          videoRef.current.currentTime = Math.min(
            videoRef.current.duration || 100,
            videoRef.current.currentTime + 5
          );
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        goToPrev();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        goToNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToNext, goToPrev, onClose, toggleMute, togglePlay]);

  const resetControlsTimer = () => {
    setShowControls(true);
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    if (isPlaying) {
      hideTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v) return;
    const val = parseFloat(e.target.value);
    v.currentTime = val;
    setCurrentTime(val);
  };

  return (
    <div className="ev-popout-overlay" onMouseMove={resetControlsTimer}>
      {/* Blurred Backdrop - website remains visible on left and right behind the blur */}
      <button
        type="button"
        className="ev-popout-backdrop"
        onClick={() => onClose(videoRef.current?.currentTime)}
        aria-label="Close video popout"
        style={{ border: 0, padding: 0 }}
      />

      {/* Main Popout Content Frame */}
      <div className="ev-popout-stage">
        {/* Navigation Arrows for Previous / Next video */}
        {videos.length > 1 && (
          <>
            <button
              type="button"
              className="ev-popout-nav-btn ev-popout-prev"
              onClick={goToPrev}
              title="Previous Video"
              aria-label="Previous Video"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
            <button
              type="button"
              className="ev-popout-nav-btn ev-popout-next"
              onClick={goToNext}
              title="Next Video"
              aria-label="Next Video"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </>
        )}

        {/* Video Player Card with ratio-preserved 9:16 vertical styling */}
        <div
          className={`ev-popout-card ${showControls ? "controls-visible" : "controls-hidden"} ${
            isPlaying ? "is-playing" : "is-paused"
          }`}
        >
          <video
            ref={videoRef}
            src={currentVideo.src}
            autoPlay
            muted={isMuted}
            playsInline
            preload="metadata"
            onClick={togglePlay}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onTimeUpdate={() => {
              if (videoRef.current) {
                setCurrentTime(videoRef.current.currentTime);
              }
            }}
            onLoadedMetadata={() => {
              if (videoRef.current) {
                setDuration(videoRef.current.duration);
              }
            }}
            aria-label={currentVideo.caption}
          >
            <track kind="captions" srcLang="en" label="English" src={captionsTrack(currentVideo.caption)} />
          </video>

          {/* Center Play/Pause Ripple Indicator */}
          {!isPlaying && (
            <button
              type="button"
              className="ev-popout-center-play"
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              aria-label="Play video"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
          )}

          {/* Top Bar on the video itself */}
          <div className="ev-popout-top-bar">
            <div className="ev-popout-title-box">
              <h3 className="ev-popout-title">{currentVideo.title}</h3>
            </div>
            <div className="ev-popout-actions-top">
              <span className="ev-popout-counter">
                {currentIndex + 1} / {videos.length}
              </span>
              <button
                type="button"
                className="ev-popout-close-btn"
                onClick={() => onClose(videoRef.current?.currentTime)}
                title="Close popout (Esc)"
                aria-label="Close popout"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>

          {/* Bottom Controls Bar on the video itself */}
          <div className="ev-popout-bottom-bar">
            {/* Timeline Scrubber */}
            <div className="ev-scrubber-row">
              <input
                type="range"
                min={0}
                max={duration || 100}
                step={0.1}
                value={currentTime}
                onChange={handleSeek}
                className="ev-scrubber-input ev-popout-scrubber"
                aria-label="Video timeline scrubber"
                style={{
                  backgroundSize: `${duration > 0 ? (currentTime / duration) * 100 : 0}% 100%`,
                }}
              />
            </div>

            {/* Bottom Controls Controls Row */}
            <div className="ev-controls-row">
              <div className="ev-controls-left">
                <button
                  type="button"
                  className="ev-ctrl-btn"
                  onClick={togglePlay}
                  aria-label={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? (
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                  )}
                </button>

                <button
                  type="button"
                  className="ev-ctrl-btn"
                  onClick={toggleMute}
                  aria-label={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
                      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
                      <line x1="12" y1="19" x2="12" y2="23"></line>
                      <line x1="8" y1="23" x2="16" y2="23"></line>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                    </svg>
                  )}
                </button>

                <span className="ev-time-text">
                  {formatTime(currentTime)} <span className="ev-time-divider">/</span> {formatTime(duration)}
                </span>
              </div>

              <div className="ev-controls-right">
                <button
                  type="button"
                  className="ev-ctrl-btn ev-exit-popout-btn"
                  onClick={() => onClose(videoRef.current?.currentTime)}
                  title="Exit Theater Mode (Esc)"
                  aria-label="Exit theater mode"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="4 14 10 14 10 20"></polyline>
                    <polyline points="20 10 14 10 14 4"></polyline>
                    <line x1="14" y1="10" x2="21" y2="3"></line>
                    <line x1="3" y1="21" x2="10" y2="14"></line>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
