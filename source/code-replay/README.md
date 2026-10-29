# COMING SOON — recorded policy replay

The recording comes from the unmodified `/demo/` release's `rollout` command with
`text: "COMING SOON"`, test052/20k, no disturbance, 50 Hz control. It uses one
initialization and one history reset for the whole phrase, including its space.
No reference animation is substituted for actual policy output.

- `coming-soon-rollout.json.gz`: complete compressed recorder output, including
  joint/root state, actions, physical wrist positions, pen state and word phase.
- `robot-kinematics.xml`: kinematic subset of the exact pinned `/demo/` physics
  model, retaining all 75 body frames and 36 qpos coordinates. Export evaluates
  `mj_kinematics` only; it does not run a second simulation.
- `clip.json`: 8× playback configuration; full-phrase view without a camera transition,
  3-second hold and 0.5-second fade.
- `provenance.json`: source, geometry and pose hashes plus validation results.

The replay now uses the demo's own 1020 visual assets, indexed without changing
vertices, and its exact physical skeleton. The maximum wrist mismatch must be
below 1 micrometre. Blue ink is the original physical wrist trace. The earlier
88-body presentation export remains recoverable in commit fa11884.

## Reproduce

Requires Node 24+, Python 3, and the existing S0 source project's dependencies
(`@mujoco/mujoco` 3.9.0 and Playwright). Set `S0_SOURCE_DIR` when that checkout is
not the adjacent `s0-tracker-demo` directory. A separate headless Chrome profile
is used; the recorder never opens a personal browser profile.

```sh
# Existing site must be running. Never overwrite an earlier capture.
REPLAY_RECORDING=.cache/new-coming-soon-rollout.json.gz node scripts/code-replay/record.mjs
python3 scripts/code-replay/prepare-kinematics.py
node scripts/code-replay/export.mjs
node --test tests/code-replay-data.test.mjs
```

The exporter intentionally reads the pinned `source/code-replay` capture. Review
and version a new recording before replacing it. The raw source recording is not
served to website visitors. Exported poses and ink are served below `/code/assets/`.

## Stage 1 verification

10,975 frames; 219.48 s of source time; 4,355 ink segments. Minimum pelvis height:
0.6958 m. Minimum upright-axis dot product: 0.99419. No detected fall, missing
frame or history reset during the phrase. Exported body rotations are normalized,
all samples finite, and all actual ink coordinates exactly match the raw recording.

## Matched-skeleton export

The current export compresses the geometry and pose buffers losslessly with gzip.
The viewing page loads only these static assets, never MuJoCo or ONNX. Source
robot licenses are retained under `/code/licenses/demo/`. Existing recordings can
be re-exported entirely offline. Re-recording is optional and must produce a new
file rather than overwriting the pinned capture.
