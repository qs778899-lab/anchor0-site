import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {cdp,evaluate,wait,until,viewport,go,screenshot,close,events} from './browser-client.mjs';
const rail='#comparison-clips',dialog='#video-dialog';
const seek=async(selector,time=2)=>{
  await evaluate(`{const v=document.querySelector('${selector}');v.pause();v.currentTime=${time};}`);
  await until(`(()=>{const v=document.querySelector('${selector}');return !v.seeking&&v.readyState>=2&&Math.abs(v.currentTime-${time})<.02;})()`);
};
const edges=selector=>evaluate(`(()=>{
  const v=document.querySelector('${selector}'),c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;
  const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(v,0,0);
  const mean=x=>{const a=ctx.getImageData(x,12,4,c.height-24).data;let total=0;for(let i=0;i<a.length;i+=4)total+=(a[i]+a[i+1]+a[i+2])/3;return total/(a.length/4);};
  return {width:c.width,height:c.height,left:mean(2),right:mean(c.width-6),speed:v.playbackRate};
})()`);
const checkFrame=async selector=>{const f=await edges(selector);assert.equal(f.width,1610);assert.equal(f.height,906);assert(f.left>20&&f.right>20,JSON.stringify(f));assert.equal(f.speed,1);return f;};
try{
  await mkdir('.cache/preview',{recursive:true});await viewport(1440,1000);await go();
  await evaluate(`localStorage.removeItem('anchor-navigation-position');localStorage.setItem('anchor-language','en');localStorage.setItem('anchor-theme','light')`);await go();
  await evaluate(`document.querySelector('#videos').scrollIntoView({behavior:'instant'})`);
  const clips=await evaluate(`(async()=>{const m=await (await fetch('./data/video-clips.json')).json();return m.groups.find(g=>g.id==='comparison').clips;})()`);
  for(const clip of clips){
    const selector=`[data-video="${clip.id}"] video`;
    await evaluate(`document.querySelector('${selector}').scrollIntoView({behavior:'instant',block:'center'})`);
    await until(`document.querySelector('${selector}').readyState>=2&&!document.querySelector('${selector}').paused`);await seek(selector);await checkFrame(selector);
    assert(await evaluate(`(()=>{const v=document.querySelector('${selector}');return v.currentSrc.endsWith('?v=${clip.revision}')&&v.poster.endsWith('?v=${clip.posterRevision}');})()`));
    assert(await evaluate(`(async()=>{const i=new Image();i.src=document.querySelector('${selector}').poster;await i.decode();return i.naturalWidth===960&&Math.abs(i.naturalWidth/i.naturalHeight-1610/906)<.005;})()`));
  }
  console.log('PASS: all nine clips and posters load new revisions at the cropped ratio; decoded frames contain scene pixels at both edges');
  await seek('[data-video="comparison-standing"] video',.4);
  await evaluate(`document.querySelector('#videos').scrollIntoView({behavior:'instant'});document.querySelector('${rail}').scrollTo({left:0,behavior:'instant'});document.activeElement.blur()`);await wait(160);
  await screenshot('.cache/preview/comparison-crop-subtitle.png');
  await seek('[data-video="comparison-standing"] video',2);
  await screenshot('.cache/preview/comparison-crop-desktop.png');

  for(const [width,height,mobile,label] of [[1440,1000,false,'desktop'],[1024,900,false,'tablet'],[390,844,true,'mobile']]){
    await viewport(width,height,mobile);await evaluate(`document.querySelector('#videos').scrollIntoView({behavior:'instant'});document.querySelector('${rail}').scrollTo({left:0,behavior:'instant'})`);await wait(120);
    assert(await evaluate(`(()=>{const r=document.querySelector('${rail}'),v=r.querySelector('video'),b=v.getBoundingClientRect();return document.documentElement.scrollWidth===innerWidth&&Math.abs(b.width/b.height-1610/906)<.005;})()`));
    await screenshot(`.cache/preview/comparison-crop-${label}.png`);
    await evaluate(`document.querySelector('[data-full-video="comparison"]').click()`);
    await until(`document.querySelector('${dialog} video').readyState>=2&&!document.querySelector('${dialog} video').paused`);await seek(`${dialog} video`);await checkFrame(`${dialog} video`);
    assert(await evaluate(`(()=>{const v=document.querySelector('${dialog} video'),b=v.getBoundingClientRect();return v.currentSrc.includes('?v=')&&v.poster.includes('?v=')&&Math.abs(b.width/b.height-1610/906)<.005&&document.querySelector('#close-video').getBoundingClientRect().right<=innerWidth;})()`));
    await screenshot(`.cache/preview/comparison-crop-${label}-full.png`);
    await evaluate(`document.querySelector('${dialog} video').requestFullscreen()`);await until('!!document.fullscreenElement');
    await checkFrame(`${dialog} video`);assert(await evaluate(`document.querySelector('${dialog} video').controls`));
    if(label==='desktop')await screenshot('.cache/preview/comparison-crop-fullscreen.png');
    await evaluate('document.exitFullscreen()');await until('!document.fullscreenElement');
    await evaluate(`document.querySelector('#close-video').click()`);await until(`!document.querySelector('${dialog}').open`);
  }
  console.log('PASS: desktop, tablet and 390 px card/modal/fullscreen playback preserve native pixels and controls without horizontal overflow');
  await viewport(1440,1000);await evaluate(`document.querySelector('#language-toggle').click();document.querySelector('#theme-select').value='dark';document.querySelector('#theme-select').dispatchEvent(new Event('change'));document.querySelector('#videos').scrollIntoView({behavior:'instant'})`);await wait(100);
  await screenshot('.cache/preview/comparison-crop-dark-zh.png');
  await evaluate(`document.querySelector('[data-full-video="body-diversity"]').click()`);await until(`document.querySelector('${dialog} video').readyState>=2`);
  assert(await evaluate(`(()=>{const v=document.querySelector('${dialog} video');return v.videoWidth===1920&&v.videoHeight===1080&&v.style.aspectRatio==='';})()`));
  await evaluate(`document.querySelector('#close-video').click()`);
  assert.equal(events.filter(e=>e.method==='Runtime.exceptionThrown').length,0);
  console.log('PASS: Chinese/dark presentation, unchanged other-group modal ratio, and no JavaScript errors');
}finally{await close();}
