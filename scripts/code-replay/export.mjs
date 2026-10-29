// Bake actual recorded states with the SAME skeleton and visuals as /demo/.
// MuJoCo is used by this offline exporter only, never by the /code/ page.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gunzipSync, gzipSync } from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const root = fileURLToPath(new URL('../../', import.meta.url));
const source = process.env.S0_SOURCE_DIR || resolve(root, '../s0-tracker-demo');
const { default: loadMujoco } = await import(pathToFileURL(resolve(source, 'node_modules/@mujoco/mujoco/mujoco.js')));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const json = value => JSON.stringify(value, null, 2) + '\n';
const recordingBytes = await readFile(resolve(root, 'source/code-replay/coming-soon-rollout.json.gz'));
const recording = JSON.parse(gunzipSync(recordingBytes));
const manifestBytes = await readFile(resolve(root, 'dist/demo/assets/manifest.json'));
const manifest = JSON.parse(manifestBytes);
assert.equal(sha(manifestBytes), recording.manifestSha256);
assert.equal(sha(await readFile(resolve(root, 'dist/demo/assets/sim.worker-B2q0D_ik.js'))), recording.workerSha256);
const skeleton = await readFile(resolve(root, 'source/code-replay/robot-kinematics.xml'));
const mj = await loadMujoco();
assert.equal(mj.mj_versionString(), '3.9.0');
mj.FS.writeFile('/robot.xml', skeleton);
const model = mj.MjModel.mj_loadXML('/robot.xml'), data = new mj.MjData(model);
assert.equal(model.nbody, 75); assert.equal(model.nq, 36);
const names = Array.from({length:model.nbody}, (_,i) => mj.mj_id2name(model, mj.mjtObj.mjOBJ_BODY.value, i));
assert.deepEqual(names, recording.result.bodyNames);
const wristBody = names.indexOf('right_wrist_yaw_link'), rootBody = names.indexOf('pelvis');
const firstPointIds = ['pelvis', 'left_wrist_yaw_link', 'right_wrist_yaw_link', 'left_ankle_roll_link', 'right_ankle_roll_link'].map(name => names.indexOf(name));
const firstPoints = firstPointIds.flatMap(i => recording.result.initialBodyXpos.slice(i * 3, i * 3 + 3));
const rows = [{ ...recording.initial, frame: 0, pointPositions: firstPoints, handwriting: { penDown: false, strokeId: -1 } }, ...recording.result.records];
assert.equal(rows.length, 10975);
const poses = new Float32Array(rows.length * model.nbody * 7);
const ink = { version: 1, source: 'recorded-physical-right-wrist', fps: 50, frames: rows.length, actualWrist: [], penDown: [], strokeId: [] };
let maxWristPresentationOffset = 0, segments = 0;
for (let frame = 0; frame < rows.length; frame++) {
  const row = rows[frame]; assert.equal(row.frame, frame);
  data.qpos.set(row.qpos);
  mj.mj_kinematics(model, data);
  for (let body = 0; body < model.nbody; body++) {
    const offset = (frame * model.nbody + body) * 7, q = body * 4;
    poses.set(data.xpos.subarray(body * 3, body * 3 + 3), offset);
    poses.set([data.xquat[q + 1], data.xquat[q + 2], data.xquat[q + 3], data.xquat[q]], offset + 3);
  }
  const actual = row.pointPositions.slice(6, 9);
  ink.actualWrist.push(...actual); ink.penDown.push(Boolean(row.handwriting.penDown)); ink.strokeId.push(row.handwriting.strokeId);
  const shown = data.xpos.subarray(wristBody * 3, wristBody * 3 + 3);
  maxWristPresentationOffset = Math.max(maxWristPresentationOffset, Math.hypot(...actual.map((x, i) => x - shown[i])));
  if (frame && ink.penDown[frame] && ink.penDown[frame - 1] && ink.strokeId[frame] === ink.strokeId[frame - 1]) segments++;
}
assert(poses.every(Number.isFinite)); assert.equal(segments, 4355);
assert(maxWristPresentationOffset < 1e-6, `Wrist alignment: ${maxWristPresentationOffset}`);
// Decode the release's exact STL vertices, deduplicate and index them for WebGL.
const chunks = [], meshes = [], meshIds = new Map(); let offset = 0, triangles = 0;
for (const file of manifest.visuals.files) {
  const stl = gunzipSync(await readFile(resolve(root, 'dist/demo/assets', file.transport.url)));
  assert.equal(sha(stl), file.sha256);
  const count = stl.readUInt32LE(80), vertices = [], indices = [], seen = new Map();
  assert.equal(stl.length, 84 + count * 50);
  for (let t = 0; t < count; t++) for (let v = 0; v < 3; v++) {
    const start = 84 + t * 50 + 12 + v * 12;
    const xyz = [0,4,8].map(n => stl.readFloatLE(start + n)), key = xyz.join(',');
    let index = seen.get(key);
    if (index === undefined) { index = vertices.length / 3; seen.set(key, index); vertices.push(...xyz); }
    indices.push(index);
  }
  const vertexData = Buffer.from(new Float32Array(vertices).buffer), indexData = Buffer.from(new Uint32Array(indices).buffer);
  meshIds.set(file.url, meshes.length);
  meshes.push({vertices:vertices.length/3, faces:count, offset});
  chunks.push(vertexData,indexData); offset += vertexData.length + indexData.length; triangles += count;
}
const geometry = Buffer.concat(chunks), geometryGzip = gzipSync(geometry, {level:9});
const robot = { bodies:model.nbody, bodyNames:names, meshes,
  geoms:manifest.visuals.components.map(v => ({body:v.bodyId,mesh:meshIds.get(v.meshUrl),position:v.position,
    quaternion:[...v.quaternion.slice(1),v.quaternion[0]],scale:v.scale,
    color:/^(left|right)_wrist_(roll|pitch|yaw)_link$/.test(v.sourceBodyName ?? v.bodyName)?[.7,.7,.7]:v.rgba.slice(0,3),specular:.15,shininess:.18})),
  triangles, bytes:geometry.length, url:'replay-robot.bin.gz', sha256:sha(geometry), transportSha256:sha(geometryGzip)};
