import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import {createPulse,parseForce,ForceCue} from '../src/demo/disturbance.ts';
const root=new URL('../',import.meta.url);
const sha=b=>createHash('sha256').update(b).digest('hex');
const near=(a,b)=>assert(Math.abs(a-b)<1e-10,`${a} != ${b}`);

test('force input accepts fractions and boundaries, rejects empty/non-finite/out-of-range values',()=>{
 for(const value of ['0','12.5','50','60','0.0001'])assert.equal(parseForce(value),Number(value));
 for(const value of ['', ' ', '-1','60.001','NaN','Infinity','abc'])assert.equal(parseForce(value),null);
});

test('actual force has the requested magnitude and robot-relative direction at multiple headings',()=>{
 const axes={forward:[1,0],back:[-1,0],left:[0,1],right:[0,-1]};
 for(const heading of [0,Math.PI/2,-Math.PI/2,Math.PI,1.23])for(const force of [0,12.5,50,60])for(const [direction,[x,y]] of Object.entries(axes)){
  const p=createPulse(direction,force,[Math.cos(heading/2),0,0,Math.sin(heading/2)],4);
  near(Math.hypot(...p.force),force);near(p.force[0],force*(Math.cos(heading)*x-Math.sin(heading)*y));near(p.force[1],force*(Math.sin(heading)*x+Math.cos(heading)*y));near(p.until,4.1);
 }
 for(const force of [-1,61,NaN,Infinity])assert.equal(createPulse('left',force,[1,0,0,0],0),null);
 assert.equal(createPulse('toString',50,[1,0,0,0],0),null);
});

test('adapted published worker sets the real pulse and acknowledges it; 50 N retains original behavior',async()=>{
 const original=await readFile(new URL('dist/demo/assets/sim.worker-B2q0D_ik.js',root),'utf8');
 const adapted=await readFile(new URL('dist/demo/assets/sim.worker-interactive.js',root),'utf8');
 const originalPush=original.match(/function Dl\(n\)\{.*?\}(?=async function mp\()/s)[0];
 const adaptedPush=adapted.slice(adapted.indexOf('function Dl('),adapted.indexOf('async function mp('));
 const ctx=()=>vm.createContext({createPulse,bt:[1],Y:{xquat:[0,0,0,0,Math.cos(.6),0,0,Math.sin(.6)],time:2},In:null,jo:7,Dn:3,vr:true,events:[],Fr(e){this.events.push(e);}});
 const a=ctx(),b=ctx();vm.runInContext(originalPush,a);vm.runInContext(adaptedPush,b);
 for(const direction of ['forward','back','left','right']){
  vm.runInContext(`Dl('${direction}')`,a);const event=vm.runInContext(`Dl('${direction}',50)`,b);
  assert.deepEqual(JSON.parse(JSON.stringify(a.In)),JSON.parse(JSON.stringify(b.In)));
  assert.equal(event.bodyId,1);assert.equal(event.runId,7);assert.equal(event.epoch,3);assert.equal(event.endTime-event.startTime,.10000000000000009);
 }
 const handler=adapted.slice(adapted.indexOf('case"push":'),adapted.indexOf('case"rollout":'));
 b.Fr=e=>b.events.push(e);
 for(const force of [0,12.5,60]){
  b.n={type:'push',direction:'right',force,runId:7,epoch:3};vm.runInContext(`switch(n.type){${handler}}`,b);
  near(Math.hypot(...b.In.force),force);assert.equal(b.events.at(-1).forceN,force);
 }
 const count=b.events.length;
 for(const command of [{runId:6},{epoch:2},{force:61},{force:NaN}]){b.n={type:'push',direction:'left',force:20,runId:7,epoch:3,...command};vm.runInContext(`switch(n.type){${handler}}`,b);}
 b.vr=false;b.n={type:'push',direction:'left',force:20,runId:7,epoch:3};vm.runInContext(`switch(n.type){${handler}}`,b);assert.equal(b.events.length,count);
 // Physics still applies In.force to exactly the original body slot.
 assert(adapted.includes('Y.xfrc_applied.set(In.force,bt[0]*6)'));
 const record=JSON.parse(await readFile(new URL('source/demo-worker-build.json',root)));
 assert.equal(sha(original),record.sourceSha256);assert.equal(sha(adapted),record.outputSha256);
 assert.equal(sha(await readFile(new URL('dist/demo/assets/demo-disturbance.js',root))),record.helperSha256);
});

test('arrow remains during force, fades afterwards, freezes paused/hidden and replaces previous cues',()=>{
 const cue=new ForceCue(),event={forceN:50,startTime:2,endTime:2.1,runId:1};cue.show(event);
 assert.equal(cue.advance(2.05,.5,true,false),1);
 near(cue.advance(2.1,.45,true,false),.5);
 near(cue.advance(2.1,5,false,false),.5);near(cue.advance(2.1,5,true,true),.5);
 cue.show({...event,forceN:12.5});assert.equal(cue.advance(2.05,0,true,false),1);
 cue.show({...event,forceN:0});assert.equal(cue.event,null);
 cue.show(event);assert.equal(cue.advance(2.2,1,true,false),0);assert.equal(cue.event,null);
 cue.show(event);cue.clear();assert.equal(cue.event,null);
});
