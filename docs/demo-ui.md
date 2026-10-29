# Interactive demo presentation layer

The `/demo/` UI now shares the main site's palette, system font stack, button and
input styles, English-first language setting and light/dark/system appearance.
Desktop keeps a large 3D view beside controls; mobile stacks the view and controls.
Motion source metadata is available in a compact disclosure.

## Runtime boundary

Only the UI, rendering styles and their build source are new. The original
`sim.worker-B2q0D_ik.js`, test052/20k ONNX parts, physics, motion data and 1020
visual resources are unchanged. `tests/demo-ui.test.mjs` verifies every one of the
134 immutable release files plus the LAN-adapted worker hash. The paper website's
test134/46k evaluation data is separate and is not a demo model update.

The renderer, word parsing and ink accumulator are adapted from the existing
local `s0-tracker-demo/src` presentation code. The new UI sends the published
worker's existing commands and consumes its existing messages. It does not
replace inference, dynamics, re-anchoring, letter resources or control history.
The opt-in `?validate=1` worker/ready/frame/ink bridges remain available to the
existing recording tools; ordinary visitor URLs do not expose them.

## Language and appearance

- `anchor-language`: `en` by default, or `zh`, shared with the homepage and code page.
- `anchor-theme`: `system` by default, or `light` / `dark`, shared with the homepage.
- Text comes from `src/demo/i18n.ts`. UI state is rendered in the selected language;
  there is no text-replacement observer. Static labels, motion labels, progress,
  dynamic state, validation, errors, direction controls and accessible names are
  covered. Model IDs, motion IDs and source filenames keep their source spelling.
- Theme updates include the canvas background, ground, grid, reference markers,
  target outlines and actual ink. Changing language/theme does not send worker
  commands or replace the renderer, selected motion, input, camera or accumulated ink.
- Storage failures fall back to in-memory preferences. Cross-tab storage changes
  and system appearance changes are handled without reloading the simulation.

## Rebuild

Use Node 24+. With dependencies installed, run:

```sh
npm install
npm run build:demo
npm run check:demo
npm run test:demo-ui
npm run test:code
```

The build can also reuse the already installed adjacent `s0-tracker-demo`
dependencies; `S0_SOURCE_DIR` can override that location. `scripts/build-demo-ui.mjs`
builds only `src/demo/`, copies its HTML template, records bundle sizes and the
unchanged worker hash in `source/demo-ui-build.json`. It never rebuilds the worker.
The legacy LAN patch script recognizes this UI and does not insert a duplicate
return-home link. All dependencies used by visitors remain local.

## Verification — 2026-10-29

- TypeScript checking passes, alongside translation/parameter coverage, input and
  word-spacing behavior, physical-ink discontinuity checks, pinned runtime hashes
  and existing LAN SHA-256 tests.
- Live browser checks cover English initialization, Chinese/English switching,
  light/dark appearance, continuous COMING SOON and all 26 single-letter options,
  play/pause, reset, switching back to presets, a 50 N push and both display toggles. During
  a language/theme switch the run ID remained 5 and progress advanced from frame
  17 to 900; no reset or loss of input occurred.
- Desktop and mobile screenshots are saved in `docs/previews/demo-replay/`.
- Real loading failures were injected by the local-only
  `python3 scripts/qa-failure-server.py` service at port 18082. The first code
  manifest and demo worker requests failed with HTTP 503. Both pages displayed
  their retry UI, recovered after clicking it, and retained exactly one canvas.
  This helper is separate from the LAN server and is not a production feature.
- Existing website checks pass: page assets, all 134 frozen demo files, unchanged
  paper data/video sources, route redirects, media ranges, gzip and MIME handling.

Final responsive checks used 1280×800 and 390×844 viewports; mobile document width
was exactly 390 px with no horizontal overflow. Both routes and their key assets
returned HTTP 200 at `http://192.168.71.107:18081/`.
