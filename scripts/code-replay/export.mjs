// Bake recorded joint states into the existing 88-body presentation model.
// mj_kinematics evaluates poses only: no second policy or dynamics rollout.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const root = fileURLToPath(new URL('../../', import.meta.url));
const source = process.env.S0_SOURCE_DIR || resolve(root, '../s0-tracker-demo');
const { default: loadMujoco } = await import(pathToFileURL(resolve(source, 'node_modules/@mujoco/mujoco/mujoco.js')));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const recordingBytes = await readFile(resolve(root, 'source/code-replay/coming-soon-rollout.json.gz'));
const recording = JSON.parse(gunzipSync(recordingBytes));
const spec = JSON.parse(await readFile(resolve(root, 'dist/code/assets/robot.json')));
const skeleton = await readFile(resolve(root, 'source/code-replay/robot-kinematics.xml'));
const mj = await loadMujoco();
assert.equal(mj.mj_versionString(), '3.9.0');
mj.FS.writeFile('/robot.xml', skeleton);
const model = mj.MjModel.mj_loadXML('/robot.xml'), data = new mj.MjData(model);
assert.equal(model.nbody, spec.bodies); assert.equal(model.nq, 60);
const joints = recording.physics.jointNames.map((name, i) => {
  const id = mj.mj_name2id(model, mj.mjtObj.mjOBJ_JOINT.value, name); assert(id >= 0, name);
  return [model.jnt_qposadr[id], recording.physics.qposAddresses[i]];
});
assert.equal(new Set(joints.map(j => j[0])).size, 29);
const wristBody = mj.mj_name2id(model, mj.mjtObj.mjOBJ_BODY.value, 'right_wrist_yaw_link');
const rootBody = mj.mj_name2id(model, mj.mjtObj.mjOBJ_BODY.value, 'pelvis');
const firstPointIds = ['pelvis', 'left_wrist_yaw_link', 'right_wrist_yaw_link', 'left_ankle_roll_link', 'right_ankle_roll_link'].map(name => recording.result.bodyNames.indexOf(name));
const firstPoints = firstPointIds.flatMap(i => recording.result.initialBodyXpos.slice(i * 3, i * 3 + 3));
const rows = [{ ...recording.initial, frame: 0, pointPositions: firstPoints, handwriting: { penDown: false, strokeId: -1 } }, ...recording.result.records];
assert.equal(rows.length, 10975);
const poses = new Float32Array(rows.length * model.nbody * 7);
const ink = { version: 1, source: 'recorded-physical-right-wrist', fps: 50, frames: rows.length, actualWrist: [], penDown: [], strokeId: [] };
let maxWristPresentationOffset = 0, segments = 0;
for (let frame = 0; frame < rows.length; frame++) {
  const row = rows[frame]; assert.equal(row.frame, frame);
  data.qpos.set(model.qpos0); data.qpos.set(row.qpos.slice(0, 7));
  for (const [to, from] of joints) data.qpos[to] = row.qpos[from];
  mj.mj_kinematics(model, data);
  for (let body = 0; body < model.nbody; body++) {
    const offset = (frame * model.nbody + body) * 7, q = body * 4;
    poses.set(data.xpos.subarray(body * 3, body * 3 + 3), offset);
    poses.set([data.xquat[q + 1], data.xquat[q + 2], data.xquat[q + 3], data.xquat[q]], offset + 3);
    assert(Math.abs(Math.hypot(...poses.subarray(offset + 3, offset + 7)) - 1) < 1e-5);
  }
  const actual = row.pointPositions.slice(6, 9);
  ink.actualWrist.push(...actual); ink.penDown.push(Boolean(row.handwriting.penDown)); ink.strokeId.push(row.handwriting.strokeId);
  const shown = data.xpos.subarray(wristBody * 3, wristBody * 3 + 3);
  maxWristPresentationOffset = Math.max(maxWristPresentationOffset, Math.hypot(...actual.map((x, i) => x - shown[i])));
  if (frame && ink.penDown[frame] && ink.penDown[frame - 1] && ink.strokeId[frame] === ink.strokeId[frame - 1]) segments++;
}
assert(poses.every(Number.isFinite)); assert(segments > 1000);
// The supplied presentation model has a slightly different wrist attachment.
// Keep recorded ink exact instead of replacing it with presentation-model FK.
assert(maxWristPresentationOffset < .015, `Unexpected visual mapping offset: ${maxWristPresentationOffset}`);
const poseBytes = Buffer.from(poses.buffer), inkBytes = Buffer.from(JSON.stringify(ink));
const clip = {
  id: 'coming-soon', title: 'COMING SOON 书写回放', english: 'COMING SOON writing replay',
  kind: 'policy-rollout', source: 'test052/20k · continuous COMING SOON', text: 'COMING SOON',
  fps: 50, frames: rows.length, duration: (rows.length - 1) / 50, bodies: model.nbody, poseBytes: poses.byteLength,
  poseUrl: 'coming-soon.bin', inkUrl: 'coming-soon-ink.json', poseSha256: sha(poseBytes), inkSha256: sha(inkBytes),
  rootBody, wristBody, playbackRate: 2, overviewSeconds: 1.5, holdSeconds: 4, fadeSeconds: .5,
  policy: recording.policy,
};
await writeFile(resolve(root, 'dist/code/assets/coming-soon.bin'), poseBytes);
await writeFile(resolve(root, 'dist/code/assets/coming-soon-ink.json'), inkBytes);
await writeFile(resolve(root, 'source/code-replay/clip.json'), JSON.stringify(clip, null, 2) + '\n');
const provenance = {
  format: 1, text: recording.text, recordedAt: recording.capturedAt, policy: recording.policy,
  recordingSha256: sha(recordingBytes), workerSha256: recording.workerSha256, manifestSha256: recording.manifestSha256,
  physicsSha256: recording.physicsSha256, kinematicsSha256: sha(skeleton),
  originalPresentationModelSha256: 'ff11443867764ce01f068d008d5c1c1a559b1ea802a03ceb41d51f5a9638af68',
  mujoco: mj.mj_versionString(), conversion: '29 joints mapped by name; unrecorded hand/head joints at qpos0; mj_kinematics only',
  coordinates: 'Original world xyz; quaternions exported xyzw; ink and robot share world coordinates',
  inkSource: 'Unmodified recorded physical right-wrist positions; consecutive pen-down samples of the same stroke only',
  ...recording.validation, ...clip, inkSegments: segments, maxWristPresentationOffsetM: maxWristPresentationOffset,
};
await writeFile(resolve(root, 'source/code-replay/provenance.json'), JSON.stringify(provenance, null, 2) + '\n');
console.log(JSON.stringify({ frames: rows.length, duration: clip.duration, inkSegments: segments, poseBytes: poses.byteLength, maxWristPresentationOffset, poseSha256: sha(poseBytes) }));
data.delete(); model.delete();
