import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const file = path => readFile(new URL('../'+path,import.meta.url));
const sha = data => createHash('sha256').update(data).digest('hex');
const raw=await file('source/code-replay/coming-soon-rollout.json.gz');
const recording=JSON.parse(gunzipSync(raw));
const provenance=JSON.parse(await file('source/code-replay/provenance.json'));
const clip=JSON.parse(await file('source/code-replay/clip.json'));
const inkBytes=await file('dist/code/assets/coming-soon-ink.json'),ink=JSON.parse(inkBytes);
const poseBytes=gunzipSync(await file('dist/code/assets/coming-soon.bin.gz'));
const poses=new Float32Array(poseBytes.buffer,poseBytes.byteOffset,poseBytes.byteLength/4);
const rows=[recording.initial,...recording.result.records];
test('fixed published policy and complete uninterrupted word recording',async()=>{
 assert.equal(recording.text,'COMING SOON');assert.equal(clip.frames,10975);assert.equal(clip.duration,219.48);
 assert.equal(recording.result.historyResets,1);assert.equal(recording.result.initializations,1);assert(recording.result.runIdUnchanged);
 assert.equal(recording.policy.sha256,'e4f393a62ceb64d14fe310dd8f1ac7f9790f945ef22708074ce9e383d0928f3c');
 assert.equal(sha(raw),provenance.recordingSha256);
 assert.equal(sha(await file('dist/demo/assets/manifest.json')),provenance.manifestSha256);
 assert.equal(sha(await file('dist/demo/assets/sim.worker-B2q0D_ik.js')),provenance.workerSha256);
 const letters=new Map();
 recording.result.records.forEach((r,i)=>{assert.equal(r.frame,i+1);if(r.sequence.kind==='letter')letters.set(r.sequence.letterIndex,r.sequence.letter);assert(r.qpos[2]>=.3);assert(1-2*(r.qpos[4]**2+r.qpos[5]**2)>=Math.cos(75*Math.PI/180));});
 assert.equal([...letters.values()].join(''),'COMINGSOON');
 assert(recording.result.records.some(r=>r.sequence.kind==='lateral'&&r.sequence.transfers===2));
});
test('baked poses retain physical root motion and normalized body rotations',()=>{
 assert.equal(poseBytes.length,clip.poseBytes);assert.equal(sha(poseBytes),clip.poseSha256);assert.equal(clip.bodies,75);assert.equal(clip.playbackRate,8);assert.equal(clip.holdSeconds,3);
 assert(poses.every(Number.isFinite));
 for(let f=0;f<clip.frames;f++){
  const root=(f*clip.bodies+clip.rootBody)*7;
  for(let axis=0;axis<3;axis++)assert(Math.abs(poses[root+axis]-rows[f].qpos[axis])<3e-7);
  for(let b=0;b<clip.bodies;b++){const q=(f*clip.bodies+b)*7+3;assert(Math.abs(Math.hypot(...poses.subarray(q,q+4))-1)<1e-5);}
 }
});
test('every ink sample equals the recorded physical wrist; no pen-up joins',()=>{
 assert.equal(sha(inkBytes),clip.inkSha256);assert.equal(ink.frames,clip.frames);assert.equal(ink.actualWrist.length,clip.frames*3);
 let segments=0;
 rows.forEach((r,f)=>{
  assert.deepEqual(ink.actualWrist.slice(f*3,f*3+3),r.pointPositions.slice(6,9));
  assert.equal(ink.penDown[f],f?Boolean(r.handwriting.penDown):false);
  assert.equal(ink.strokeId[f],f?r.handwriting.strokeId:-1);
  if(f&&ink.penDown[f]&&ink.penDown[f-1]&&ink.strokeId[f]===ink.strokeId[f-1])segments++;
 });
 assert.equal(segments,provenance.inkSegments);assert.equal(segments,4355);
 assert(provenance.maxWristPresentationOffsetM<1e-6);
 for(let f=0;f<clip.frames;f++){const offset=(f*clip.bodies+clip.wristBody)*7;for(let a=0;a<3;a++)assert(Math.abs(poses[offset+a]-ink.actualWrist[f*3+a])<1e-6);}
});

test('indexed release geometry has valid bounds and exact source mapping',async()=>{
 const robot=JSON.parse(await file('dist/code/assets/replay-robot.json'));
 const data=gunzipSync(await file('dist/code/assets/replay-robot.bin.gz'));
 assert.equal(sha(data),robot.sha256);assert.equal(data.length,robot.bytes);assert.equal(robot.bodies,75);assert.equal(robot.geoms.length,76);
 for(const m of robot.meshes){assert(m.offset+m.vertices*12+m.faces*12<=data.length);for(let i=0;i<m.faces*3;i++)assert(data.readUInt32LE(m.offset+m.vertices*12+i*4)<m.vertices);}
});
