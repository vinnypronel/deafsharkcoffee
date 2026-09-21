# Mobile Full-Screen Takeover Navbar & Hamburger Menu — Implementation Guide

This guide provides complete, step-by-step instructions for an AI coding agent or developer to build the **full-screen takeover mobile navigation menu** model. 

This model keeps the header bar (logo and morphing hamburger button) fixed at the top while smoothly revealing a full-screen navigation overlay underneath with staggered link animations, scroll locking, accessibility support, and short-screen adaptability.

All styles are **theme-agnostic** and use customizable CSS tokens / CSS variables so they automatically adapt to any website's color palette.

---

## 1. Architectural Overview

### Layering Model (Z-Index Strategy)
```text
┌────────────────────────────────────────────────────────┐
│ HEADER (position: sticky/fixed, top: 0, z-index: 50)   │
│  ├── Logo (stays visible on top)                       │
│  ├── Desktop Links (hidden on mobile)                  │
│  └── Hamburger Button (morphs into 'X', z-index: 50)   │
└────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────┐
│ FULL-SCREEN TAKEOVER (position: fixed, z-index: 40)    │
│ (inset: 0, padding-top: header-height, opacity & slide)│
│  ├── Staggered Big Navigation Links                    │
│  ├── Optional Actions (Theme toggle / CTA button)      │
│  └── Footer / Social Links Band                        │
└────────────────────────────────────────────────────────┘
```

- **Header (`z-index: 50`)**: Contains the brand logo and hamburger button. Remains visible even when the menu is open so the user can easily see their context and tap the "X" button.
- **Takeover Overlay (`z-index: 40`)**: Sits immediately below the header (`inset: 0`), with top padding equal to or slightly greater than header height. When closed, it is hidden (`opacity: 0; visibility: hidden; pointer-events: none;`). When open, it smoothly transitions in (`opacity: 1; visibility: visible; pointer-events: auto;`).

---

## 2. Core Functional Requirements

1. **Scroll Locking**:
   - When the menu opens: set `document.body.style.overflow = "hidden"` and `document.documentElement.style.overflow = "hidden"`.
   - When the menu closes or unmounts: restore previous overflow styles.
2. **Route Change Auto-Close**:
   - Automatically set `menuOpen = false` when the current pathname changes.
3. **Keyboard & Accessibility**:
   - Pressing <kbd>Escape</kbd> closes the menu.
   - Hamburger button has `aria-expanded={menuOpen}`, `aria-controls="mobile-nav-takeover"`, and dynamic `aria-label`.
   - Takeover container has `aria-hidden={!menuOpen}`.
   - Inactive links receive `tabIndex={menuOpen ? 0 : -1}` so keyboard users cannot focus hidden menu items when closed.
4. **Morphing 3-Bar Hamburger**:
   - 3 separate horizontal bars that smoothly morph into an "X":
     - Top bar: translates down and rotates `+45deg`.
     - Middle bar: fades out (`opacity: 0`) and shrinks (`scaleX(0)`).
     - Bottom bar: translates up and rotates `-45deg`.
5. **Staggered Link Reveal Animations**:
   - Links start slightly shifted down (`translateY(18px)`) with `opacity: 0`.
   - When menu opens, links animate into place with incremental `transition-delay` (e.g. 0.08s, 0.13s, 0.18s, etc.).
6. **Active & Hover Indicator**:
   - Active route and hovered links change to the accent color, optionally highlighted by decorative glyphs or underline effects.
7. **Short-Screen & Landscape Responsiveness**:
   - On short viewports (`@media (max-height: 600px)`), typography and gaps scale down proportionally (`clamp()` scaling) to prevent content cutoff.
8. **Reduced Motion**:
   - Includes `@media (prefers-reduced-motion: reduce)` to disable transition delays and animations for accessibility compliance.

---

## 3. Theme Tokens (CSS Variables)

Define or map these generic CSS variables in your global stylesheet (e.g., `:root`, `[data-theme="dark"]`, or Tailwind theme config):

