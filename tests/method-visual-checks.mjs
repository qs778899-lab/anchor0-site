import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {cdp,evaluate,wait} from './browser-client.mjs';

export async function verifyMethodEmphasis() {
  const measured=await evaluate(`(async()=>{
    const {METHOD_FLOWS}=await import('./method-flow-paths.js');
    const svg=document.querySelector('[data-surface="inline"]');
    const read=async(src)=>{const image=new Image();image.src=src;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);return ctx.getImageData(0,0,canvas.width,canvas.height).data;};
    const source=await read(svg.previousElementSibling.src),fade=await read(svg.querySelector('.method-flow-fade').getAttribute('href'));
    const exact=await read(svg.querySelector('mask image').getAttribute('href'));
    const aura=await read(svg.querySelector('[id="method-flow-aura-inline"] image').getAttribute('href'));
    const color=(pixels,x,y)=>{const i=(Math.round(y)*2314+Math.round(x))*4,a=pixels[i+3]/255;return [0,1,2].map(c=>pixels[i+c]*a+255*(1-a));};
    const range=[];const failures=[];let shafts=0,heads=0;
    const retain=(x,y,nx,ny,radius)=>{
      const at=(Math.round(y)*2314+Math.round(x))*4;if(fade[at+3]!==255)return null;
      const one=color(source,x+nx*radius,y+ny*radius),two=color(source,x-nx*radius,y-ny*radius);
      if(one.some((c,i)=>Math.abs(c-two[i])>3))return null;
      const bg=one.map((c,i)=>(c+two[i])/2),old=color(source,x,y),changed=color(fade,x,y),direction=old.map((c,i)=>c-bg[i]);
      const divisor=direction.reduce((sum,c)=>sum+c*c,0);if(divisor<1000)return null;
      return changed.reduce((sum,c,i)=>sum+(c-bg[i])*direction[i],0)/divisor;
    };
    for(const flow of METHOD_FLOWS){
      const path=svg.querySelector('[data-flow="'+flow.id+'"]'),length=path.getTotalLength();
      let found=false;
      for(let d=length*.35;d<length*.8;d+=1){
        const p=path.getPointAtLength(d),q=path.getPointAtLength(d+1),dx=Math.sign(q.x-p.x),dy=Math.sign(q.y-p.y);
        if(dx&&dy)continue;
        const fraction=retain(p.x,p.y,-dy,dx,8);
        if(fraction===null)continue;
        range.push(fraction);if(Math.abs(fraction-.3)>.025)failures.push({id:flow.id,shaft:fraction});
        found=true;shafts++;break;
      }
      if(!found)failures.push({id:flow.id,reason:'shaft sample missing'});
      if(flow.arrowhead!==false){
        const end=path.getPointAtLength(length),previous=path.getPointAtLength(length-1),dx=Math.sign(end.x-previous.x),dy=Math.sign(end.y-previous.y);
        let fraction=null;
        // Nearby parallel arrows can occupy one background probe; sample farther along the head.
        for(const depth of [9,15,19]){fraction=retain(end.x+dx*depth,end.y+dy*depth,-dy,dx,21);if(fraction!==null)break;}
        if(fraction===null||Math.abs(fraction-.3)>.025)failures.push({id:flow.id,head:fraction});else{heads++;range.push(fraction);}
      }
    }
    let expanded=0,unbounded=0,darkened=0,dropped=0,minimumBackground=255;
    for(let i=0;i<aura.length;i+=4){
      if(exact[i+3]>aura[i+3])dropped++;
      if(!aura[i+3]||exact[i+3])continue;
      expanded++;const pixel=i/4,x=pixel%2314,y=Math.floor(pixel/2314),rgb=color(source,x,y);
      minimumBackground=Math.min(minimumBackground,...rgb);
      if(rgb.some(c=>c<220))darkened++;
      let nearby=false;
      for(let step=-7;step<=7&&!nearby;step++){
        if(x+step>=0&&x+step<2314&&exact[(y*2314+x+step)*4+3])nearby=true;
        if(y+step>=0&&y+step<1585&&exact[((y+step)*2314+x)*4+3])nearby=true;
      }
      if(!nearby)unbounded++;
    }
    const tipFailures=[];
    for(const flow of METHOD_FLOWS.filter(f=>f.arrowhead!==false)){
      const path=svg.querySelector('[data-flow="'+flow.id+'"]'),tip=svg.querySelector('[data-flow-tip="'+flow.id+'"]');
      const expected=(parseFloat(path.style.getPropertyValue('--flow-phase'))+path.getTotalLength())%128;
      if(!tip||Math.abs(parseFloat(tip.style.getPropertyValue('--flow-phase'))-expected)>.01)tipFailures.push(flow.id);
    }
    const main=getComputedStyle(svg.querySelector('[data-flow]')),core=getComputedStyle(svg.querySelector('.method-flow-core')),halo=getComputedStyle(svg.querySelector('.method-flow-aura'));
    return {shafts,heads,failures,min:Math.min(...range),max:Math.max(...range),width:main.strokeWidth,core:core.strokeWidth,dash:main.strokeDasharray,halo:halo.strokeWidth,expanded,unbounded,darkened,dropped,minimumBackground,tipFailures};
  })()`);
  assert.deepEqual(measured.failures,[]);assert.equal(measured.shafts,32);assert.equal(measured.heads,31);
  assert.equal(measured.width,'9px');assert.equal(measured.core,'2.5px');assert.equal(measured.halo,'18px');assert.equal(measured.dash,'64px, 64px');
  assert(measured.expanded>20000);assert.equal(measured.unbounded,0);assert.equal(measured.darkened,0);assert.equal(measured.dropped,0);assert.deepEqual(measured.tipFailures,[]);
  console.log(`PASS: all 32 shafts and 31 fixed heads retain approximately 30% contrast (${measured.min.toFixed(3)}–${measured.max.toFixed(3)}); 9 px streams, 2.5 px cores, synchronized tips`);
  console.log(`PASS: ${measured.expanded} added glow-mask pixels stay within 7 source pixels of the original arrows, only on light background (minimum channel ${measured.minimumBackground.toFixed(1)})`);

  // Compare actual browser screenshots, not a regenerated copy of the figure.
  // The aura mask contains only exact arrows and verified adjacent background.
  // A 2-screen-pixel tolerance accounts for browser resampling of that bounded mask.
  await evaluate(`document.querySelector('.method-flow-toggle').click();document.activeElement.blur()`);
  const bounds=await evaluate(`(()=>{const b=document.querySelector('#method .method-flow-surface>img').getBoundingClientRect();return {x:b.x,y:b.y+scrollY,width:b.width,height:b.height,scale:1};})()`);
  const capture=async()=> (await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:bounds})).data;
  await evaluate(`document.querySelector('[data-surface="inline"]').style.opacity='0'`);await wait(50);
  const before=await capture();await writeFile('.cache/preview/method-bright-original.png',Buffer.from(before,'base64'));
  await evaluate(`document.querySelector('[data-surface="inline"]').style.opacity=''`);
  let changed=0,lastPhase=null,temporalChanges=0;
  for(const phase of [0,32,64,96]){
    await evaluate(`document.querySelector('[data-surface="inline"]').style.setProperty('--flow-offset','-${phase}px')`);await wait(35);
    const after=await capture();
    if(phase===32)await writeFile('.cache/preview/method-bright-figure.png',Buffer.from(after,'base64'));
    const result=await evaluate(`(async()=>{
      const load=async(src)=>{const im=new Image();im.src=src;await im.decode();return im;};
      const a=await load('data:image/png;base64,${before}'),b=await load('data:image/png;base64,${after}');
      const mask=await load(document.querySelector('[id="method-flow-aura-inline"] image').getAttribute('href'));
      const canvas=document.createElement('canvas');canvas.width=a.width;canvas.height=a.height;
      const ctx=canvas.getContext('2d',{willReadFrequently:true});
      ctx.drawImage(a,0,0);const before=ctx.getImageData(0,0,a.width,a.height).data;
      ctx.clearRect(0,0,a.width,a.height);ctx.drawImage(b,0,0);const after=ctx.getImageData(0,0,a.width,a.height).data;
      ctx.clearRect(0,0,a.width,a.height);ctx.drawImage(mask,0,0,a.width,a.height);const allowed=ctx.getImageData(0,0,a.width,a.height).data;
      let previous=null;
      ${lastPhase?`ctx.clearRect(0,0,a.width,a.height);ctx.drawImage(await load('data:image/png;base64,${lastPhase}'),0,0);previous=ctx.getImageData(0,0,a.width,a.height).data;`:''}
      let changed=0,outside=0,temporal=0;const examples=[];
      for(let y=0;y<a.height;y++)for(let x=0;x<a.width;x++){
        const at=(y*a.width+x)*4;
        if(previous&&[0,1,2].some(c=>Math.abs(previous[at+c]-after[at+c])>8))temporal++;
        if([0,1,2].every(c=>Math.abs(before[at+c]-after[at+c])<=1))continue;
        changed++;let arrow=false;
        for(let yy=Math.max(0,y-2);yy<=Math.min(a.height-1,y+2)&&!arrow;yy++)for(let xx=Math.max(0,x-2);xx<=Math.min(a.width-1,x+2);xx++)if(allowed[(yy*a.width+xx)*4+3]>0){arrow=true;break;}
        if(!arrow){outside++;if(examples.length<4)examples.push([x,y]);}
      }
      return {changed,outside,examples,temporal};
    })()`);
    assert.equal(result.outside,0,JSON.stringify(result));changed+=result.changed;
    if(lastPhase){assert(result.temporal>5000,'Flow must visibly move between rendered phases');temporalChanges+=result.temporal;}
    lastPhase=after;
  }
  console.log(`PASS: four rendered phases changed ${changed} arrow-region pixels and zero pixels outside the safe mask; ${temporalChanges} visible changes between phases`);
  await evaluate(`document.querySelector('.method-flow-toggle').click()`);
}
