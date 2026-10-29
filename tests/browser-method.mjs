import assert from 'node:assert/strict';
import {readFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {METHOD_IMAGE, METHOD_FLOWS} from '../dist/method-flow-paths.js';
import {cdp, evaluate, wait, until, viewport, go, screenshot, close, events} from './browser-client.mjs';

const inline = '[data-surface="inline"]';
const modal = '[data-surface="dialog"]';
const check = async (name, expression) => {assert(await evaluate(expression), name);console.log(`PASS: ${name}`);};
const offset = selector => evaluate(`document.querySelector('${selector}').style.getPropertyValue('--flow-offset')`);
const scrollToFigure = async () => {
  await evaluate(`document.querySelector('#method .paper-figure').scrollIntoView({behavior:'instant',block:'center'})`);
  await wait(150);
};
const aligned = selector => `(()=>{const svg=document.querySelector('${selector}'),image=svg.previousElementSibling,a=svg.getBoundingClientRect(),b=image.getBoundingClientRect();return ['x','y','width','height'].every(k=>Math.abs(a[k]-b[k])<.1)&&image.naturalWidth===2314&&image.naturalHeight===1585;})()`;
const press = async (key, code, virtualKey) => {
  for (const type of ['keyDown','keyUp']) await cdp('Input.dispatchKeyEvent', {type, key, code, windowsVirtualKeyCode:virtualKey, ...(type==='keyDown'&&key==='Enter'?{text:'\r'}:{})});
};

try {
  const png = await readFile('dist/assets/images/method.png');
  assert.equal(createHash('sha256').update(png).digest('hex'), METHOD_IMAGE.sha256);
  assert.equal(png.readUInt32BE(16), METHOD_IMAGE.width);assert.equal(png.readUInt32BE(20), METHOD_IMAGE.height);
  assert.equal(new Set(METHOD_FLOWS.map(flow=>flow.id)).size, 32);
  console.log('PASS: original PNG hash and 2314 × 1585 pixels unchanged; 32 unique path segments');
  await mkdir('.cache/preview', {recursive:true});
  await viewport(1440,1000);await go();
  await until(`!!document.querySelector('${inline}')`);
  await check('offscreen diagram starts without animating', `document.querySelector('${inline}').dataset.running==='false' && getComputedStyle(document.querySelector('${inline}')).opacity==='0'`);
  await scrollToFigure();await until(`document.querySelector('${inline}').dataset.running==='true'`);

  // Check the entire highlight width against the actual PNG, including bends and arrow endpoints.
  // Read alpha before RGB: transparent gaps in the Benchmark lines are deliberately masked out.
  const pixels = await evaluate(`(async()=>{
    const {METHOD_FLOWS}=await import('./method-flow-paths.js');
    const image=document.querySelector('#method .method-flow-surface>img');await image.decode();
    const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
    const bitmap=ctx.getImageData(0,0,canvas.width,canvas.height).data;
    const failures=[];let checked=0,gaps=0;
    for(const flow of METHOD_FLOWS){
      const path=document.querySelector('${inline} [data-flow="'+flow.id+'"]');
      const expected=flow.color.slice(1).match(/../g).map(c=>parseInt(c,16));
      const length=path.getTotalLength();let coverage=0;
      for(let distance=0;distance<length;distance++){
        const point=path.getPointAtLength(distance);
        for(const dx of [-1,0,1])for(const dy of [-1,0,1]){
          const x=Math.round(point.x)+dx,y=Math.round(point.y)+dy,index=(y*canvas.width+x)*4;
          const alpha=bitmap[index+3];
          if(alpha<240){if(flow.group==='benchmark')gaps++;continue;}
          checked++;coverage++;
          if(expected.some((value,i)=>Math.abs(value-bitmap[index+i])>25))failures.push({id:flow.id,x,y});
        }
      }
      if(flow.group!=='benchmark'&&coverage<length*7)failures.push({id:flow.id,reason:'insufficient line coverage'});
    }
    return {checked,gaps,failures};
  })()`);
  assert.deepEqual(pixels.failures, []);assert(pixels.gaps>100);
  console.log(`PASS: ${pixels.checked} original line pixels match all 32 centerlines and highlight widths`);
  await check('source alpha preserves the actual dashed gaps; highlights never intercept clicks', `document.querySelector('${inline} mask').style.maskType==='alpha' && document.querySelector('${inline} mask image').getAttribute('href')===document.querySelector('#method .method-flow-surface>img').src && getComputedStyle(document.querySelector('${inline}')).pointerEvents==='none'`);
  await check('desktop overlay exactly matches the original image bounds', aligned(inline));
  const before = parseFloat(await offset(inline));await wait(130);const after = parseFloat(await offset(inline));
  const travelled = (before-after+200)%200;
  assert(travelled>6&&travelled<30);console.log('PASS: highlights travel forward at approximately 100 source pixels per second');
  await screenshot('.cache/preview/method-desktop.png');

  // Keyboard activation must not open the image or lose the deliberately paused state.
  await evaluate(`document.querySelector('.method-flow-toggle').focus()`);await press(' ','Space',32);
  await until(`document.querySelector('${inline}').dataset.running==='false'`);
  const frozen=await offset(inline);await wait(180);assert.equal(await offset(inline), frozen);
  await evaluate(`document.querySelector('#performance').scrollIntoView({behavior:'instant'})`);await wait(100);await scrollToFigure();
  await check('keyboard pause freezes the phase and survives leaving and returning', `document.querySelector('${inline}').dataset.running==='false'&&!document.querySelector('#image-dialog').open`);
  await evaluate(`document.querySelector('#method [data-zoom]').click()`);await until(`!!document.querySelector('${modal}')`);
  await check('enlarged view shares the manual pause and original-file link', `document.querySelector('${modal}').dataset.running==='false'&&document.querySelector('#image-dialog .method-flow-toggle').dataset.paused==='true'&&document.querySelector('#original-image').href===document.querySelector('#method .method-flow-surface>img').src`);
  await evaluate(`document.querySelector('#image-dialog .method-flow-toggle').focus()`);await press('Enter','Enter',13);
  await until(`document.querySelector('${modal}').dataset.running==='true'`);
  await check('only the enlarged view animates while the dialog is open', `document.querySelector('${inline}').dataset.running==='false'`);
  await check('enlarged fit-to-window overlay is aligned', aligned(modal));
  await evaluate(`document.activeElement.blur()`);await screenshot('.cache/preview/method-enlarged.png');
  await evaluate(`document.querySelector('#dialog-image').click()`);await wait(100);
  await check('original-size zoom retains a one-to-one source-pixel view', `${aligned(modal)}&&document.querySelector('#dialog-image').getBoundingClientRect().width===2314&&document.querySelector('#dialog-image').getBoundingClientRect().height===1585`);
  await evaluate(`document.querySelector('#close-image').click()`);await until(`document.querySelector('${inline}').dataset.running==='true'`);
  await check('closing restores the ordinary image viewer DOM', `!document.querySelector('${modal}')&&!document.querySelector('#image-dialog .method-flow-toggle')&&document.querySelector('#dialog-image').parentElement.className==='dialog-image-area'`);

  const background = await cdp('Target.createTarget', {url:'about:blank'});
  await cdp('Target.activateTarget', {targetId:background.targetId});await until('document.hidden');
  await until(`document.querySelector('${inline}').dataset.running==='false'`);
  const backgroundPhase=await offset(inline);await wait(200);assert.equal(await offset(inline),backgroundPhase);
  await cdp('Page.bringToFront');await until(`document.querySelector('${inline}').dataset.running==='true'`);
  await cdp('Target.closeTarget', {targetId:background.targetId});
  console.log('PASS: background tabs stop the animation clock and returning resumes');

  await evaluate(`document.querySelector('.method-flow-toggle').click();document.querySelector('#language-toggle').click();document.querySelector('#theme-select').value='dark';document.querySelector('#theme-select').dispatchEvent(new Event('change'));document.activeElement.blur()`);
  await wait(100);
  await check('Chinese and dark theme preserve pause and original image clarity', `document.documentElement.lang==='zh-CN'&&document.documentElement.dataset.theme==='dark'&&document.querySelector('.method-flow-toggle').textContent==='继续播放'&&${aligned(inline)}`);
  await evaluate(`document.querySelector('.method-flow-toggle').click();document.activeElement.blur()`);await wait(100);
  await screenshot('.cache/preview/method-dark-zh.png');
  await evaluate(`document.querySelector('#language-toggle').click();document.querySelector('#theme-select').value='light';document.querySelector('#theme-select').dispatchEvent(new Event('change'))`);

  await viewport(1024,900);await scrollToFigure();
  await check('tablet keeps original proportions without page overflow', `${aligned(inline)}&&document.documentElement.scrollWidth===innerWidth`);
  await screenshot('.cache/preview/method-tablet.png');
  await viewport(390,844,true);await scrollToFigure();
  await check('390 px mobile retains aligned vectors and accessible controls', `${aligned(inline)}&&document.documentElement.scrollWidth===innerWidth&&document.querySelector('.method-flow-toggle').getBoundingClientRect().right<=innerWidth`);
  await screenshot('.cache/preview/method-mobile.png');
  await evaluate(`document.querySelector('#method [data-zoom]').click()`);await until(`document.querySelector('${modal}')?.dataset.running==='true'`);
  await check('mobile enlarged image fits and its toolbar stays within the screen', `${aligned(modal)}&&document.querySelector('#close-image').getBoundingClientRect().right<=innerWidth&&document.querySelector('#image-dialog .method-flow-toggle').getBoundingClientRect().left>=0`);
  await check('mobile fit view stays vertically centered like the original viewer', `(()=>{const area=document.querySelector('.method-flow-area').getBoundingClientRect(),image=document.querySelector('#dialog-image').getBoundingClientRect();return Math.abs(image.top+image.height/2-area.top-area.height/2)<1;})()`);
  await evaluate(`document.activeElement.blur()`);await screenshot('.cache/preview/method-mobile-enlarged.png');
  await evaluate(`document.querySelector('#dialog-image').click()`);await wait(100);
  await cdp('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
  const touch = await evaluate(`(()=>{const b=document.querySelector('.method-flow-area').getBoundingClientRect();return{x:b.right-30,y:b.top+100};})()`);
  await cdp('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touch]});
  for(let i=1;i<=8;i++){await cdp('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:touch.x-i*30,y:touch.y}]});await wait(20);}
  await cdp('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await until(`document.querySelector('.method-flow-area').scrollLeft>100`);
  await check('touch pans the original-resolution diagram with its overlay', `${aligned(modal)}&&document.querySelector('#dialog-image').classList.contains('expanded')&&document.documentElement.scrollWidth===innerWidth`);
  await evaluate(`document.querySelector('.method-flow-area').scrollLeft=10000`);await wait(50);
  await check('the far right of the enlarged diagram remains reachable', `(()=>{const a=document.querySelector('.method-flow-area');return Math.abs(a.scrollLeft+a.clientWidth-a.scrollWidth)<2;})()`);
  await evaluate(`document.querySelector('#close-image').click()`);

  // A non-METHOD figure must retain the existing viewer behavior and contain no new controls.
  await evaluate(`document.querySelector('[data-zoom="./assets/images/hardware-thresholds.jpg"]').click()`);
  await until(`document.querySelector('#dialog-image').complete`);
  await check('other figures retain the original image viewer unchanged', `document.querySelector('#image-dialog').open&&!document.querySelector('${modal}')&&!document.querySelector('#image-dialog .method-flow-toggle')&&!document.querySelector('#image-dialog').classList.contains('method-flow-dialog')`);
  await evaluate(`document.querySelector('#close-image').click()`);

  await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await go();await scrollToFigure();
  await check('reduced-motion mode defaults to the untouched static figure', `document.querySelector('${inline}').dataset.running==='false'&&getComputedStyle(document.querySelector('${inline}')).opacity==='0'&&document.querySelector('.method-flow-toggle').textContent==='Play animation'`);
  await evaluate(`document.querySelector('.method-flow-toggle').click()`);await until(`document.querySelector('${inline}').dataset.running==='true'`);
  console.log('PASS: an explicit play action works with reduced motion enabled');
  assert.equal(events.filter(e=>e.method==='Runtime.exceptionThrown').length,0,JSON.stringify(events.filter(e=>e.method==='Runtime.exceptionThrown').map(e=>e.params.exceptionDetails.exception?.description)));
  console.log('PASS: no browser JavaScript exceptions');
} finally {await close();}
