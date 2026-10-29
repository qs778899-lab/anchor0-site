# Interactive demo presentation layer

The `/demo/` UI now shares the main site's palette, system font stack, button and
input styles, English-first language setting and light/dark/system appearance.
Desktop keeps a large 3D view beside controls; mobile stacks the view and controls.
Motion source metadata is no longer displayed. The controls contain
only motion selection and disturbances. Reference target markers, target outlines
and the former 03 View and status panel have been removed; only actual wrist ink
is rendered. Policy reference inputs and the original release resources are unchanged.

## Runtime boundary

The UI and renderer now use a narrowly adapted disturbance worker. The original
`sim.worker-B2q0D_ik.js`, test052/20k ONNX parts, physics, motion data and 1020
visual resources are unchanged. `tests/demo-ui.test.mjs` verifies every one of the
134 immutable release files plus the LAN-adapted worker hash. The paper website's
test134/46k evaluation data is separate and is not a demo model update.

The renderer, word parsing and ink accumulator are adapted from the existing
local `s0-tracker-demo/src` presentation code. The derived worker changes only
interactive push validation, magnitude and acknowledgement. It does not
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
- Theme updates include the canvas background, ground, grid and actual ink.
  Changing language/theme does not send worker
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
builds `src/demo/`, copies its HTML template, records bundle sizes and both original
and active worker hashes in `source/demo-ui-build.json`. It invokes
`scripts/build-demo-worker.mjs`, which verifies the original SHA-256 and exact
replacement sites before generating `sim.worker-interactive.js` and the local
`demo-disturbance.js` helper. The original worker remains untouched. The adapter
source and output checksums are recorded in `source/demo-worker-build.json`.
The legacy LAN patch script recognizes this UI and does not insert a duplicate
return-home link. All dependencies used by visitors remain local.

## Verification — 2026-10-29

- TypeScript checking passes, alongside translation/parameter coverage, input and
  word-spacing behavior, physical-ink discontinuity checks, pinned runtime hashes
  and existing LAN SHA-256 tests.
- Live browser checks cover English initialization, Chinese/English switching,
  light/dark appearance, continuous COMING SOON and all 26 single-letter options,
  play/pause, reset, switching back to presets, a 50 N push (the display toggles were subsequently removed).
  During
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

### Simplified controls

Removed the entire 03 View and status section and its unused text/styles. The
renderer no longer creates reference markers or target-outline geometry in any
mode. Motion-selection failures remain next to the motion retry action.

Rebuilt the UI and passed the six demo tests, including all frozen resource
hashes. Browser checks covered English/Chinese, preset-to-letter switching and
a completed letter A (714/714 frames) with only actual blue wrist ink. The
Chinese narrow-screen screenshot is `previews/demo-replay/demo-clean-mobile-zh.jpg`.

### Mode bar and PNG export

The viewer header contains only Preset motions and Continuous writing. Legacy
`?letter=A` URLs normalize to `?word=A`; one-character phrases still use the
continuous policy path. Re-selecting the active mode is a no-op, while mode changes
retain the draft and last chosen preset. Motion metadata and copy controls are removed.

Save image downloads only the current 3D view as PNG. The renderer draws and
immediately copies the canvas before encoding, without changing camera or playback.
The filename uses the active phrase rather than an un-applied draft. Failure leaves
the action available to retry. The download was opened and visually checked: robot
and actual blue A ink are present with no UI chrome. A completed single-character
run reached 714/714 frames, and repeating the selected mode kept run ID 2.
TypeScript and all six demo tests pass. Preview: `previews/demo-replay/demo-mode-snapshot.jpg`.

### Adjustable disturbance and 3D feedback

The input accepts finite decimal magnitudes from 0 through 60 N (default 50).
Invalid or empty values disable the four direction buttons. Directions are relative
to the robot's pelvis yaw, using the original mapping. Each accepted command replaces
the current pulse for exactly 0.1 simulation seconds; 0 N cancels it without an arrow.
The worker rejects paused commands and mismatched run/selection IDs, then reports
the actual world vector, body ID, magnitude, start/end simulation time and run/epoch.

The renderer anchors an amber arrow to that body's current position, preserving the
reported world direction when the camera rotates. Length reflects magnitude with a
minimum visible length. The label shows magnitude; nearby help specifies the 100 ms
physical duration. After the pulse the arrow fades over 0.9 seconds. Pause/background
freeze the indicator; reset/mode changes clear it. New feedback replaces the old arrow.

Browser verification covered 0, 12.5, 50 and 60 N, empty/out-of-range validation,
all four buttons, consecutive forward/back pushes, pause freezing, camera rotation,
reset and mode changes. A running PNG export preserved run ID 4 and advanced from
frame 2637 to 2939; a paused export included the visible 12.5 N arrow. The downloaded
images were opened to confirm actual rendered content. Desktop 1280×800 and Chinese
dark mobile 390×844 were checked, with mobile document width exactly 390 px. The force
label was moved inward to prevent clipping at the phone width.

The local QA server's `--screenshot-failure` mode returns a null PNG encoding once.
The UI displayed its English error, switched that error to Chinese, then successfully
downloaded a PNG on retry. This injection is local-only and never included in `/demo/`.

Unit tests exercise the generated worker function and message handler, all directions
at several robot yaws, 0/12.5/50/60 N, the unchanged 50 N computation, 100 ms duration,
invalid/stale/paused messages, replacement, fade/freeze/clear, and resource hashes.
The source recording helper now records the active worker's path, hash and build
record for future recordings; the existing COMING SOON recording and `/code/`
resources are unchanged. Screenshots: `previews/demo-replay/demo-force-mobile-zh.png`
and `previews/demo-replay/demo-force-desktop.png`.

Final checks: all 19 demo/replay tests, TypeScript, byte-for-byte rebuild
reproducibility and site HTTP/resource checks pass. Current LAN preview:
`http://172.16.3.166:18081/demo/`.
