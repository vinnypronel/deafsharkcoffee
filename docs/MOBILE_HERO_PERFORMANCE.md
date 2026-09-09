# Mobile hero scroll fix — revision 2

The first on-demand frame implementation is confirmed present in the live
storefront bundle. It can stall on mobile because each new scroll position may
need another fetch and image decode. Its small-viewport height also leaves a gap
when Safari collapses its toolbar.

This revision uses twelve JPEG sheets containing 120 samples from the same
10-second footage. The complete sequence is 1,201,457 bytes. Two sheets load at a
time, and animation begins only after all sheets have decoded. The poster remains
visible during initial loading; scrolling never loads, decodes, or evicts frames.
A time-based easing loop follows scrolling in either direction and stops at rest.
Decoded sheets occupy a fixed 62,208,000 bytes (about 59 MiB), plus the canvas and
browser overhead. All bitmaps are closed and pending requests aborted on unmount.
Reduced motion retains the poster and requests no animation sheets.

The sticky container uses dynamic viewport height to fill Safari's expanded
viewport. The canvas and poster use large viewport height, clipped by that
container, so toolbar changes do not repeatedly resize the backing bitmap.
The full scroll wrapper has the espresso background as an additional safeguard.
Desktop retains the existing video source and renderer.

Mobile screens up to 767px now use a 220vh scroll wrapper instead of 300vh.
This shortens pinned scrolling by approximately 40% while still reaching the
last animation frame before the hero unpins. Desktop keeps its original 300vh
wrapper and animation timing.

Regenerate the versioned sheets with FFmpeg:

```powershell
ffmpeg -hide_banner -loglevel error -i public/hero-scrub-mobile.mp4 -vf "fps=12,scale=480:270,tile=5x2" -q:v 4 -start_number 0 public/hero-atlas-v2/%02d.jpg
```

Use a new asset directory and update the renderer URL for future footage changes.
The old unreferenced v1 images are retained; revision 2 never requests them.

Validation: production build, TypeScript, focused ESLint (existing poster-image
warnings only), and all 46 tests passed. Regression tests cover both scroll
directions, request-free scrubbing, complete-sequence readiness, bounded memory,
cleanup, reduced motion, viewport resize, and offscreen/hidden suspension.

Chrome mobile emulation at 393 × 740 and 393 × 840 confirmed that the pinned
hero's bottom exactly matches the viewport bottom. Scrolling into the next
section exposes the intended product panel, not a blank strip. A forward/reverse
1500px scroll over 2.5 seconds with 4× CPU throttling produced 123 canvas image
draws, zero new sheet requests, and one animation interval over 34ms among 147
samples. These are desktop Chrome emulation results, not measured iPhone Safari
performance. A physical iPhone check is still required after release.

Release target: Cloudflare account `webdev@deafsharkcoffee.com`
(`84c14a9868348f78f6aa9f9c341d60a3`), Worker `deaf-shark-coffee`, domains
`deafsharkcoffee.com` and `www.deafsharkcoffee.com`, D1 database
`c328cd9d-beee-4ef1-85dd-635c9333713c`, R2 bucket `deaf-shark-uploads`.
No database, runtime configuration, or migration changes are part of this fix.
Revision 2 has not been deployed from this task.
