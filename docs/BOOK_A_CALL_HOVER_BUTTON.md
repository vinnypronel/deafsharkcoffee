# 📞 "Book a Call" Phone Ring & Slide Hover Effect

> **A drop-in, zero-dependency guide and specification to replicate the iconic Adzio "Book a Call" animated button hover effect in any web project.**

---

## 🎯 How The Effect Works

1. **Resting State**:
   - The button looks like a sleek, angled pill (`transform: skewX(-10deg)` background).
   - The phone SVG icon is inside the button but hidden with `width: 0`, `opacity: 0`, `gap: 0`, and `transform: scale(0.4) rotate(0deg)`.
   - Overflow and layout flow smoothly without abrupt jumps.

2. **Hover / Focus Transition (The "Extend")**:
   - As the cursor enters (or on keyboard focus), the button gap opens to `8px` and the icon transitions smoothly using an elastic cubic-bezier easing (`cubic-bezier(0.16, 1, 0.3, 1)`).
   - The icon expands from `width: 0` to `width: 16px`, `opacity: 1`, and `scale(1)`.
   - The button subtly lifts / offsets (`transform: translate(3px, -3px)`).

3. **Hover Animation (The "Ring")**:
   - Once visible, an infinite looping `@keyframes phoneRing` animation tilts the phone handset back and forth between `-16deg` and `+16deg` with subtle scale bounces (`1.12x` and `1.08x`), mimicking an active ringing telephone.

---

## 1. Pure HTML & CSS Implementation (Vanilla / Drop-in)

### HTML Markup
```html
<a href="#contact" class="book-call-btn">
    <!-- Lucide / Feather Phone Icon SVG -->
    <svg class="phone-ring-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
    </svg>
    <span>Book a Call</span>
</a>
```

### CSS Styles
```css
/* ── Book a Call Button Base ── */
.book-call-btn {
    --btn-bg: #00b8d4;          /* Resting background color */
    --btn-bg-hover: #005b73;    /* Hover background color */
    --btn-text: #070b10;        /* Resting text & icon color */
    --btn-text-hover: #ffffff;  /* Hover text & icon color */
    --btn-skew: -10deg;         /* Angle of the pill backplate */

    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    gap: 0;
    padding: 10px 28px;
    border-radius: 8px;
    background: transparent;
    color: var(--btn-text);
    font-family: 'Archivo', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 0.76rem;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-indent: 0.12em;
    text-transform: uppercase;
    text-decoration: none;
    isolation: isolate;
    cursor: pointer;
    border: none;
    outline: none;

    /* Smooth transitions for button body */
    transition: 
        transform 0.3s cubic-bezier(0.16, 1, 0.3, 1),
        background-color 0.4s ease,
        color 0.4s ease,
        padding 0.35s cubic-bezier(0.16, 1, 0.3, 1),
        gap 0.35s ease;
}

/* ── Angled Skewed Backing Pill ── */
.book-call-btn::before {
    content: '';
    position: absolute;
    inset: 0 7px;
    z-index: -1;
    border-radius: 7px;
    background: var(--btn-bg);
    transform: skewX(var(--btn-skew));
    transform-origin: center;
    transition: background-color 0.4s ease, transform 0.3s ease;
}

/* ── Hidden Phone Icon in Resting State ── */
.book-call-btn .phone-ring-icon {
    width: 0;
    height: 16px;
    opacity: 0;
    transform: scale(0.4) rotate(0deg);
    flex-shrink: 0;
    pointer-events: none;
    transition: 
        width 0.35s cubic-bezier(0.16, 1, 0.3, 1),
        opacity 0.3s ease,
        transform 0.35s cubic-bezier(0.16, 1, 0.3, 1),
        margin 0.35s ease;
}

/* ── Hover & Focus States (Extends & Rings) ── */
.book-call-btn:hover,
.book-call-btn:focus-visible {
    color: var(--btn-text-hover);
    transform: translate(3px, -3px);
    padding-left: 24px;
    padding-right: 28px;
    gap: 8px;
}

.book-call-btn:hover::before,
.book-call-btn:focus-visible::before {
    background: var(--btn-bg-hover);
}

.book-call-btn:hover .phone-ring-icon,
.book-call-btn:focus-visible .phone-ring-icon {
    width: 16px;
    opacity: 1;
    transform: scale(1);
    animation: phoneRing 0.6s ease-in-out infinite alternate;
}

/* ── Handset Ringing Keyframe Animation ── */
@keyframes phoneRing {
    0% {
        transform: rotate(0deg) scale(1);
    }
    20% {
        transform: rotate(-16deg) scale(1.12);
    }
    40% {
        transform: rotate(16deg) scale(1.12);
    }
    60% {
        transform: rotate(-12deg) scale(1.08);
    }
    80% {
        transform: rotate(12deg) scale(1.08);
    }
    100% {
        transform: rotate(0deg) scale(1);
    }
}

/* ── Accessibility (Reduced Motion) ── */
@media (prefers-reduced-motion: reduce) {
    .book-call-btn,
    .book-call-btn .phone-ring-icon,
    .book-call-btn::before {
        transition-duration: 0.01ms !important;
    }
    .book-call-btn:hover .phone-ring-icon,
    .book-call-btn:focus-visible .phone-ring-icon {
        animation: none !important;
    }
}
```

