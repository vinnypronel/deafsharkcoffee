# Hero scroll rendering

The home hero uses the original 240 video frames as decoded JPEG atlases on both
desktop and mobile. `scripts/build-hero-frames.mjs` regenerates the assets from
`public/hero-scrub.mp4` with FFmpeg. Keep the v3 asset paths immutable; use a new
version directory when changing the footage or dimensions.

Desktop uses 800 × 450 frames (5.77 MB transferred, about 330 MiB of decoded
pixels). Mobile uses 480 × 270 frames (2.96 MB transferred, about 119 MiB decoded).
These are pixel budgets, not total browser memory measurements. Two sheets load
at a time. All bitmaps are closed on unmount or a reduced-motion preference change.
The lower desktop source resolution trades some detail for bounded memory and
predictable frame access; the page's text and controls retain their resolution.

The poster stays visible until every sheet is decoded. Failed sheets retry, and
returning online retries only missing sheets. Slow initial networks therefore
delay animation readiness rather than freezing halfway through a scrub. Scrolling
does not fetch assets, decode video, or wait for media seek events.

The renderer coalesces scroll events into animation frames, caches layout until
resize, and stops at rest, offscreen, or when the page is hidden. Mobile progress
uses the stable canvas height so browser toolbar height changes cannot move the
animation timeline. Reduced-motion users keep the poster without frame downloads.

## Validation — September 9, 2026

- Production build, TypeScript check, and 10 focused behavior tests passed.
- Tests cover forward/reverse scroll, event coalescing, idle work, reduced motion,
  missing sheets, toolbar resizing, online recovery, and disposal during decoding.
- Chrome comparison: live site before the change versus the local production
  build, one six-second forward/backward sweep of the hero per configuration.
  Timing instrumentation records canvas draws; this is a small lab comparison,
  not a field-performance guarantee.
  The local Node production preview served the hero, but Cloudflare-bound API
  endpoints were unavailable there; this did not validate the server-side flows.

| Configuration | Before: p95 / maximum paint gap | After: p95 / maximum paint gap |
| --- | --- | --- |
| Desktop, 1920 × 1080, 1× CPU | 36.4 / 146.8 ms | 17.8 / 66.9 ms |
| Mobile emulation, 390 × 844, DPR 3, 4× CPU slowdown | 37.7 / 109.6 ms | 33.8 / 60.5 ms |

The new renderer made zero canvas draws during the measured idle interval on both
configurations. The desktop run had zero animation-frame intervals above 34 ms.
Network/cache state and background machine work can affect these results. Physical
iPhone/Safari testing and low-memory device validation remain outstanding.

The live domain has not been deployed by this change. The saved Sites manifest
points to the older private demo, not the current business-owned live domain.
