import assert from 'node:assert/strict';
import {cdp,evaluate,go,viewport,until,wait,close,events} from './browser-client.mjs';
try {
 await viewport(1440,1000);await go();await until(`!document.querySelector('#scenes-video').paused`);
 const time=await evaluate(`document.querySelector('#scenes-video').currentTime`);
 const other=await cdp('Target.createTarget',{url:'about:blank'});
 await cdp('Target.activateTarget',{targetId:other.targetId});await until(`document.hidden`);
 assert(await evaluate(`document.querySelector('#scenes-video').paused`));console.log('PASS: switching to another browser tab pauses video');
 await cdp('Page.bringToFront');await until(`!document.hidden&&!document.querySelector('#scenes-video').paused`);
 assert(await evaluate(`document.querySelector('#scenes-video').currentTime>=${time}`));console.log('PASS: returning to the tab resumes from the same position');
 await cdp('Target.closeTarget',{targetId:other.targetId});
 await evaluate(`document.querySelector('#scenes-video').currentTime=document.querySelector('#scenes-video').duration-.15`);await until(`document.querySelector('#scenes-video').ended`);
 await evaluate(`document.querySelector('#performance').scrollIntoView({behavior:'instant'})`);await wait(100);await evaluate(`document.querySelector('#scenes-video').scrollIntoView({behavior:'instant',block:'center'})`);await wait(300);
 assert(await evaluate(`document.querySelector('#scenes-video').paused&&document.querySelector('#scenes-video').ended`));console.log('PASS: the main film stays finished after leaving and returning');
 await evaluate(`document.querySelector('#videos').scrollIntoView({behavior:'instant'})`);await until(`!document.querySelector('.clip-card video').paused`);
 await evaluate(`{const v=document.querySelector('.clip-card video');v.currentTime=v.duration-.1;}`);await until(`document.querySelector('.clip-card video').currentTime<1`);
 assert(await evaluate(`!document.querySelector('.clip-card video').paused`));console.log('PASS: short clips loop at normal playback speed');
 for(let index=0;index<15;index++){
   await evaluate(`document.querySelectorAll('.clip-card video')[${index}].scrollIntoView({behavior:'instant',block:'center'})`);
   await until(`!document.querySelectorAll('.clip-card video')[${index}].paused && document.querySelectorAll('.clip-card video')[${index}].currentTime>0`);
   await evaluate(`{const v=document.querySelectorAll('.clip-card video')[${index}];v.currentTime=v.duration-.12;}`);
   await until(`document.querySelectorAll('.clip-card video')[${index}].currentTime<1`);
 }
 console.log('PASS: every one of the 15 clips loads, plays and loops in the browser');
 const injected=await cdp('Page.addScriptToEvaluateOnNewDocument',{source:`const realPlay=HTMLMediaElement.prototype.play;window.allowTestPlayback=false;HTMLMediaElement.prototype.play=function(){return window.allowTestPlayback?realPlay.call(this):Promise.reject(new DOMException('Autoplay blocked by test policy','NotAllowedError'));};`});
 await go();await evaluate(`window.scrollTo({top:0,behavior:'instant'})`);await wait(300);
 assert(await evaluate(`document.querySelector('#scenes-video').paused&&!document.querySelector('.hero-video .video-cover').hidden`));console.log('PASS: blocked autoplay exposes the manual play button');
 await evaluate(`window.allowTestPlayback=true;document.querySelector('.hero-video .video-cover').click()`);await until(`!document.querySelector('#scenes-video').paused`);
 console.log('PASS: manual playback recovers from autoplay rejection');await cdp('Page.removeScriptToEvaluateOnNewDocument',{identifier:injected.identifier});
 assert.equal(events.filter(e=>e.method==='Runtime.exceptionThrown').length,0);console.log('PASS: no browser errors in media edge cases');
} finally {await close();}
