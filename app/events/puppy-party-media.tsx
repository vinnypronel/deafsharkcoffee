"use client";

import { useState } from "react";

export function PuppyPartyMedia() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="ev-featured-media ev-puppy-media">
      {/* Top primary image - always visible */}
      <figure className="ev-featured-shot ev-featured-shot-tall ev-puppy-main-shot">
        <img
          src="/events/puppy-party-dogs-01.jpg"
          alt="Two dachshunds dressed for the Puppy Party"
          loading="lazy"
        />
      </figure>

      {/* Dropdown images - toggled on tablet & mobile, inline on desktop */}
      <div
        id="puppy-extra-photos"
        className={`ev-puppy-extra-shots ${expanded ? "is-expanded" : ""}`}
      >
        <figure className="ev-featured-shot">
          <img
            src="/events/puppy-party-dogs-02.jpg"
            alt="Two Puppy Party guests looking up at the camera"
            loading="lazy"
          />
        </figure>
        <figure className="ev-featured-shot">
          <img
            src="/events/puppy-party-menu.jpg"
            alt="Kanelo's Cravings dog menu at the Puppy Party"
            loading="lazy"
          />
        </figure>
      </div>

      {/* View more / Show less toggle button - tablet and mobile only */}
      <button
        type="button"
        className={`ev-puppy-toggle-btn ${expanded ? "is-expanded" : ""}`}
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        aria-controls="puppy-extra-photos"
      >
        <span>{expanded ? "Show less" : "View more photos"}</span>
        <svg
          className="ev-puppy-toggle-arrow"
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
    </div>
  );
}