const poseBytes = Buffer.from(poses.buffer), poseGzip = gzipSync(poseBytes,{level:9}), inkBytes = Buffer.from(JSON.stringify(ink));
const clip = { id:'coming-soon', title:'COMING SOON 书写回放', english:'COMING SOON writing replay',
  kind:'policy-rollout',source:'test052/20k · continuous COMING SOON',text:'COMING SOON',
  fps:50,frames:rows.length,duration:(rows.length-1)/50,bodies:model.nbody,poseBytes:poses.byteLength,
  poseUrl:'coming-soon.bin.gz',inkUrl:'coming-soon-ink.json',poseSha256:sha(poseBytes),poseTransportSha256:sha(poseGzip),inkSha256:sha(inkBytes),
  rootBody,wristBody,playbackRate:8,overviewSeconds:0,holdSeconds:3,fadeSeconds:.5,policy:recording.policy};
await writeFile(resolve(root,'dist/code/assets/replay-robot.bin.gz'),geometryGzip);
await writeFile(resolve(root,'dist/code/assets/replay-robot.json'),json(robot));
await writeFile(resolve(root,'dist/code/assets/coming-soon.bin.gz'),poseGzip);
await writeFile(resolve(root,'dist/code/assets/coming-soon-ink.json'),inkBytes);
await writeFile(resolve(root,'source/code-replay/clip.json'),json(clip));
await writeFile(resolve(root,'source/code-replay/provenance.json'),json({format:2,text:recording.text,recordedAt:recording.capturedAt,policy:recording.policy,
  recordingSha256:sha(recordingBytes),workerSha256:recording.workerSha256,manifestSha256:recording.manifestSha256,physicsSha256:recording.physicsSha256,
  kinematicsSha256:sha(skeleton),visualSource:manifest.visuals.source,visualSourceArchiveSha256:manifest.visuals.sourceArchiveSha256,
  mujoco:mj.mj_versionString(),conversion:'Recorded qpos → exact 75-body published physics skeleton; mj_kinematics only; release STL visuals indexed without vertex changes',
  coordinates:'Original world xyz; quaternions exported xyzw; ink and robot share world coordinates',
  inkSource:'Unmodified recorded physical right-wrist positions; consecutive pen-down samples of the same stroke only',
  ...recording.validation,...clip,inkSegments:segments,maxWristPresentationOffsetM:maxWristPresentationOffset,geometrySha256:sha(geometry)}));
console.log(JSON.stringify({frames:rows.length,duration:clip.duration,inkSegments:segments,geometryBytes:geometry.length,geometryGzip:geometryGzip.length,poseGzip:poseGzip.length,maxWristPresentationOffset}));
data.delete(); model.delete();
