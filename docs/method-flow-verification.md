# METHOD arrow flow — 2026-10-29

The initial implementation was committed and pushed as `d87b56f` on `codex/anchor0-site`.
This acceptance pass refines three line origins to stay clear of box borders and preserves the
existing centered mobile image view. No source image was edited or re-encoded.

## Scope and source fidelity

- Original website figure: `dist/assets/images/method.png`, **2314 × 1585** pixels.
- SHA-256: `3a3a2b04d4d001396ca93acd13f40ba0de7de0e18975bbe6ddf0878d709eba1e`.
- All existing image files match the hashes captured before this change. The existing `app.js`,
  `styles.css`, `charts.css` and `experience.css` remain byte-identical. The only additions to the
  existing HTML are the METHOD stylesheet and module references; the original body is unchanged.
- The current website figure is the coordinate source. The different figure in the paper-source
  directory was neither substituted nor edited. The diagram's wording, arrowheads, modules,
  colors, robot imagery and original-file link remain intact.

## Animation implementation

`dist/method-flow-paths.js` records 32 centerline segments covering the arrows in A, B and C and
the Benchmark loop. The shared Benchmark trunk is represented once; its two branches inherit
the arrival phase. Skeleton lines, module borders, brackets and reconstruction guides are static.
Highlights are 3 source pixels wide and 24 pixels long, repeating every 200 pixels at 100 pixels/s.
The original PNG alpha is the overlay mask, retaining the exact gaps in the dashed outer loop.

The inline and enlarged views share a clock and manual pause state. Only the visible active view
runs; leaving the viewport or switching browser tabs freezes its phase. Reduced motion defaults
to the unaltered static image and allows an explicit play action. Controls follow English/Chinese.
Fit-to-window and original-resolution zoom use the same SVG coordinate system without scaling
or rewriting the source PNG. Other figures use their existing image viewer.

## Acceptance results

The isolated Chrome checks passed at 1440 × 1000, 1024 × 900 and 390 × 844:

- **64,552 original line pixels** match all 32 paths and the full highlight width, including bends,
  short shafts, branch points and dashed feedback lines. SVG and PNG bounds coincide in every view.
- Entry playback, approximately 100 px/s forward motion, keyboard Space pause and Enter resume,
  retained manual pause, modal handoff, offscreen pause and background-tab pause passed.
- Original-size zoom displays exactly 2314 × 1585 CSS pixels. Emulated touch pans the image and
  overlay together, including the far right edge, without page-width overflow. Mobile fit view
  remains vertically centered and its controls stay within the viewport.
- English/Chinese, light/dark, static reduced-motion default and explicit play under reduced motion
  passed. Another paper figure opens with its original viewer DOM and no METHOD controls.
- No browser JavaScript exceptions. Existing asset/data verification and HTTP range/transport
  checks pass, including the 15 clip manifests and 134 immutable released demo resources.
- HTTP 200 verified on the current LAN address for the homepage, animation modules/stylesheet
  and original PNG: `http://192.168.71.107:18081/#method`.

The mobile checks use Chrome touch emulation, not a physical phone or Safari.

## Reproduce and preview

Start the site and a separate headless Chrome profile with a localhost-only debugging port,
then run with Node 24 or newer (9225 was used for this check):

```sh
CDP_URL=http://127.0.0.1:9225 node tests/browser-method.mjs
python3 tests/verify-site.py
```

The browser suite checks the original PNG hash, geometry, lifecycle and interactions, and writes
screenshots to `.cache/preview/`. It does not modify source assets.

Saved previews: [desktop](previews/method-desktop.png), [enlarged](previews/method-enlarged.png),
[tablet](previews/method-tablet.png), [mobile](previews/method-mobile.png),
[mobile enlarged](previews/method-mobile-enlarged.png), and [Chinese dark mode](previews/method-dark-zh.png).
