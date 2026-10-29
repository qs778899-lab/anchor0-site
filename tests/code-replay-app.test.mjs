import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {duration} from '../dist/code/replay.js';
const code=await readFile(new URL('../dist/code/app.js',import.meta.url),'utf8');
const manifest=JSON.parse(await readFile(new URL('../dist/code/assets/manifest.json',import.meta.url)));
class Target{
 listeners=new Map();attributes={};hidden=false;textContent='';style={};
 addEventListener(name,fn){const list=this.listeners.get(name)||[];list.push(fn);this.listeners.set(name,list);}
 fire(name,data={}){for(const fn of this.listeners.get(name)||[])fn({target:this,preventDefault(){},stopPropagation(){},...data});}
 setAttribute(k,v){this.attributes[k]=v;}getAttribute(k){return this.attributes[k];}focus(){}append(){}
}
async function setup({reduced=false,lang='en',failFetch=false}={}){
 const elements=new Map(),document=new Target(),window=new Target(),media=new Target();
 document.hidden=false;document.documentElement={};document.body=new Target();document.getElementById=id=>{if(!elements.has(id))elements.set(id,new Target());return elements.get(id);};document.createElement=()=>new Target();
 media.matches=reduced;let draws=[],disposed=0,loads=0,failed=failFetch,raf=new Map(),rafId=0,observer;
 const preferences=new Map([['anchor-language',lang]]);
 const ctx={document,window,location:{search:''},matchMedia:()=>media,localStorage:{getItem:k=>preferences.get(k)},IntersectionObserver:class{constructor(fn){observer=fn;}observe(){}},requestAnimationFrame:fn=>{const id=++rafId;raf.set(id,fn);return id;},cancelAnimationFrame:id=>raf.delete(id),fetch:async()=>({ok:!failed,status:failed?503:200,json:async()=>manifest}),createViewer:async()=>{loads++;return{loadClip:async()=>({}),setClip(){},resize(){},draw:t=>draws.push(t),dispose:()=>disposed++,setActive(){},reset(){}};},duration,URL,URLSearchParams,console:{error(){}},performance:{now:()=>0}};
 const body=code.replace(/^import .*;\n/gm,'').replace('await import(\'./viewer.js\')','({createViewer})').replaceAll('import.meta.url',JSON.stringify('http://localhost/code/app.js'));
 await vm.runInNewContext(`(async()=>{${body}})()`,ctx);
 return {document,window,media,el:id=>elements.get(id),preferences,draws,get disposed(){return disposed;},get loads(){return loads;},setFail:x=>failed=x,
 tick:now=>{const entries=[...raf.values()];raf.clear();entries.forEach(fn=>fn(now));},get frames(){return raf.size;},observer:x=>observer([{isIntersecting:x}])};
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
test('pause, hidden page and offscreen resume retain presentation time',async()=>{
 const s=await setup();s.tick(0);s.tick(100);assert.equal(s.draws.at(-1),.1);
 s.el('viewer').fire('keydown',{code:'Space'});assert.equal(s.frames,0);assert.match(s.el('pause').getAttribute('aria-label'),/Play/);
 s.el('viewer').fire('keydown',{code:'Space'});s.tick(1000);s.tick(1100);assert.equal(s.draws.at(-1),.2);
 s.document.hidden=true;s.document.fire('visibilitychange');assert.equal(s.frames,0);
 s.document.hidden=false;s.document.fire('visibilitychange');s.tick(9000);assert.equal(s.draws.at(-1),.2);
 s.observer(false);assert.equal(s.frames,0);s.observer(true);s.tick(20000);assert.equal(s.draws.at(-1),.2);
});
test('reduced motion starts paused and explicit play works; language updates do not reload',async()=>{
 const s=await setup({reduced:true});assert.equal(s.frames,0);s.el('pause').fire('click');assert.equal(s.frames,1);
 s.preferences.set('anchor-language','zh');s.window.fire('storage',{key:'anchor-language'});assert.equal(s.document.documentElement.lang,'zh-CN');assert.equal(s.loads,1);assert.match(s.el('viewer').getAttribute('aria-label'),/四倍速/);
 s.media.fire('change',{matches:true});assert.equal(s.frames,0);
});
test('resource failure and context loss both expose retry and recover cleanly',async()=>{
 const s=await setup({failFetch:true});assert.equal(s.el('retry').hidden,false);assert.equal(s.loads,0);
 s.setFail(false);s.el('retry').fire('click');await settle();assert.equal(s.loads,1);assert.equal(s.el('retry').hidden,true);
 s.el('viewer').fire('rendererror',{detail:Error('context lost')});assert.equal(s.disposed,1);assert.equal(s.el('retry').hidden,false);
 s.el('retry').fire('click');await settle();assert.equal(s.loads,2);assert.equal(s.el('retry').hidden,true);
});
