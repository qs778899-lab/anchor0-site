# METHOD vivid streams — 2026-10-29

The first implementation stage was committed and pushed as `14c66e4` on
`codex/anchor0-site`. This revision responds to the previous animation remaining
too faint at the size of the inline figure.

## Visual change

Only the METHOD animation files change the served website. The original PNG is
still **2314 × 1585** with SHA-256
`3a3a2b04d4d001396ca93acd13f40ba0de7de0e18975bbe6ddf0878d709eba1e`.
No source image was re-encoded. Text, modules, robots, layout, videos, charts and
the interactive demo are unchanged.

| Parameter (source-image pixels) | Previous revision | This revision |
| --- | ---: | ---: |
| Colored stream width | 5 | 9 |
| Bright core width | 1.5 | 2.5 |
| Segment length | 44 | 64 |
| Repeat distance | 160 | 128 |
| Speed | 100 px/s | 100 px/s |
| Local halo | None | 18 px stroke, 2 px blur, 65% opacity |
| Arrowheads | Fixed, muted | Fixed geometry, illuminated as the stream arrives |

The saturated blue, purple, green, gold and neutral streams retain the diagram's
color families. A near-white core makes the moving segment distinct. Static shafts
and tips retain approximately 30% contrast between pulses. All 32 path segments
and 31 arrowheads participate, including the short connectors and Benchmark loop.
The common trunk and branches share a continuous phase.

The extra glow is masked to the actual arrow pixels and a narrow band of adjacent
background. Expansion is perpendicular to each shaft, preserving the existing
dash gaps. Only nearby pixels matching the light panel fill are admitted. A QA fix
excludes darker local samples at frame crossings, protecting the neighboring
module borders. The blur applies only to the moving stroke, never to the source
image or the page.

Inline and enlarged views use the same generated layers and clock. Manual pause
freezes the complete visible effect, the inactive view and background tabs stop
animating, and reduced motion defaults to the untouched static image until Play
is explicitly selected.

## Verification

- 147,667 opaque source-pixel samples match the original 32 path centerlines.
- All 32 shafts and 31 tips retain static contrast between **0.298 and 0.303**.
- Every tip's phase matches arrival of its own stream; source coordinates and
  direction are unchanged.
- The expanded mask adds **100,660** background pixels, each within seven source
  pixels perpendicular to an original arrow. No original mask pixels are lost.
  The minimum flattened RGB channel of the added background is **229.1**; darker
  lettering and borders are excluded.
- Actual rendered screenshots at offsets 0, 32, 64 and 96 changed **129,377**
  arrow-region pixels across comparisons with the static original, with **zero
  changes outside the bounded safe mask**. Two screen pixels account for browser
  resampling. Consecutive phases produced **66,283** visible pixel differences,
  confirming visible motion rather than a style-only change.
- Chrome checks passed at 1440 × 1000, 1024 × 900 and 390 × 844: keyboard pause and
  resume, background/offscreen pause, shared modal state, 1:1 original zoom, touch
  panning, English/Chinese, light/dark, and reduced motion. No JavaScript errors.
  The background-tab test waits for creation of the foreground tab before changing
  focus; no visibility state is mocked.
- All served files outside `method-flow.js`, `method-flow.css` and
  `method-flow-layers.js` match the pre-change hashes. Site checks passed for the
  15 short clips, 134 immutable released demo assets, test134/46k data, local page
  links and HTTP range/MIME behavior.

Mobile tests use Chrome emulation; physical phones and Safari were not tested.

With the site running and a separate Chrome debugging profile on localhost 9225:

```sh
CDP_URL=http://127.0.0.1:9225 node tests/browser-method.mjs
python3 tests/verify-site.py
```

## Preview

Current Wi-Fi preview: <http://172.16.3.166:18081/#method> (HTTP 200 verified).
The earlier `192.168.71.107` address is no longer the computer's Wi-Fi address.

[Actual browser motion recording](previews/method-bright-motion.mp4) uses 131
timestamped browser frames covering 4.33 seconds, encoded at 30 fps without
speeding up the animation. The video is a preview artifact only; the live website
still renders the unchanged original PNG with its vector overlay.

Screenshots: [static original](previews/method-bright-original.png),
[enhanced figure](previews/method-bright-figure.png),
[desktop](previews/method-bright-desktop.png),
[enlarged](previews/method-bright-enlarged.png),
[tablet](previews/method-bright-tablet.png),
[mobile](previews/method-bright-mobile.png),
[mobile enlarged](previews/method-bright-mobile-enlarged.png),
[Chinese dark mode](previews/method-bright-dark-zh.png).
