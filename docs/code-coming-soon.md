# Code coming soon

`/code/` is a static WebGL replay of the published test052/20k controller writing
COMING SOON. The homepage links to it with a relative `/code/` URL.

## Current replay

- Exact 75-body physics frames and 1020 visuals from `/demo/`; actual 50 Hz policy
  recording, one initialization and continuous history across all ten letters.
- 10,975 frames, 219.48 source seconds and 4,355 pen-down segments. Pose-to-physical
  wrist error is below 0.000001 m; ink coordinates are unchanged from the recording.
- 8× playback (27.435 seconds writing), no camera transition, a 3-second
  hold, and a 0.5-second fade. Every original ink segment is retained at any render
  rate. Pen lifts, transfers and the space do not join strokes.
- The front camera frames the whole phrase from the start and stays fixed. Drag,
  wheel/pinch and arrow keys allow manual inspection. Manual input suspends the
  default panorama until Home / Reset view or the next loop.
- Space and the small play button pause/resume. Hidden/offscreen pages pause their
  clock. Reduced-motion preference starts paused; explicit play is still available.
- White page and Code Coming Soon caption are preserved. Auxiliary messages follow
  `anchor-language`; English is the default. No ONNX, MuJoCo, worker or inference
  request is made by this route. All scripts, geometry, poses and fonts are local
  below `/code/`. Loading and WebGL failures expose a bilingual retry button.

## Sources and reproducibility

The visual shell originally came from the supplied `/Users/qs/Desktop/web.zip`
(SHA-256 `323cce1ed32dcd7c86b55e4c3a3334c97f368ac1b85bfc0e5ec837803da9393c`).
Three.js 0.180.0, its matching MIT line add-ons and the Outfit font remain local.
The original Dance/Squat/Kick assets remain in repository history and are not
loaded by the active page. The robot and replay now come from the frozen demo.
See `source/code-replay/README.md`, `provenance.json`, `scripts/code-replay/`, and
`dist/code/licenses/` for recording/export instructions, hashes and rights notices.

## Validation — 2026-10-29

- Four data tests check source hashes, complete uninterrupted recording, finite
  poses and normalized quaternions, exact physical ink, body mapping and geometry.
- Two timing/ink tests check 8× playback, zero-transition timing, hold/fade, clean looping and
  preservation of every pen-down segment across skipped render frames.
- Three application tests execute the app with DOM/viewer substitutes: pause,
  hidden/offscreen clock suspension, reduced motion, language updates without
  reload, failed-load retry, and context-loss cleanup/retry.
- Live WebGL review in the in-app browser verified the full phrase, desktop and
  390×844 mobile framing, drag, zoom, Home, Space and shared Chinese preference.
  Screenshots are in `docs/previews/demo-replay/code-*.jpg`.
- `?inspect=1` adds an explicit visible time slider for repeatable visual review.
  It is absent from the normal visitor URL and does not expose inference controls.
  Its range follows the current clip's full loop duration (30.935 seconds at 8×).

The 8× update was checked at the first frame and at 27.83 presentation seconds:
the same full-phrase camera is used throughout, and the end frame retains all
4,355 ink segments. Desktop and narrow-screen framing and loop restart were
checked in the browser. Preview: `previews/demo-replay/code-panorama-8x.png`.