---

## 2. React / Next.js Component (Tailwind or CSS Modules)

### React (Lucide React + Inline/CSS)
```tsx
import React from 'react';
import { Phone } from 'lucide-react';
import './BookCallButton.css'; // containing the CSS from above

interface BookCallButtonProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  text?: string;
  href?: string;
}

export const BookCallButton: React.FC<BookCallButtonProps> = ({
  text = 'Book a Call',
  href = '#contact',
  className = '',
  ...props
}) => {
  return (
    <a href={href} className={`book-call-btn ${className}`} {...props}>
      <Phone className="phone-ring-icon" size={16} strokeWidth={2.4} />
      <span>{text}</span>
    </a>
  );
};
```

---

## 3. Fixed / Pinned Top-Right Variant (Navbar overlay)

If you want the button floating permanently in the top-right corner of your viewport:

```css
.pinned-header-cta {
    position: fixed;
    top: 20px;
    right: 28px;
    z-index: 9998;
}

/* Hide on mobile if using a dedicated mobile drawer */
@media (max-width: 768px) {
    .pinned-header-cta {
        display: none !important;
    }
}
```

---

## 4. Color Palettes & Customization Cheat Sheet

You can easily theme the button by overriding CSS variables:

```css
/* Electric Cyan / Deep Teal (Adzio Default) */
.theme-adzio {
    --btn-bg: #00b8d4;
    --btn-bg-hover: #005b73;
    --btn-text: #070b10;
    --btn-text-hover: #ffffff;
}

/* Vibrant Royal Blue */
.theme-blue {
    --btn-bg: #4285f4;
    --btn-bg-hover: #245aa8;
    --btn-text: #070b10;
    --btn-text-hover: #ffffff;
}

/* Emerald Green */
.theme-emerald {
    --btn-bg: #10b981;
    --btn-bg-hover: #065f46;
    --btn-text: #070b10;
    --btn-text-hover: #ffffff;
}

/* Sunset Orange */
.theme-orange {
    --btn-bg: #ff6b35;
    --btn-bg-hover: #b83a0a;
    --btn-text: #ffffff;
    --btn-text-hover: #ffffff;
}

/* Standard Pill (No Skew) */
.no-skew {
    --btn-skew: 0deg;
}
```

---

## 🤖 Prompt Template for AI Agents in Other Projects

You can copy and paste the prompt below into any AI agent (Claude, Cursor, Copilot, ChatGPT) in your new project:

````markdown
Please implement the "Book a Call" interactive animated button in our project.

### Visual Behavior Requirements:
1. **Resting State**:
   - The button has an angled pill background (`transform: skewX(-10deg)` on a `::before` pseudo-element).
   - Inside the button, there is a Phone icon (16x16 SVG) and the text "Book a Call".
   - In the resting state, the phone icon is completely collapsed and hidden (`width: 0`, `opacity: 0`, `transform: scale(0.4) rotate(0deg)`). The button gap is `0`.
2. **Hover / Focus-Visible State**:
   - The button slightly shifts (`transform: translate(3px, -3px)`) and the gap smoothly expands to `8px`.
   - The phone icon smoothly animates into view (`width: 16px`, `opacity: 1`, `transform: scale(1)`) using `transition: width 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease, transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)`.
   - The background color transitions smoothly.
   - While hovered, the phone icon continuously rings using the following keyframe animation:
```css
@keyframes phoneRing {
    0% { transform: rotate(0deg) scale(1); }
    20% { transform: rotate(-16deg) scale(1.12); }
    40% { transform: rotate(16deg) scale(1.12); }
    60% { transform: rotate(-12deg) scale(1.08); }
    80% { transform: rotate(12deg) scale(1.08); }
    100% { transform: rotate(0deg) scale(1); }
}
```
3. Make sure the hover effect supports keyboard `:focus-visible` and includes `@media (prefers-reduced-motion: reduce)`.
````
