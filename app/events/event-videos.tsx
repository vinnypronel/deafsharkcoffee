"use client";

import { useEffect, useState } from "react";

export function EventVideos() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="ev-films">
      <figure className="ev-mayor-film">
        {mounted ? (
          <video
            controls
            playsInline
            preload="metadata"
            aria-label="Video of the Mayor of Union speaking at Deaf Shark Coffee"
          >
            <source src="/events/mayor-visit.mp4" type="video/mp4" />
          </video>
        ) : (
          <div className="ev-video-loading" aria-hidden="true" />
        )}
        <figcaption>Mayor Patricia Guerra-Frazier addressing neighbors and local business owners at Deaf Shark Coffee.</figcaption>
      </figure>
      <figure className="ev-mayor-film">
        {mounted ? (
          <video
            controls
            playsInline
            preload="metadata"
            aria-label="Video from the Salsa and Networking night at Deaf Shark Coffee"
          >
            <source src="/events/salsa-night.mp4" type="video/mp4" />
          </video>
        ) : (
          <div className="ev-video-loading" aria-hidden="true" />
        )}
        <figcaption>Salsa and Networking night with dancing and music on the pavilion.</figcaption>
      </figure>
    </div>
  );
}
