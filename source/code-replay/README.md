# COMING SOON — recorded policy replay

The recording comes from the unmodified `/demo/` release's `rollout` command with
`text: "COMING SOON"`, test052/20k, no disturbance, 50 Hz control. It uses one
initialization and one history reset for the whole phrase, including its space.
No reference animation is substituted for actual policy output.

- `coming-soon-rollout.json.gz`: complete compressed recorder output, including
  joint/root state, actions, physical wrist positions, pen state and word phase.
- `robot-kinematics.xml`: kinematic subset of the user's `web.zip` presentation
  robot. It preserves joints, body frames, inertial definitions and defaults;
  meshes, contact, actuators and solver settings are omitted because export calls
  only `mj_kinematics`. It is not a new dynamics model or policy evaluation.
- `clip.json`: presentation manifest entry, activated separately by the page change.
- `provenance.json`: source hashes, output hashes, validation and playback settings.

The source MuJoCo model SHA-256 is recorded in provenance. Upstream asset/license
notes remain in `dist/code/licenses/`. The 29 shared joints are mapped by name;
extra finger/head joints retain the presentation model's default pose. The two
models have a small wrist-attachment difference: maximum presentation wrist offset
is 5.03 mm in this recording. Blue ink always uses the original physical wrist.

## Reproduce

Requires Node 24+, Python 3, and the existing S0 source project's dependencies
(`@mujoco/mujoco` 3.9.0 and Playwright). Set `S0_SOURCE_DIR` when that checkout is
not the adjacent `s0-tracker-demo` directory. A separate headless Chrome profile
is used; the recorder never opens a personal browser profile.

```sh
# Existing site must be running. Never overwrite an earlier capture.
REPLAY_RECORDING=.cache/new-coming-soon-rollout.json.gz node scripts/code-replay/record.mjs
python3 scripts/code-replay/prepare-kinematics.py /path/to/web.zip
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
