import assert from 'node:assert/strict';
import {go,evaluate,viewport,until,wait,screenshot,close,events} from './browser-client.mjs';
try{
 await viewport(1440,1000);await go();await until(`document.querySelectorAll('#benchmark-videos video').length===18`);
 await evaluate(`if(document.documentElement.lang.startsWith('zh'))document.querySelector('#language-toggle').click();document.querySelector('#theme-select').value='light';document.querySelector('#theme-select').dispatchEvent(new Event('change'))`);
 assert.deepEqual(await evaluate(`[...document.querySelectorAll('#benchmark-videos .clip-rail')].map(r=>r.children.length)`),[7,6,5]);
 assert(await evaluate(`[...document.querySelectorAll('#benchmark-videos video')].every(v=>!v.currentSrc)`));
 for(let i=0;i<18;i++){
  await evaluate(`document.querySelectorAll('#benchmark-videos video')[${i}].scrollIntoView({behavior:'instant',block:'center',inline:'center'})`);
  await until(`(()=>{const v=document.querySelectorAll('#benchmark-videos video')[${i}];return v.readyState>=2&&!v.paused&&v.currentTime>0})()`);
  assert(await evaluate(`(()=>{const v=document.querySelectorAll('#benchmark-videos video')[${i}];return v.loop&&v.muted&&v.videoWidth===960&&v.videoHeight===1020})()`));
 }
 await evaluate(`{const r=document.querySelector('#benchmark-inhouse-clips');r.scrollLeft=0;r.scrollIntoView({behavior:'instant',block:'center'});}`);
 await until(`!document.querySelector('#benchmark-inhouse-clips video').paused`);
 await evaluate(`document.querySelector('#benchmark-inhouse-clips video').pause()`);await wait(150);
 await evaluate(`scrollTo({top:0,behavior:'instant'})`);await until(`[...document.querySelectorAll('#benchmark-videos video')].every(v=>v.paused)`);
 await evaluate(`document.querySelector('#benchmark-inhouse-clips').scrollIntoView({behavior:'instant',block:'center'})`);await wait(300);
 assert(await evaluate(`document.querySelector('#benchmark-inhouse-clips video').paused`));
 await evaluate(`document.querySelector('#benchmark-inhouse-clips').closest('.video-group').querySelector('[data-rail-step="1"]').click()`);await until(`document.querySelector('#benchmark-inhouse-clips').scrollLeft>100`);await wait(800);
 for(const width of [1440,1024,390]){
  await viewport(width,1000,width===390);
  await evaluate(`document.querySelectorAll('#benchmark-videos .clip-rail').forEach(r=>r.scrollTo({left:0,behavior:'instant'}));document.querySelector('.benchmark-examples').scrollIntoView({behavior:'instant'})`);await wait(500);
  assert(await evaluate(`document.documentElement.scrollWidth===innerWidth&&[...document.querySelectorAll('#benchmark-videos .clip-rail')].every(r=>[...r.children].every(c=>Math.abs(c.getBoundingClientRect().top-r.firstElementChild.getBoundingClientRect().top)<2))`));
  await screenshot(`docs/previews/benchmark-cases-${width}.png`);
 }
 await evaluate(`document.querySelector('#language-toggle').click();document.querySelector('#theme-select').value='dark';document.querySelector('#theme-select').dispatchEvent(new Event('change'));document.querySelector('.benchmark-examples').scrollIntoView({behavior:'instant'})`);await wait(400);
 assert((await evaluate(`document.querySelector('#benchmark-videos').innerText`)).includes('五种姿态'));
 await screenshot('docs/previews/benchmark-cases-mobile-zh-dark.png');
 assert.equal(events.filter(e=>e.method==='Runtime.exceptionThrown').length,0);
 console.log('PASS: 18 native-resolution reference videos load/play; three single-row rails; lazy loading; navigation; offscreen/manual pause; bilingual and responsive layouts.');
}finally{await close()}
