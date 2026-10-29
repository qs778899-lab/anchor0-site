# Asset sources

- Robot: S0 `_assets/gear_sonic/data/robot_model/model_data/g1/new_assemble_description/mujoco/scene_free_pearl_lightgray.xml` and its relative mesh assets. A byte-for-byte copy of this XML and all 264 referenced mesh files is bundled under `resources/robot/`, preserving relative paths (including collision meshes required to compile the MJCF). Archon G1 pearl/light-gray materials are retained. Only group-1 visual meshes are exported, without simplification. Existing trajectories drive 29 named body joints; the additional finger/head joints retain their model defaults. The source MJCF is never modified.
- Motion CSVs: S0 `_assets/gear_sonic_deploy/reference/example/`. The three configured sequences are bundled under `resources/motions/`; only `joint_pos.csv`, `body_pos.csv`, and `body_quat.csv` are needed. Exact sequences are configured in `motion_config.py` and recorded in `public/assets/manifest.json`.
- Generated assets: mesh binaries and world-body pose binaries produced by `scripts/export_assets.py`. These are reference trajectories, not live policy inference or real-robot recordings.
- Three.js 0.180.0: https://registry.npmjs.org/three/-/three-0.180.0.tgz — MIT; `public/vendor/THREE-LICENSE.txt` retained.
- Upstream S0 license: `licenses/S0-LICENSE.txt`. This preview does not change upstream rights.
- Visual reference for the original white layout: https://supermimic.github.io/ — no media copied; no local reproduction code used.
- Company links: https://www.archon.tech/ and https://www.archon.tech/blog/whole-body-intelligence-cn. The later branded layout has been retired; its backup is retained outside the web directory.

- Outfit Latin variable font: https://www.archon.tech/fonts/outfit/outfit-latin.woff2, restored locally for the coming-soon caption. SIL Open Font License retained in `public/vendor/OUTFIT-LICENSE.txt`.

## COMING SOON replay (2026-10-29)

- The default `/code/` motion now comes from the published `/demo/` test052/20k
  policy's continuous `COMING SOON` rollout at 50 Hz. All 10,975 frames are retained.
  `coming-soon.bin.gz` contains poses baked from actual recorded joint/root states
  using the exact 75-body demo skeleton and its 1020 visual assets. It is a simulated policy
  rollout, not a reference animation or real-robot recording.
- `coming-soon-ink.json` contains the unmodified physical right-wrist positions and
  pen/stroke flags. No target strokes or lettering font are drawn. Pose and ink use
  the same original world coordinates. Playback is 4×; no policy or physics runtime
  is loaded by this page. Full provenance, hashes and recording/export tools are
  versioned under `source/code-replay/` and `scripts/code-replay/` in the repository.
- `vendor/lines/{LineSegments2,LineSegmentsGeometry,LineMaterial}.js` are unmodified
  Three.js 0.180.0 add-ons from the same official npm archive as the existing renderer.
  They keep the blue recorded strokes readable at different zoom levels. The
  existing local `vendor/THREE-LICENSE.txt` covers these MIT-licensed files.
- The earlier Dance/Squat/Kick assets remain in the repository for source
  history; they are not requested by the page. The active manifest contains only the recorded replay.
