import assert from 'node:assert/strict';
import {go,evaluate,viewport,until,wait,screenshot,close,events} from './browser-client.mjs';
try {
  await viewport(1440,1000);
  await go();
  await evaluate(`if(document.documentElement.lang.startsWith('zh'))document.querySelector('#language-toggle').click();document.querySelector('#theme-select').value='light';document.querySelector('#theme-select').dispatchEvent(new Event('change'));`);
  assert.equal(await evaluate(`document.querySelector('#method').nextElementSibling.id`),'future');
  assert.equal(await evaluate(`document.querySelector('#future-title').textContent`),'Build on Anchor 1');
  assert.equal(await evaluate(`document.querySelectorAll('#future video').length`),2);
  await evaluate(`document.querySelector('#future').scrollIntoView()`);
  await until(`[...document.querySelectorAll('#future video')].every(v=>v.readyState>=2&&!v.paused)`,60000);
  const media=await evaluate(`[...document.querySelectorAll('#future video')].map(v=>({width:v.videoWidth,height:v.videoHeight,duration:v.duration,muted:v.muted,loop:v.loop,controls:v.controls}))`);
  for(const v of media){assert.equal(v.width,3840);assert.equal(v.height,2160);assert(v.muted&&v.loop&&v.controls);}
  assert(Math.abs(media[0].duration-20.1)<.1);assert(Math.abs(media[1].duration-18.6667)<.1);
  await evaluate(`document.querySelector('#future video').pause()`);await wait(200);
  await evaluate(`scrollTo(0,0)`);await until(`[...document.querySelectorAll('#future video')].every(v=>v.paused)`);
  await evaluate(`document.querySelector('#future').scrollIntoView()`);await until(`!document.querySelectorAll('#future video')[1].paused`);
  assert(await evaluate(`document.querySelector('#future video').paused`));
  for(const width of [1440,1024,390]){
    await viewport(width,1000,width===390);await evaluate(`document.querySelector('#future').scrollIntoView()`);await wait(250);
    const layout=await evaluate(`(()=>{const cards=[...document.querySelectorAll('.future-card')].map(e=>e.getBoundingClientRect());return {sameRow:Math.abs(cards[0].top-cards[1].top)<2,overflow:document.documentElement.scrollWidth>innerWidth}})()`);
    assert.equal(layout.sameRow,width>640);assert.equal(layout.overflow,false);
    await screenshot(`docs/previews/future-${width}.png`);
  }
  await evaluate(`document.querySelector('#language-toggle').click();document.querySelector('#theme-select').value='dark';document.querySelector('#theme-select').dispatchEvent(new Event('change'))`);
  assert.equal(await evaluate(`document.querySelector('#future-title').textContent`),'基于 Anchor 1 持续拓展');
  await screenshot('docs/previews/future-mobile-zh-dark.png');
  assert.equal(events.filter(e=>e.method==='Runtime.exceptionThrown').length,0);
  console.log('PASS: Future order/navigation, 4K videos, autoplay, offscreen and manual pause, desktop/tablet/mobile, bilingual and dark theme.',media);
}finally{await close();}
