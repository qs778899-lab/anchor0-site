import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {sampleTime,duration,inkSegments,visibleSegments} from '../dist/code/replay.js';
const clip=JSON.parse(await readFile(new URL('../source/code-replay/clip.json',import.meta.url)));
const ink=JSON.parse(await readFile(new URL('../dist/code/assets/coming-soon-ink.json',import.meta.url)));
test('4× playback completes, holds the whole phrase and restarts cleanly',()=>{
 assert.equal(sampleTime(10,clip).sourceTime,40);
 assert.equal(sampleTime(clip.duration/4,clip).sourceTime,clip.duration);
 const end=clip.duration/4+clip.overviewSeconds;
 assert.equal(sampleTime(end,clip).overview,1);assert.equal(sampleTime(end+2.9,clip).opacity,1);
 assert(Math.abs(sampleTime(duration(clip)-.25,clip).opacity-.5)<1e-8);
 assert.equal(sampleTime(duration(clip),clip).sourceTime,0);assert.equal(sampleTime(duration(clip),clip).opacity,1);
});
test('fast or skipped render frames cannot drop ink or connect pen-up transfers',()=>{
 const s=inkSegments(ink);assert.equal(s.frames.length,4355);
 for(let f=0;f<ink.frames;f+=17)assert.equal(visibleSegments(s.frames,f),s.frames.filter(x=>x<=f).length);
 assert.equal(visibleSegments(s.frames,ink.frames-1),4355);assert.equal(visibleSegments(s.frames,0),0);
 for(const f of s.frames){assert(ink.penDown[f]&&ink.penDown[f-1]);assert.equal(ink.strokeId[f],ink.strokeId[f-1]);}
});
