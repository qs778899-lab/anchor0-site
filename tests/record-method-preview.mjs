// Record actual browser frames with their timestamps; do not accelerate the relay.
import {mkdir,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {cdp,evaluate,wait,until,viewport,go,close,events} from './browser-client.mjs';
const directory='.cache/method-relay-recording';
try{
  await mkdir(directory,{recursive:true});
  await viewport(1440,1100);
  await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await go();await evaluate(`localStorage.removeItem('anchor-navigation-position');localStorage.setItem('anchor-language','en');localStorage.setItem('anchor-theme','light')`);await go();
  await evaluate(`document.querySelector('#method .paper-figure').scrollIntoView({behavior:'instant',block:'center'})`);
  await until(`document.querySelector('[data-surface="inline"]')?.dataset.maskReady==='true'`);
  events.length=0;
  await cdp('Page.startScreencast',{format:'jpeg',quality:90,maxWidth:1440,maxHeight:1100,everyNthFrame:2});
  await evaluate(`document.querySelector('.method-flow-toggle').click();document.activeElement.blur()`);
  const frames=[],start=Date.now();
  while(Date.now()-start<33000){
    await wait(20);
    for(const event of events.splice(0)){
      if(event.method!=='Page.screencastFrame')continue;
      const {data,sessionId,metadata}=event.params;
      await cdp('Page.screencastFrameAck',{sessionId});
      const name=`frame-${String(frames.length).padStart(5,'0')}.jpg`;
      await writeFile(`${directory}/${name}`,Buffer.from(data,'base64'));
      frames.push({name,time:metadata.timestamp});
    }
  }
  await cdp('Page.stopScreencast');
  if(frames.length<100)throw new Error('Too few browser frames recorded');
  let concat='ffconcat version 1.0\n';
  frames.forEach((frame,index)=>{concat+=`file '${frame.name}'\nduration ${Math.max(.001,frames[index+1]?frames[index+1].time-frame.time:1/30).toFixed(6)}\n`;});
  concat+=`file '${frames.at(-1).name}'\n`;
  await writeFile(`${directory}/frames.ffconcat`,concat);
  await mkdir('docs/previews',{recursive:true});
  const output='docs/previews/method-relay-motion.mp4';
  const result=spawnSync(process.env.FFMPEG||'ffmpeg',['-hide_banner','-loglevel','error','-y','-safe','0','-i',`${directory}/frames.ffconcat`,'-vf','fps=30,format=yuv420p','-c:v','libx264','-crf','20','-preset','medium','-movflags','+faststart',output],{stdio:'inherit'});
  if(result.status!==0)throw result.error||new Error('Preview encoding failed');
  const record={source:'Chrome Page.screencastFrame',frames:frames.length,seconds:frames.at(-1).time-frames[0].time,viewport:[1440,1100],fps:30,speed:1,output};
  await writeFile('docs/previews/method-relay-recording.json',JSON.stringify(record,null,2)+'\n');
  console.log(JSON.stringify(record));
}finally{await close();}
