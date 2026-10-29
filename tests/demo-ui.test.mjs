import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {messages,t,setLanguage,setTheme,syncPreferences,workerText,validationMessage} from '../src/demo/i18n.ts';
import {normalizeDraft,textLayout} from '../src/demo/sequence.ts';
import {InkTrace} from '../src/demo/ink.ts';
const root=new URL('../',import.meta.url),sha=v=>createHash('sha256').update(v).digest('hex');
test('every UI translation has matching parameters and English has no untranslated Chinese',()=>{
 for(const [key,[en,zh]] of Object.entries(messages)){
  assert(en&&zh,key);assert(!/[\u4e00-\u9fff]/.test(en),key);
  assert.deepEqual([...en.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort(),[...zh.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort(),key);
 }
});
test('shared preferences, validation and worker status stay bilingual',()=>{
 const values=new Map();globalThis.localStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
 setLanguage('en');setTheme('dark');assert.equal(values.get('anchor-language'),'en');assert.equal(values.get('anchor-theme'),'dark');
 assert.equal(t('play'),'Play');assert.equal(workerText('读取资源清单'),'Reading resource list');assert.equal(workerText('模型已从本机缓存读取 · 加载机器人资源 3/3'),'Policy model ready · Preparing robot resources 3/3');
 assert(!/[\u4e00-\u9fff]/.test(workerText('资源加载失败：motions/letter-A.json')));
 assert.match(validationMessage('123'),/Enter|Use/);assert.match(validationMessage('A'.repeat(33)),/32/);
 values.set('anchor-language','zh');syncPreferences();assert.equal(t('play'),'播放');assert.equal(workerText('读取资源清单'),'读取资源清单');
 values.delete('anchor-language');syncPreferences();assert.equal(t('play'),'Play');delete globalThis.localStorage;
});
test('word composition preserves spaces and ink never bridges lifts, dropped frames or runs',()=>{
 assert.equal(normalizeDraft('coming soon ♥'),'COMING SOON ♡');const layout=textLayout('COMING SOON');assert.equal(layout.letters.length,10);assert.equal(layout.transfers,10);assert.equal(layout.spaces,1);
 const ink=new InkTrace();const frame=(f,pen,run=1)=>({frame:f,runId:run,handwriting:{penDown:pen,strokeId:pen?1:-1,phase:'write'},actualWrist:new Float32Array([f,0,1])});
 ink.append(frame(0,true));ink.append(frame(1,true));assert.equal(ink.segments.length,6);
 ink.append(frame(2,false));ink.append(frame(3,true));assert.equal(ink.segments.length,6);
 ink.append(frame(5,true));assert.equal(ink.segments.length,6);
 ink.append(frame(0,true,2));assert.equal(ink.segments.length,0);
});
test('UI build uses the recorded force adapter and preserves every original release payload',async()=>{
 const provenance=JSON.parse(await readFile(new URL('docs/demo-provenance.json',root)));
 for(const [name,expected] of Object.entries(provenance.immutableFiles))assert.equal(sha(await readFile(new URL(`dist/demo/${name}`,root))),expected,name);
 const built=await readFile(new URL('dist/demo/assets/demo-ui.js',root),'utf8');
 assert(built.includes('sim.worker-interactive.js'));assert(!built.includes('sim.worker.ts'));
 const record=JSON.parse(await readFile(new URL('source/demo-ui-build.json',root)));
 assert.equal(sha(await readFile(new URL(record.activeWorker,root))),record.activeWorkerSha256);assert.equal(sha(await readFile(new URL('dist/demo/assets/sim.worker-B2q0D_ik.js',root))),record.workerSha256);
});
