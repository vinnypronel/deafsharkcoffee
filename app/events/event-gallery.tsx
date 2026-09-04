"use client";

import { useState, useEffect, useCallback } from "react";

export interface GalleryPhoto {
  src: string;
  alt: string;
}

interface EventGalleryProps {
  photos: GalleryPhoto[];
}

export function EventGallery({ photos }: EventGalleryProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [direction, setDirection] = useState<"next" | "prev" | "none">("none");
  const [animKey, setAnimKey] = useState(0);

  const openLightbox = (index: number) => {
    setDirection("none");
    setActiveIndex(index);
    setAnimKey((prev) => prev + 1);
  };

  const closeLightbox = () => {
    setActiveIndex(null);
  };

  const goNext = useCallback(() => {
    if (activeIndex === null) return;
    setDirection("next");
    setActiveIndex((prev) => (prev! + 1) % photos.length);
    setAnimKey((prev) => prev + 1);
  }, [activeIndex, photos.length]);

  const goPrev = useCallback(() => {
    if (activeIndex === null) return;
    setDirection("prev");
    setActiveIndex((prev) => (prev! - 1 + photos.length) % photos.length);
    setAnimKey((prev) => prev + 1);
  }, [activeIndex, photos.length]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (activeIndex !== null) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [activeIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (activeIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeLightbox();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, goNext, goPrev]);

  const currentPhoto = activeIndex !== null ? photos[activeIndex] : null;

  return (
    <>
      <section className="ev-gallery">
        <div className="ev-gallery-head">
          <h2>Salsa and Networking, in photos.</h2>
        </div>
        <div className="ev-gallery-grid">
          {photos.map((shot, idx) => (
            <button
              type="button"
              key={shot.src}
              className="ev-shot"
              onClick={() => openLightbox(idx)}
              style={{ border: 0, padding: 0 }}
              aria-label={`View photo ${idx + 1}: ${shot.alt}`}
            >
              <img src={shot.src} alt={shot.alt} loading="lazy" />
              <div className="ev-shot-zoom-hint" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  <line x1="11" y1="8" x2="11" y2="14" />
                  <line x1="8" y1="11" x2="14" y2="11" />
                </svg>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Popout Lightbox Modal */}
      {activeIndex !== null && currentPhoto && (
        <div className="ev-lightbox-overlay">
          {/* Blurred Backdrop */}
          <button
            type="button"
            className="ev-lightbox-backdrop"
            onClick={closeLightbox}
            aria-label="Close lightbox"
            style={{ border: 0, padding: 0 }}
          />

          {/* Top Close Button */}
          <button
            type="button"
            className="ev-lightbox-close-btn"
            onClick={closeLightbox}
            title="Close (Esc)"
            aria-label="Close lightbox"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {/* Navigation Arrows positioned on the outside of the image (left & right sides of screen) */}
          <button
            type="button"
            className="ev-lightbox-arrow ev-lightbox-arrow-left"
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            title="Previous photo (Arrow Left)"
            aria-label="Previous photo"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <button
            type="button"
            className="ev-lightbox-arrow ev-lightbox-arrow-right"
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            title="Next photo (Arrow Right)"
            aria-label="Next photo"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          {/* Main Stage with Slide Animation */}
          <div className="ev-lightbox-stage">
            <div
              key={animKey}
              className={`ev-lightbox-card ${
                direction === "next" ? "slide-from-right" : direction === "prev" ? "slide-from-left" : "scale-fade-in"
              }`}
            >
              <img
                src={currentPhoto.src}
                alt={currentPhoto.alt}
                className="ev-lightbox-img"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
