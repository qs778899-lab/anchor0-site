# Code coming soon

The independent page is served at `/code/` by the existing LAN static server.
The homepage owner can link to `/code/`; this integration does not edit homepage files.

## Source

- User-supplied archive: `/Users/qs/Desktop/web.zip`.
- Archive SHA-256: `323cce1ed32dcd7c86b55e4c3a3334c97f368ac1b85bfc0e5ec837803da9393c`.
- Imported the exported browser assets from `web/public/assets/`, vendored Three.js
  0.180.0, OrbitControls, Outfit, and their supplied licenses.
- Geometry, manifests, motion binaries, vendor code, and font bytes are unchanged.
- The original asset-source notes and S0 license are retained under
  `dist/code/licenses/`. References to `resources/` and the export scripts in the
  original notes describe the supplied archive, which remains on the Desktop.
- The three motion exports are Dance (9.92 s), Squat (8.46 s), and Kick (3.28 s).
  The page uses Dance; other exported clips remain available in the manifest.
- These are reference trajectories rendered in the browser, not live controller
  inference. The existing `/demo/` controller is a separate application.

## Integration contract

- All page dependencies are served below `/code/`; no CDN or new server is needed.
- Keep the source page's white background, centered pearl-gray robot, and
  `Code Coming Soon` caption.
- Read the homepage's `anchor-language` local-storage preference. English is the
  default; `zh` selects Chinese auxiliary messages. Do not change the preference.
- Use client-side WebGL. The source archive's Linux CPU-rendering backend is not
  part of this static integration.

## Frontend changes

- Rebased HTML, CSS, import-map, geometry, and motion URLs to the independent route.
- Retained Dance as the default loop and the original local Three.js/OrbitControls
  implementation for mouse, touch, wheel, and keyboard camera controls.
- Added a bilingual loading/error state with an explicit retry button. A retry also
  works by clicking the viewer or pressing Enter; keyboard focus remains usable.
- Stopped animation callbacks in the background, offscreen, and while manually
  paused. Resume retains the timeline. Reduced-motion preference starts paused and
  Space can explicitly start playback.
- Disposed geometry, materials, event handlers, resize observers, and the canvas
  after a failed load or lost graphics context so retry creates a clean viewer.
- Added responsive camera framing with room for the full Dance trajectory on
  narrow screens. The white background and original caption typography are retained.

## Delivery stages

1. `e3368c4`: import original assets and licenses, with archive provenance recorded here.
2. Integrate the page, verify playback, recovery, resource isolation, and LAN access.

## Verification — 2026-10-29

- JavaScript syntax checks passed for `app.js` and `viewer.js`.
- All 12 imported asset/vendor files match their archive bytes. Robot geometry
  offsets, all three trajectory lengths, frame counts, durations, and finite pose
  values were verified.
- Eight application checks passed: default English and Dance loop; pause/resume;
  background and offscreen suspension; reduced motion; Chinese and live preference
  updates; blocked local-storage fallback; loading failures and retry; render/context
  failures and resource cleanup. These ran the actual app module with DOM and viewer
  substitutes, not a browser.
- Five viewer checks passed using the actual Three.js math, scene, geometry, and
  OrbitControls, with DOM and GPU-renderer substitutes: 88-body pose interpolation;
  mouse rotation/wheel zoom; touch rotation/pinch zoom; keyboard camera control and
  resize; suspended rendering, context-loss notification, cleanup, and scoped URLs.
- Projected all 497 Dance frames' geometry bounds at canvas sizes 800×520,
  358×520, 358×412, 288×390, and 760×260. All stayed within 90% of the viewport's
  half-extents at the initial camera view. This is a mathematical framing check,
  not a screenshot-based visual review.
- HTTP verification passed on both `127.0.0.1:18081` and `192.168.71.107:18081`:
  `/code` redirects to `/code/`, HTML and scripts serve current file contents, all
  18 page/resources return 200 with expected lengths and script MIME types, and
  geometry byte-range requests return correct data with status 206.
- The previous LAN address `172.16.3.166` timed out. The current Wi-Fi address is
  `192.168.71.107`; preview: `http://192.168.71.107:18081/code/`.
- Live browser/GPU visual review was unavailable: the browser tool reported
  **“Local browser use is disabled in Work settings.”** No desktop/mobile browser
  screenshot or live GPU-rendering success is claimed. The preview was queued in
  the app for manual viewing.

The homepage entry should use the relative link `/code/`, which keeps working when
the host's LAN address changes. Only this independent route and this record belong
to these commits; the homepage work is owned separately.
