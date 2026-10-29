# METHOD flow emphasis — 2026-10-29

This is the previous visual revision. See [the brighter stream revision](method-flow-brightness.md)
for the current appearance, verification and LAN preview.

The visual implementation was committed and pushed as `eb29237` on `codex/anchor0-site`.
This revision changes only the METHOD arrow presentation. The original **2314 × 1585** PNG
remains byte-identical, with SHA-256
`3a3a2b04d4d001396ca93acd13f40ba0de7de0e18975bbe6ddf0878d709eba1e`.

## Appearance and image preservation

- Static arrow shafts and the 31 stationary arrowheads retain approximately 30% of their original
  contrast. The 32 path segments include the shared Benchmark trunk and both of its branches.
- Moving segments use the original arrow colors with a lighter inner core: **5 px** outside,
  **1.5 px** core, **44 px** length and **160 px** repeat distance, all in source-image coordinates.
  Speed remains **100 px/s**. There is no blur, glow filter or whole-image opacity adjustment.
- A transient full-resolution layer samples the nearby background on both sides of each arrow.
  Geometry and color matching restrict it to the arrow pixels, preserving panel colors, border
  crossings and the existing gaps in dashed lines. The original source file is not rewritten,
  compressed or replaced. The mask and fade layer are computed once and shared by both views.
- The bottom return segment of the deployment state-to-decoder arrow is now included, starting
  at the actual green line at `(2177, 1314)` and continuing up the right edge.
- Manual pause freezes the current muted-arrow/stream frame. The enlarged view inherits that
  phase and state. Reduced motion shows the unaltered original until the viewer explicitly plays.

## Acceptance evidence

The browser suite passed in an isolated Chrome profile at **1440 × 1000**, **1024 × 900** and
**390 × 844**, including native keyboard events and emulated touch:

- 147,667 opaque source-pixel samples across the full five-pixel highlight width match the
  original arrow colors and positions, including corners, short connections and dashed loops.
- Independent samples on every shaft and arrowhead measure retained contrast between
  **0.298 and 0.303**. Segment width, core width, length, repeat distance and motion direction pass.
- Actual browser screenshots of the original and enhanced figure were compared at four phases
  (0, 40, 80 and 120 source pixels). Across the four comparisons, 69,517 changed pixels were inside
  the arrow region, with **zero changed pixels outside it**. The comparison allows a two-screen-pixel
  guard around the scaled arrow mask for image resampling; the untouched original screenshot is saved.
- Desktop/tablet/mobile bounds, original-resolution zoom, mobile centering, touch panning to the
  far right, keyboard pause/resume, modal handoff, background/offscreen pause, English/Chinese,
  light/dark and reduced-motion default/explicit play all pass. No browser exceptions were recorded.
- The existing page HTML, application script, shared styles and all original image files match
  the baseline captured before this revision. Existing asset/data and HTTP streaming checks pass,
  including 15 clip manifests and 134 immutable released demo resources.

Mobile verification uses Chrome emulation; physical phones and Safari were not exercised.

## Reproduction and previews

With the website running and a separate Chrome debugging profile on localhost port 9225:

```sh
CDP_URL=http://127.0.0.1:9225 node tests/browser-method.mjs
python3 tests/verify-site.py
```

The screenshot comparison helper is `tests/method-visual-checks.mjs`. It only changes the test
page's temporary display state and saves preview files; no source assets are written.

LAN preview: `http://192.168.71.107:18081/#method`.

Saved screenshots: [original rendered figure](previews/method-emphasis-original.png),
[enhanced rendered figure](previews/method-emphasis-figure.png),
[desktop](previews/method-emphasis-desktop.png), [enlarged](previews/method-emphasis-enlarged.png),
[tablet](previews/method-emphasis-tablet.png), [mobile](previews/method-emphasis-mobile.png),
[mobile enlarged](previews/method-emphasis-mobile-enlarged.png),
and [Chinese dark mode](previews/method-emphasis-dark-zh.png).
