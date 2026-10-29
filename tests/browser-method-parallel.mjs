import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {cdp,evaluate,wait,until,viewport,go,screenshot,close,events} from './browser-client.mjs';

const inline='[data-surface="inline"]',modal='[data-surface="dialog"]';
const pairs=[['reconstruction-selector','reference-selector'],['policy-reference','policy-token']];
const scroll=()=>evaluate(`document.querySelector('#method .paper-figure').scrollIntoView({behavior:'instant',block:'center'})`);
const snapshot=selector=>evaluate(`(()=>{
  const svg=document.querySelector('${selector}'),root=svg.dataset.surface==='inline'?document.querySelector('#method'):document.querySelector('#image-dialog');
  const note=root.querySelector('.method-flow-note');
  return {elapsed:svg.dataset.elapsed,ids:JSON.parse(svg.dataset.activeFlows),
    offsets:[...svg.querySelectorAll('.method-flow-highlight[visibility="visible"]')].map(p=>p.style.strokeDashoffset),
    panels:[...svg.querySelectorAll('[data-panel]')].map(p=>[p.getAttribute('visibility'),p.getAttribute('opacity')]),
    note:note.textContent,noteVisible:getComputedStyle(note).visibility==='visible'};
})()`);
const pausePair=ids=>evaluate(`new Promise((resolve,reject)=>{
  const start=performance.now();function check(){
    const svg=document.querySelector('${inline}');
    if(svg.dataset.activeStep===${JSON.stringify(ids.join('+'))}&&+svg.dataset.progress>.4&&+svg.dataset.progress<.75){
      document.querySelector('#method .method-flow-toggle').click();document.activeElement.blur();resolve(true);
    }else if(performance.now()-start>26000)reject(new Error('Pair did not play'));else requestAnimationFrame(check);
  }check();
})`);
const layout=()=>evaluate(`(()=>{
  const box=document.querySelector('#method .method-flow-actions').getBoundingClientRect();
  const note=document.querySelector('#method .method-flow-note').getBoundingClientRect(),button=document.querySelector('#method .method-flow-toggle').getBoundingClientRect();
  return {height:box.height,noOverflow:document.documentElement.scrollWidth===innerWidth&&note.left>=0&&button.right<=innerWidth,noteFits:note.right<=button.left};
})()`);
try{
  await mkdir('.cache/preview',{recursive:true});await viewport(1440,1000);await go();
  await evaluate(`localStorage.removeItem('anchor-navigation-position');localStorage.setItem('anchor-language','en');localStorage.setItem('anchor-theme','light')`);await go();await scroll();
  await until(`document.querySelector('${inline}')?.dataset.running==='true'`);
  const before=await layout();
  await pausePair(pairs[0]);const b=await snapshot(inline);await wait(180);assert.deepEqual(await snapshot(inline),b);
  assert.deepEqual(b.ids,pairs[0]);assert(b.noteVisible);assert.equal(b.note,'Alternative paths (choose one)');assert.equal((await layout()).height,before.height);
  await screenshot('.cache/preview/method-parallel-b-desktop.png');
  console.log('PASS: B alternatives pause together with both beams, breathing and note frozen; reserved control height is stable');

  await evaluate(`document.querySelector('#method [data-zoom]').click()`);await until(`document.querySelector('${modal}')?.dataset.maskReady==='true'`);
  assert.deepEqual(await snapshot(modal),b);await screenshot('.cache/preview/method-parallel-b-enlarged.png');
  await evaluate(`document.querySelector('#close-image').click()`);await until(`!document.querySelector('${modal}')`);
  assert.deepEqual(await snapshot(inline),b);
  console.log('PASS: paused paired step and note are identical in inline and enlarged views, including after closing');

  await evaluate(`document.querySelector('#language-toggle').click();document.querySelector('#theme-select').value='dark';document.querySelector('#theme-select').dispatchEvent(new Event('change'));document.activeElement.blur()`);
  await until(`document.querySelector('#method .method-flow-note').textContent==='可选路径（二选一）'`);
  assert.equal((await snapshot(inline)).elapsed,b.elapsed);await screenshot('.cache/preview/method-parallel-b-dark-zh.png');
  await evaluate(`document.querySelector('#language-toggle').click();document.querySelector('#theme-select').value='light';document.querySelector('#theme-select').dispatchEvent(new Event('change'))`);
  await viewport(1024,900);await scroll();await wait(80);assert((await layout()).noOverflow);assert((await layout()).noteFits);
  await screenshot('.cache/preview/method-parallel-b-tablet.png');
  await viewport(390,844,true);await scroll();await wait(80);assert((await layout()).noOverflow);assert((await layout()).noteFits);
  await screenshot('.cache/preview/method-parallel-b-mobile.png');

  await cdp('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
  const tap=async()=>{
    const point=await evaluate(`(()=>{const b=document.querySelector('#method .method-flow-toggle').getBoundingClientRect();return{x:b.x+b.width/2,y:b.y+b.height/2};})()`);
    await cdp('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});
    await cdp('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  };
  await tap();await until(`document.querySelector('${inline}').dataset.running==='true'`);await wait(50);await tap();
  await until(`document.querySelector('${inline}').dataset.running==='false'`);
  const touchPaused=await snapshot(inline);assert.deepEqual(touchPaused.ids,pairs[0]);await wait(160);assert.deepEqual(await snapshot(inline),touchPaused);
  await evaluate(`document.querySelector('#method [data-zoom]').click()`);await until(`document.querySelector('${modal}')?.dataset.maskReady==='true'`);
  assert.deepEqual(await snapshot(modal),touchPaused);await screenshot('.cache/preview/method-parallel-b-mobile-enlarged.png');
  await evaluate(`document.querySelector('#close-image').click()`);await until(`!document.querySelector('${modal}')`);
  console.log('PASS: English/Chinese, light/dark, tablet/390 px controls, and touch pause preserve the paired step');

  await cdp('Emulation.setTouchEmulationEnabled',{enabled:false});await viewport(1440,1000);await scroll();
  await evaluate(`document.querySelector('#method .method-flow-toggle').click()`);await pausePair(pairs[1]);
  const c=await snapshot(inline);assert.deepEqual(c.ids,pairs[1]);assert(c.noteVisible);await wait(160);assert.deepEqual(await snapshot(inline),c);
  await screenshot('.cache/preview/method-parallel-c-desktop.png');
  await evaluate(`document.querySelector('#method [data-zoom]').click()`);await until(`document.querySelector('${modal}')?.dataset.maskReady==='true'`);
  assert.deepEqual(await snapshot(modal),c);await screenshot('.cache/preview/method-parallel-c-enlarged.png');
  await evaluate(`document.querySelector('#image-dialog .method-flow-toggle').click()`);
  await until(`document.querySelector('${modal}').dataset.activeStep==='deployment-reference-encoder'`);
  await evaluate(`document.querySelector('#image-dialog .method-flow-toggle').click()`);
  const next=await snapshot(modal);assert.deepEqual(next.ids,['deployment-reference-encoder']);assert(!next.noteVisible);
  await evaluate(`document.querySelector('#close-image').click()`);await until(`!document.querySelector('${modal}')`);
  assert.deepEqual(await snapshot(inline),next);assert.equal((await layout()).height,before.height);
  console.log('PASS: C alternatives resume into the single encoder path with no leftover beams or note; modal pause returns the same frame inline');
  assert.equal(events.filter(e=>e.method==='Runtime.exceptionThrown').length,0);
}finally{await close();}
