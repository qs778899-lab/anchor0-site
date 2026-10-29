import test from 'node:test';
import assert from 'node:assert/strict';
import {METHOD_FLOWS, METHOD_IMAGE} from '../dist/method-flow-paths.js';
import {METHOD_DURATION, METHOD_TIMELINE, METHOD_PANELS, methodFrame} from '../dist/method-flow-timeline.js';

test('relay covers each current-paper arrow once and cycles A, B and C',()=>{
  assert.deepEqual(METHOD_TIMELINE.flatMap(e=>e.flows.map(f=>f.id)).sort(),METHOD_FLOWS.map(e=>e.id).sort());
  assert.equal(METHOD_TIMELINE.length,26);
  assert.deepEqual([...new Set(METHOD_TIMELINE.map(e=>e.group))],['A','B','C']);
  assert.deepEqual(['A','B','C'].map(group=>METHOD_FLOWS.filter(f=>f.group===group).length),[4,14,10]);
  assert(METHOD_DURATION>23000&&METHOD_DURATION<24000);
  for(let i=0;i<METHOD_TIMELINE.length;i++){
    const e=METHOD_TIMELINE[i],next=METHOD_TIMELINE[i+1];
    assert(e.duration>=600&&e.duration<=1800);
    if(next)assert(Math.abs(next.start-e.end-(next.group===e.group?0:300))<.01);
    for(const fraction of [.001,.25,.5,.75,.999]){
      const frame=methodFrame(e.start+e.duration*fraction);
      assert.equal(frame.entry.id,e.id);
      assert(Math.abs(frame.progress-fraction)<1e-10);
      assert.deepEqual(frame.flows.map(f=>f.id),e.flows.map(f=>f.id));
      e.flows.forEach((flow,j)=>assert(Math.abs(frame.flows[j].offset-(64-flow.travel*fraction))<1e-8));
    }
    // One beam starts before the real shaft and leaves beyond the fixed arrow tip.
    assert.equal(methodFrame(e.start+.001).entry.id,e.id);
    e.flows.forEach((flow,j)=>assert(methodFrame(e.end-.001).flows[j].offset < -flow.length-flow.head+.1));
    if(!next||next.group!==e.group)assert.equal(methodFrame(e.end+150).entry,null);
  }
  assert.equal(methodFrame(METHOD_DURATION+30).entry.id,'calibration');
  assert.equal(METHOD_PANELS.length,3);
  for(const panel of METHOD_PANELS){
    assert(panel.x>=0&&panel.y>=0);
    assert(panel.x+panel.width<=METHOD_IMAGE.width&&panel.y+panel.height<=METHOD_IMAGE.height);
  }
});

test('only the two alternative pairs share a step, with one successor and no leftover streams',()=>{
  const pairs=METHOD_TIMELINE.filter(e=>e.alternative);
  assert.deepEqual(pairs.map(e=>e.flows.map(f=>f.id)),[
    ['reconstruction-selector','reference-selector'],['policy-reference','policy-token']
  ]);
  for(const e of METHOD_TIMELINE)assert.equal(e.alternative,e.flows.length===2);
  for(const [i,e] of pairs.entries()){
    assert.equal(e.duration,Math.max(...e.flows.map(f=>f.naturalDuration)));
    assert(e.flows[0].naturalDuration!==e.flows[1].naturalDuration);
    assert.equal(methodFrame(e.start-.001).flows.length,1);
    assert.equal(methodFrame(e.start).flows.length,2);
    assert.equal(methodFrame(e.end-.001).flows.length,2);
    const after=methodFrame(e.end);
    assert.equal(after.flows.length,1);
    assert.equal(after.flows[0].id,i===0?'selector-error':'deployment-reference-encoder');
  }
  for(const e of METHOD_TIMELINE){
    if(!e.alternative)assert.equal(e.flows.length,1);
    assert.equal(methodFrame(e.start+.001+METHOD_DURATION).entry.id,e.id);
  }
});