```css
:root {
  /* Surface & Base Colors */
  --nav-bg: #ffffff;
  --nav-text: #111827;
  --nav-text-muted: #6b7280;
  --nav-accent: #2563eb;
  --nav-border: #e5e7eb;
  
  /* Overlay Ambient Glows (Optional radial gradients) */
  --nav-overlay-glow-1: rgba(37, 99, 235, 0.08);
  --nav-overlay-glow-2: rgba(16, 185, 129, 0.08);

  /* Fonts */
  --font-nav-heading: "Inter", sans-serif;
  --font-nav-links: "Inter", sans-serif;
}
```

---

## 4. Complete Generic Component (`Navbar.tsx`)

Here is the complete, drop-in React/Next.js component with zero hardcoded branding:

```tsx
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavLinkItem {
  label: string;
  href: string;
}

export interface SocialLinkItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

export interface NavbarProps {
  logo: React.ReactNode;
  navLinks: NavLinkItem[];
  socialLinks?: SocialLinkItem[];
  ctaButton?: React.ReactNode;
  themeToggle?: React.ReactNode;
  activeIndicatorGlyph?: string; // e.g. "✦" or "•"
}

export default function Navbar({
  logo,
  navLinks,
  socialLinks = [],
  ctaButton,
  themeToggle,
  activeIndicatorGlyph = "✦",
}: NavbarProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // 1. Auto-close on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // 2. Lock body/html scroll + Escape key listener
  useEffect(() => {
    if (!menuOpen) return;

    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  return (
    <header
      role="banner"
      className="nav-header"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        width: "100%",
        backgroundColor: "var(--nav-bg, #ffffff)",
        borderBottom: menuOpen
          ? "1px solid transparent"
          : "1px solid var(--nav-border, rgba(0,0,0,0.1))",
        transition: "background-color 0.3s ease, border-color 0.3s ease",
      }}
    >
      <style>{`
        /* ── Responsive Viewport Rules ── */
        .nav-desktop-menu { display: flex; align-items: center; gap: 28px; }
        .nav-cta-desktop   { display: flex; align-items: center; gap: 16px; }
        .nav-hamburger     { display: none; }

        @media (max-width: 1024px) {
          .nav-desktop-menu { display: none !important; }
          .nav-cta-desktop   { display: none !important; }
          .nav-hamburger     { display: flex !important; }
        }

        /* ── Full-Screen Takeover Container ── */
        .nav-fullscreen-takeover {
          position: fixed;
          inset: 0;
          z-index: 40;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          padding: 100px 24px 32px;
          background:
            radial-gradient(ellipse 80% 60% at 50% 40%, var(--nav-overlay-glow-1, transparent) 0%, transparent 70%),
            radial-gradient(ellipse 70% 50% at 50% 90%, var(--nav-overlay-glow-2, transparent) 0%, transparent 70%),
            var(--nav-bg, #ffffff);
          opacity: 0;
          visibility: hidden;
          pointer-events: none;
          transform: translateY(-8px);
          transition: opacity 0.4s ease, transform 0.45s cubic-bezier(0.22, 1, 0.36, 1), visibility 0.45s;
          overflow-y: auto;
        }

        .nav-fullscreen-takeover.open {
          opacity: 1;
          visibility: visible;
          pointer-events: auto;
          transform: none;
        }

        /* ── Takeover Nav Links List ── */
        .nav-fs-links {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          list-style: none;
          margin: 0;
          padding: 0;
        }

        .nav-fs-link {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          padding: 8px 16px;
          font-family: var(--font-nav-links, inherit);
          font-size: clamp(2rem, 8vw, 3.2rem);
          font-weight: 700;
          line-height: 1.15;
          letter-spacing: -0.01em;
          color: var(--nav-text, #111827);
          text-decoration: none;
          opacity: 0;
          transform: translateY(18px);
          transition: color 0.2s ease, opacity 0.45s ease, transform 0.45s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .nav-fullscreen-takeover.open .nav-fs-link {
          opacity: 1;
          transform: none;
        }

        /* Staggered Delay for Menu Links */
        .nav-fullscreen-takeover.open .nav-fs-links li:nth-child(1) .nav-fs-link { transition-delay: 0.08s; }
        .nav-fullscreen-takeover.open .nav-fs-links li:nth-child(2) .nav-fs-link { transition-delay: 0.13s; }
        .nav-fullscreen-takeover.open .nav-fs-links li:nth-child(3) .nav-fs-link { transition-delay: 0.18s; }
        .nav-fullscreen-takeover.open .nav-fs-links li:nth-child(4) .nav-fs-link { transition-delay: 0.23s; }
        .nav-fullscreen-takeover.open .nav-fs-links li:nth-child(5) .nav-fs-link { transition-delay: 0.28s; }
        .nav-fullscreen-takeover.open .nav-fs-links li:nth-child(6) .nav-fs-link { transition-delay: 0.33s; }
        .nav-fullscreen-takeover.open .nav-fs-links li:nth-child(7) .nav-fs-link { transition-delay: 0.38s; }

        .nav-fs-link:hover,
        .nav-fs-link.active {
          color: var(--nav-accent, #2563eb);
        }

        .nav-fs-glyph {
          color: var(--nav-accent, #2563eb);
          font-size: 0.6em;
          line-height: 1;
        }

        /* ── Takeover Footer / Socials ── */
        .nav-fs-footer {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 24px;
          margin-top: auto;
          opacity: 0;
          transition: opacity 0.4s ease 0.4s;
        }
        .nav-fullscreen-takeover.open .nav-fs-footer {
          opacity: 1;
        }

        .nav-fs-footer a {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--nav-text, #111827);
          text-decoration: none;
          transition: color 0.2s ease, transform 0.2s ease;
        }
        .nav-fs-footer a:hover {
          color: var(--nav-accent, #2563eb);
          transform: translateY(-2px);
        }

        /* ── Landscape / Short-Screen Optimizations ── */
        @media (max-height: 620px) {
          .nav-fullscreen-takeover {
            padding: 85px 16px 16px !important;
            gap: 8px !important;
          }
          .nav-fs-links {
            gap: 6px !important;
          }
          .nav-fs-link {
            font-size: clamp(1.2rem, 5vh, 1.6rem) !important;
            padding: 4px 8px !important;
          }
        }

        /* ── Reduced Motion Preference ── */
        @media (prefers-reduced-motion: reduce) {
          .nav-fullscreen-takeover,
          .nav-fs-link,
          .nav-fs-footer {
            transition-duration: 0.001s !important;
            transition-delay: 0s !important;
          }
        }
      `}</style>

      {/* Main Bar */}
      <nav
        aria-label="Main Navigation"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 28px",
          maxWidth: "1400px",
          margin: "0 auto",
          position: "relative",
          zIndex: 50,
        }}
      >
        {/* Left: Brand Logo */}
        <div style={{ display: "flex", alignItems: "center" }}>
          {logo}
        </div>

        {/* Center/Desktop: Navigation Links */}
        <ul
          className="nav-desktop-menu"
          style={{ listStyle: "none", margin: 0, padding: 0 }}
        >
          {navLinks.map((item, index) => {
            const isActive = pathname === item.href;
            const isHovered = hoveredIndex === index;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  style={{
                    position: "relative",
                    textDecoration: "none",
                    fontFamily: "var(--font-nav-links, inherit)",
                    fontSize: "15px",
                    fontWeight: 600,
                    letterSpacing: "0.02em",
                    padding: "6px 0",
                    color: isActive || isHovered
                      ? "var(--nav-accent, #2563eb)"
                      : "var(--nav-text, #111827)",
                    transition: "color 0.2s ease",
                  }}
                >
                  {item.label}
                  {/* Underline Indicator */}
                  <span
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      width: "100%",
                      height: "2px",
                      backgroundColor: "var(--nav-accent, #2563eb)",
                      transform: isActive || isHovered ? "scaleX(1)" : "scaleX(0)",
                      transformOrigin: "left",
                      transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      borderRadius: "2px",
                    }}
                  />
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Right: Desktop Actions (CTA & Theme Toggle) */}
        <div className="nav-cta-desktop">
          {themeToggle}
          {ctaButton}
        </div>

        {/* Mobile: Animated Hamburger Button */}
        <button
          type="button"
          className="nav-hamburger"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={menuOpen}
          aria-controls="mobile-nav-takeover"
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: "8px",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "5px",
              alignItems: "center",
              justifyContent: "center",
              width: "26px",
            }}
          >
            {/* Top Bar */}
            <span
              style={{
                display: "block",
                width: "24px",
                height: "2px",
                borderRadius: "2px",
                backgroundColor: menuOpen
                  ? "var(--nav-accent, #2563eb)"
                  : "var(--nav-text, #111827)",
                transform: menuOpen ? "translateY(7px) rotate(45deg)" : "none",
                transition: "transform 0.3s ease, background-color 0.2s ease",
                willChange: "transform",
              }}
            />
            {/* Middle Bar */}
            <span
              style={{
                display: "block",
                width: "24px",
                height: "2px",
                borderRadius: "2px",
                backgroundColor: "var(--nav-text, #111827)",
                opacity: menuOpen ? 0 : 1,
                transform: menuOpen ? "scaleX(0)" : "scaleX(1)",
                transition: "transform 0.3s ease, opacity 0.2s ease",
                willChange: "transform",
              }}
            />
            {/* Bottom Bar */}
            <span
              style={{
                display: "block",
                width: "24px",
                height: "2px",
                borderRadius: "2px",
                backgroundColor: menuOpen
                  ? "var(--nav-accent, #2563eb)"
                  : "var(--nav-text, #111827)",
                transform: menuOpen ? "translateY(-7px) rotate(-45deg)" : "none",
                transition: "transform 0.3s ease, background-color 0.2s ease",
                willChange: "transform",
              }}
            />
          </span>
        </button>
      </nav>

      {/* Full-Screen Takeover Panel */}
      <div
        id="mobile-nav-takeover"
        className={`nav-fullscreen-takeover${menuOpen ? " open" : ""}`}
        aria-hidden={!menuOpen}
      >
        {/* Navigation Links */}
        <ul className="nav-fs-links">
          {navLinks.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  tabIndex={menuOpen ? 0 : -1}
                  className={`nav-fs-link${isActive ? " active" : ""}`}
                >
                  {isActive && activeIndicatorGlyph && (
                    <span className="nav-fs-glyph" aria-hidden="true">
                      {activeIndicatorGlyph}
                    </span>
                  )}
                  {item.label}
                  {isActive && activeIndicatorGlyph && (
                    <span className="nav-fs-glyph" aria-hidden="true">
                      {activeIndicatorGlyph}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Bottom Auxiliary Section: Theme Toggle & Social Links */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "20px",
            width: "100%",
            marginTop: "auto",
          }}
        >
          {themeToggle && (
            <div
              style={{
                opacity: menuOpen ? 1 : 0,
                transition: "opacity 0.4s ease 0.35s",
                pointerEvents: menuOpen ? "auto" : "none",
              }}
            >
              {themeToggle}
            </div>
          )}

          {socialLinks.length > 0 && (
            <div className="nav-fs-footer">
              {socialLinks.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  tabIndex={menuOpen ? 0 : -1}
                >
                  {s.icon}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
```

---

## 5. Step-by-Step Instructions for an Agent / Developer

When instructing an agent to implement or replicate this mobile menu in any project, execute the following steps in sequence:

### Step 1: Establish Color Tokens / CSS Variables
- Ensure the project has semantic tokens for:
  - Background (`--nav-bg` or `--color-base`)
  - Foreground / Text (`--nav-text` or `--color-text`)
  - Accent / Brand Highlight (`--nav-accent` or `--color-accent`)
  - Borders (`--nav-border` or `--color-border`)

### Step 2: Set Up Header & Z-Index Structure
- Set the `<header>` element to `position: sticky; top: 0; z-index: 50;`.
- Set the mobile takeover container `.nav-fullscreen-takeover` to `position: fixed; inset: 0; z-index: 40;`.
- Add top padding to the takeover (`padding: 100px 24px 32px;`) so the header items (logo and hamburger) do not obscure the top menu links.

### Step 3: Implement Hamburger 3-Bar Morph Transition
- Create 3 `<span>` bars inside the `<button>`.
- Apply CSS transforms conditionally when `menuOpen` is true:
  - Top bar: `translateY(7px) rotate(45deg)`
  - Middle bar: `opacity: 0; transform: scaleX(0);`
  - Bottom bar: `translateY(-7px) rotate(-45deg)`
- Provide `transition: transform 0.3s ease, opacity 0.2s ease, background-color 0.2s ease`.

### Step 4: Staggered Link Animations
- In the CSS for `.nav-fs-link`, set default `opacity: 0; transform: translateY(18px);`.
- When parent has `.open`, animate `opacity: 1; transform: none;`.
- Add nth-child delay rules:
  ```css
  .nav-fullscreen-takeover.open li:nth-child(1) .nav-fs-link { transition-delay: 0.08s; }
  .nav-fullscreen-takeover.open li:nth-child(2) .nav-fs-link { transition-delay: 0.13s; }
  .nav-fullscreen-takeover.open li:nth-child(3) .nav-fs-link { transition-delay: 0.18s; }
  .nav-fullscreen-takeover.open li:nth-child(4) .nav-fs-link { transition-delay: 0.23s; }
  ```

### Step 5: Implement Lifecycle Hooks
1. **Scroll Lock Effect**:
   ```tsx
   useEffect(() => {
     if (!menuOpen) return;
     const prevBody = document.body.style.overflow;
     const prevHtml = document.documentElement.style.overflow;
     document.body.style.overflow = "hidden";
     document.documentElement.style.overflow = "hidden";
     return () => {
       document.body.style.overflow = prevBody;
       document.documentElement.style.overflow = prevHtml;
     };
   }, [menuOpen]);
   ```
2. **Pathname Auto-Close**:
   ```tsx
   useEffect(() => {
     setMenuOpen(false);
   }, [pathname]);
   ```
3. **Escape Key Listener**:
   ```tsx
   useEffect(() => {
     if (!menuOpen) return;
     const onKey = (e: KeyboardEvent) => {
       if (e.key === "Escape") setMenuOpen(false);
     };
     window.addEventListener("keydown", onKey);
     return () => window.removeEventListener("keydown", onKey);
   }, [menuOpen]);
   ```

### Step 6: Responsive Breakpoints & Short Viewport Support
- Hide desktop links and show the hamburger below `1024px` (or `1250px` depending on navbar density).
- Include the `@media (max-height: 620px)` query to scale font size down with `clamp(1.2rem, 5vh, 1.6rem)` and reduce vertical padding.

---

## 6. Copy-Pasteable Prompt for AI Agents

You can hand this prompt directly to any AI agent working on a different repository:

```markdown
Please build a full-screen mobile takeover navigation bar modeled on the following specification:

1. **Header Structure**:
   - Sticky top header with `z-index: 50`.
   - Contains Brand Logo on the left and a 3-bar animated hamburger button on the right (visible only on mobile/tablet screens).

2. **Full-Screen Takeover**:
   - Fixed overlay `position: fixed; inset: 0; z-index: 40;` that slides and fades in when `menuOpen` is true.
   - Inherits site colors using CSS variables (`--nav-bg`, `--nav-text`, `--nav-accent`, `--nav-border`).
   - Links render with staggered reveal transitions (using `transition-delay: 0.08s`, `0.13s`, etc. and `translateY(18px)` slide up).
   - The active link is styled with the site's accent color and optional indicator glyphs (`✦`).

3. **Interactions & Accessibility**:
   - 3-bar hamburger smoothly morphs into an "X" when opened.
   - Lock body & documentElement scroll while menu is open and restore on close.
   - Close menu automatically on route change (`pathname`) and when <kbd>Escape</kbd> is pressed.
   - Inactive links receive `tabIndex={menuOpen ? 0 : -1}`.
   - Include `@media (max-height: 620px)` compact styling to prevent link overflow on landscape mobile screens.
   - Include `@media (prefers-reduced-motion: reduce)` for motion sensitivity.

4. **Bottom Slot**:
   - Include slots for a Theme Switch toggle and Social Media icons at the bottom of the takeover menu.
```
