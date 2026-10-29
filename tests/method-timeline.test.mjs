import test from 'node:test';
import assert from 'node:assert/strict';
import {METHOD_FLOWS} from '../dist/method-flow-paths.js';
import {METHOD_DURATION, METHOD_TIMELINE, METHOD_PANELS, methodFrame} from '../dist/method-flow-timeline.js';

test('relay covers each real arrow once and separates A, B, C and Benchmark',()=>{
  assert.deepEqual([...METHOD_TIMELINE.map(e=>e.id)].sort(),METHOD_FLOWS.map(e=>e.id).sort());
  assert.equal(METHOD_TIMELINE.length,32);
  assert.deepEqual([...new Set(METHOD_TIMELINE.map(e=>e.group))],['A','B','C','benchmark']);
  assert(Math.abs(METHOD_DURATION-31260)<.01);
  for(let i=0;i<METHOD_TIMELINE.length;i++){
    const e=METHOD_TIMELINE[i],next=METHOD_TIMELINE[i+1];
    assert(e.duration>=600&&e.duration<=1800);
    if(next)assert(Math.abs(next.start-e.end-(next.group===e.group?0:300))<.01);
    for(const fraction of [.001,.25,.5,.75,.999]){
      const frame=methodFrame(e.start+e.duration*fraction);
      assert.equal(frame.entry.id,e.id);
      assert(Math.abs(frame.progress-fraction)<1e-10);
      assert(Math.abs(frame.offset-(64-e.travel*fraction))<1e-8);
    }
    // One beam starts before the real shaft and leaves beyond the fixed arrow tip.
    assert.equal(methodFrame(e.start+.001).entry.id,e.id);
    assert(methodFrame(e.end-.001).offset < -e.length-e.head+.1);
    if(!next||next.group!==e.group)assert.equal(methodFrame(e.end+150).entry,null);
  }
  assert.equal(methodFrame(METHOD_DURATION+30).entry.id,'calibration');
  assert.equal(METHOD_PANELS.length,3);
});
