import './style.css';
import {S0Renderer} from './renderer';
import type {WorkerEvent,WorkerCommand,RenderFrame,MotionInfo} from './types';
import {normalizeDraft,previousCharacterStart,textLayout,glyphResourceId} from './sequence';
import {t,language,theme,setLanguage,setTheme,syncPreferences,validationMessage,workerText} from './i18n';
const app=document.querySelector<HTMLDivElement>('#app')!;
const tr=(key:string)=>`data-i18n="${key}"`;
app.innerHTML=`<div class="app-shell">
 <header class="page-header"><a class="brand" href="/" aria-label="Anchor-0"><img src="../assets/images/archon-logo.png" alt="Archon"><span class="brand-divider"></span><span>Anchor-0</span></a><div class="header-actions"><a class="home-return" data-home-link href="/">← <span ${tr('home')}></span></a><button id="language" type="button"></button><label class="theme-label"><span class="sr-only" ${tr('theme')}></span><select id="theme" aria-label="Appearance"><option value="system" ${tr('system')}></option><option value="light" ${tr('light')}></option><option value="dark" ${tr('dark')}></option></select></label></div></header>
 <div class="page-intro"><h1 ${tr('title')}></h1><span class="local-badge"><i></i><span ${tr('local')}></span></span></div>
 <main class="workspace"><section class="viewer-card" data-aria="simulation"><div id="viewport" class="viewport"></div><div class="viewer-top"><span id="status-pill" class="status-pill"><i></i><span id="status-text"></span></span><div class="camera-actions"><button id="overview-button" class="secondary-button hidden" ${tr('overview')}></button><button id="camera-button" class="icon-button" data-aria="camera" data-title="camera">⌖</button></div></div><div class="viewer-bottom"><span ${tr('rotate')}></span><div class="legends"><span id="reference-legend"><i></i><span ${tr('referenceLegend')}></span></span><span id="ink-legend" class="hidden"><i></i><span ${tr('inkLegend')}></span></span></div></div><div id="loading-overlay" class="loading-overlay" role="status" aria-live="polite"><div class="loading-card"><div class="loading-orbit" aria-hidden="true"></div><h2 id="loading-title"></h2><p id="loading-message"></p><div class="progress-track"><div id="loading-progress"></div></div><span id="loading-percent">0%</span><button id="retry-button" class="primary-button hidden" ${tr('retry')}></button></div></div></section>
 <aside class="control-panel" data-aria="controls"><section class="panel-section motion-section"><div class="section-label"><span>01</span><h2 ${tr('choose')}></h2></div><label for="mode-select" ${tr('mode')}></label><select id="mode-select" disabled><option value="preset" ${tr('preset')}></option><option value="letter" ${tr('letter')}></option><option value="word" ${tr('word')}></option></select>
 <div id="motion-picker"><label for="motion-select" id="motion-select-label"></label><select id="motion-select" disabled></select></div>
 <div id="word-panel" class="word-panel hidden"><label for="word-input" ${tr('wordLabel')}></label><input id="word-input" type="text" autocomplete="off" spellcheck="false" aria-describedby="word-help word-error"><div id="letter-keyboard" class="letter-keyboard"></div><div class="word-edit-buttons"><button id="word-space" class="secondary-button" ${tr('space')}></button><button id="word-backspace" class="secondary-button" ${tr('backspace')}></button><button id="word-clear" class="secondary-button" ${tr('clear')}></button></div><p id="word-help" class="hint" ${tr('wordHelp')}></p><div id="word-preview" class="word-preview"></div><p id="word-estimate" class="micro-copy"></p><p id="word-error" class="word-error" role="status"></p><button id="word-start" class="primary-button" ${tr('startOver')}></button><p id="word-draft" class="micro-copy"></p><p id="word-state" class="word-state" aria-live="polite"></p></div>
 <p id="motion-hint" class="hint"></p><details id="motion-details" class="motion-details"><summary ${tr('detail')}></summary><strong id="motion-identity"></strong><div class="source-heading"><span ${tr('filename')}></span><button id="copy-motion"></button></div><code id="motion-filename"></code><p id="motion-source" class="micro-copy"></p></details>
 <div class="playback-buttons"><button id="play-button" class="primary-button" disabled><span id="play-icon" aria-hidden="true">▶</span><span id="play-label"></span></button><button id="reset-button" class="secondary-button" disabled>↺ <span ${tr('reset')}></span></button></div><div class="timeline"><div><span id="time-label">0.00 s</span><span id="frame-label"></span></div><progress id="motion-progress" max="1" value="0" data-aria="progress"></progress></div><button id="selection-retry" class="secondary-button hidden" ${tr('retryMotion')}></button></section>
 <section class="panel-section"><div class="section-label"><span>02</span><h2 ${tr('pushTitle')}></h2></div><p class="hint" ${tr('pushHelp')}></p><div class="direction-pad"><button class="push-button push-forward" data-direction="forward" disabled>↑<span ${tr('forward')}></span></button><button class="push-button push-left" data-direction="left" disabled>←<span ${tr('left')}></span></button><span class="push-center" aria-hidden="true">＋</span><button class="push-button push-right" data-direction="right" disabled>→<span ${tr('right')}></span></button><button class="push-button push-back" data-direction="back" disabled>↓<span ${tr('back')}></span></button></div><p id="push-feedback" class="micro-copy" aria-live="polite"></p></section>
 <section class="panel-section display-section"><div class="section-label"><span>03</span><h2 ${tr('display')}></h2></div><label class="switch-row" for="reference-toggle"><span ${tr('reference')}></span><input id="reference-toggle" type="checkbox" checked></label><label id="glyph-control" class="switch-row hidden" for="glyph-toggle"><span ${tr('glyph')}></span><input id="glyph-toggle" type="checkbox" checked></label><div class="metrics"><div><span ${tr('speed')}></span><strong id="speed-value">— ×</strong></div><div><span ${tr('inference')}></span><strong id="inference-value">— ms</strong></div></div><p id="info-text" class="info-text" aria-live="polite"></p><p id="cache-status" class="micro-copy"></p><button id="cache-retry" class="secondary-button hidden" ${tr('retryCache')}></button></section></aside></main><footer><span ${tr('footer')}></span><a href="/" ${tr('home')}></a></footer></div>`;
const el=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const text=(id:string,value:string)=>{el(id).textContent=value;};
const hide=(id:string,value:boolean)=>el(id).classList.toggle('hidden',value);
const mode=el<HTMLSelectElement>('mode-select'),motionSelect=el<HTMLSelectElement>('motion-select'),wordInput=el<HTMLInputElement>('word-input');
const bridge=window as unknown as Record<string,unknown>;
const validationBridge=new URLSearchParams(location.search).has('validate');
const search=new URLSearchParams(location.search),initialWord=search.get('word'),initialLetter=search.get('letter')?.toUpperCase();
wordInput.value=normalizeDraft(initialWord??'HELLO WORLD');
let worker:Worker|undefined,renderer:S0Renderer|undefined,ready=false,playing=false,complete=false,busy=false,error='',selectionError='',progress=0,progressMessage='',epoch=0;
let motions=new Map<string,MotionInfo>(),activeMotion='',activeWord='',frame:RenderFrame|undefined,cache:Extract<WorkerEvent,{type:'cache'}>|undefined;
let pendingReset=true,lastUI=0,copyState='copy',pushDirection='',pushTimer=0,draftError='',lastSelection:WorkerCommand|undefined;
const prefersDark=matchMedia('(prefers-color-scheme: dark)');
function send(command:WorkerCommand){worker?.postMessage(command);}
function applyAppearance(){
 const dark=theme==='dark'||theme==='system'&&prefersDark.matches;
 document.documentElement.dataset.theme=dark?'dark':'light';renderer?.setTheme(dark);el<HTMLSelectElement>('theme').value=theme;
}
function applyLanguage(){
 document.documentElement.lang=language==='zh'?'zh-CN':'en';document.title=`Anchor-0 · ${t('title')}`;
 document.querySelectorAll<HTMLElement>('[data-i18n]').forEach(node=>node.textContent=t(node.dataset.i18n!));
 document.querySelectorAll<HTMLElement>('[data-aria]').forEach(node=>node.setAttribute('aria-label',t(node.dataset.aria!)));
 document.querySelectorAll<HTMLElement>('[data-title]').forEach(node=>node.title=t(node.dataset.title!));
 text('language',language==='en'?'中文':'EN');el('language').setAttribute('aria-label',t('language'));el('theme').setAttribute('aria-label',t('theme'));
 document.querySelectorAll<HTMLElement>('[data-direction]').forEach(button=>button.setAttribute('aria-label',t('pushAria',{direction:t(button.dataset.direction!)})));
 renderer?.setLanguage(t('viewportAria'));
 for(const option of motionSelect.options){const m=motions.get(option.value);if(m)option.textContent=m.kind==='letter'?t('letterOption',{letter:m.letter??''}):m.label;}
 renderUI();
}
function renderDraft(){
 const value=normalizeDraft(wordInput.value),error=draftError||validationMessage(value);
 text('word-error',error);el<HTMLButtonElement>('word-start').disabled=!ready||!!error||busy;
 const preview=el('word-preview');preview.replaceChildren();
 if(error){text('word-estimate','');return;}
 const layout=textLayout(value);
 for(const token of layout.text.match(/[A-Z♡]+| +/g)??[]){const node=document.createElement('span');node.className=token[0]===' '?'space-token':'word-token';node.textContent=token[0]===' '?t('spaceCount',{count:token.length}):token;preview.append(node);}
 const frames=layout.letters.reduce((n,l)=>n+(motions.get(glyphResourceId(l.letter))?.numFrames??1)-1,0)+layout.transfers*450;
 text('word-estimate',t('estimate',{count:layout.letters.length,spaces:layout.spaces})+(ready?t('estimateTime',{minutes:(frames/3000).toFixed(1)}):''));
 text('word-draft',t(activeWord&&layout.text!==activeWord?'draftChanged':'draftHelp'));
}
function motionLabel(item:MotionInfo|undefined){return item?.kind==='letter'?t('letterOption',{letter:item.letter??''}):item?.label??'';}
function renderUI(){
 const kind=mode.value,item=motions.get(activeMotion);
 hide('word-panel',kind!=='word');hide('motion-picker',kind==='word');hide('motion-details',kind==='word');hide('overview-button',kind!=='word');hide('glyph-control',kind==='preset');hide('ink-legend',kind==='preset');
 text('motion-select-label',t(kind==='letter'?'single':'motion'));text('motion-hint',t(kind==='word'?'wordHint':kind==='letter'?'letterHint':'presetHint'));
 mode.disabled=motionSelect.disabled=!ready;
 for(const id of ['play-button','reset-button'])el<HTMLButtonElement>(id).disabled=!ready||busy||!!selectionError;
 document.querySelectorAll<HTMLButtonElement>('[data-direction]').forEach(b=>b.disabled=!ready||busy||!playing);
 text('play-label',t(playing?'pause':complete?'replay':'play'));text('play-icon',playing?'Ⅱ':'▶');el('play-button').setAttribute('aria-label',t(playing?'pause':complete?'replay':'play'));
 text('status-text',t(error||selectionError?'failed':!ready?'preparing':busy?'selecting':playing?'running':complete?'complete':'paused'));el('status-pill').classList.toggle('is-playing',playing);
 text('loading-title',t(error?'failed':'loadingTitle'));text('loading-message',error?workerText(error):progressMessage?workerText(progressMessage):t('loading'));
 text('loading-percent',error?t('retry'):`${Math.round(progress*100)}%`);el('loading-progress').style.width=`${Math.round(progress*100)}%`;hide('retry-button',!error);hide('selection-retry',!selectionError);
 el('loading-overlay').classList.toggle('has-error',!!error);
 if(item){text('motion-identity',motionLabel(item));text('motion-filename',item.sourceFilename);text('motion-source',t('source',{dataset:item.datasetId,sourceFps:item.sourceFps,sourceFrames:item.sourceFrames,fps:item.fps,frames:item.numFrames}));}
 text('copy-motion',t(copyState));el<HTMLButtonElement>('copy-motion').disabled=!ready||!item;
 text('push-feedback',t(pushDirection?'pushFeedback':'pushReady',pushDirection?{direction:t(pushDirection)}:{}));
 if(frame){
  text('time-label',`${frame.simTime.toFixed(2)} s`);text('frame-label',t('frames',{current:frame.frame+1,total:frame.totalFrames}));
  const p=el<HTMLProgressElement>('motion-progress');p.max=frame.totalFrames;p.value=frame.frame+1;
  text('speed-value',`${Number.isFinite(frame.realTimeFactor)?frame.realTimeFactor.toFixed(2):'—'} ×`);text('inference-value',`${Number.isFinite(frame.inferenceMs)?frame.inferenceMs.toFixed(1):'—'} ms`);
  const names:Record<string,string>={prepare:'phasePrepare',approach:'phaseApproach',write:'phaseWrite',pen_up:'phasePenUp',return:'phaseReturn',settle:'phaseSettle',lateral:'phaseLateral',hold:'phaseSettle'};
  const s=frame.sequence,phase=t(names[frame.handwriting?.phase??'']??'phasePrepare');
  text('word-state',s?t(s.kind==='letter'?'sequence':'transfer',{current:s.kind==='letter'?s.letterIndex+1:s.transfer,total:s.kind==='letter'?s.totalLetters:s.transfers,letter:s.letter,phase}):'');
 }
 text('info-text',error?workerText(error):selectionError?workerText(selectionError):busy?t('selecting'):ready?t(complete?'completeInfo':playing?'runningInfo':'readyInfo',{name:activeWord&&kind==='word'?activeWord:motionLabel(item)}):t('loading'));
 text('cache-status',!ready||!cache?'':t(cache.complete?'cacheReady':cache.pending?'cacheLoading':'cachePartial',{loaded:cache.loaded,total:cache.total}));hide('cache-retry',!cache||cache.complete||cache.pending||!cache.errors.length);
 renderDraft();
}
function populate(kind:string){
 mode.value=kind;motionSelect.replaceChildren();
 for(const item of motions.values())if((item.kind??'preset')===kind){const option=document.createElement('option');option.value=item.id;option.textContent=item.kind==='letter'?t('letterOption',{letter:item.letter??''}):item.label;option.title=item.sourceFilename;motionSelect.append(option);}
 if(motions.has(activeMotion)&&[...motionSelect.options].some(o=>o.value===activeMotion))motionSelect.value=activeMotion;
 renderUI();
}
function request(command:WorkerCommand){
 epoch++;pendingReset=true;busy=true;selectionError='';playing=complete=false;renderer?.clearInk();copyState='copy';lastSelection={...command,epoch} as WorkerCommand;send(lastSelection);renderUI();
}
function selectWord(play:boolean){
 const normalized=normalizeDraft(wordInput.value).trim(),invalid=validationMessage(normalized);if(invalid){draftError=invalid;renderDraft();return;}
 request({type:'word',text:normalized,play});
 const url=new URL(location.href);url.searchParams.delete('letter');url.searchParams.set('word',normalized);history.replaceState(null,'',url);
}
function fail(message:string){worker?.terminate();ready=playing=busy=false;error=message;hide('loading-overlay',false);renderUI();console.error('Interactive demo:',message);}
function start(){
 const startupWord=mode.value==='word'||!activeMotion&&initialWord!==null;
 const startupMotion=activeMotion&&!activeMotion.startsWith('word:')?activeMotion:initialLetter&&/^[A-Z]$/.test(initialLetter)?`letter-${initialLetter}`:undefined;
 worker?.terminate();renderer?.dispose();renderer=undefined;ready=playing=complete=busy=false;error=selectionError='';progress=0;progressMessage='';cache=undefined;frame=undefined;epoch++;pendingReset=true;hide('loading-overlay',false);renderUI();
 try{
  renderer=new S0Renderer(el('viewport'));applyAppearance();renderer.setLanguage(t('viewportAria'));renderer.setShowReference(el<HTMLInputElement>('reference-toggle').checked);renderer.setShowTarget(el<HTMLInputElement>('glyph-toggle').checked);
  if(validationBridge){for(const key of ['__s0Ready','__s0LastFrame','__s0Cache'])delete bridge[key];bridge.__s0InkSnapshot=()=>renderer!.inkSnapshot();bridge.__s0VisualSnapshot=()=>renderer!.visualSnapshot();}
  worker=new Worker(new URL('./sim.worker-B2q0D_ik.js',import.meta.url),{type:'module'});
  if(validationBridge)bridge.__s0Worker=worker;
  worker.onmessage=(event:MessageEvent<WorkerEvent>)=>{
   const m=event.data;
   if(m.type==='progress'){progress=m.progress;progressMessage=m.message;renderUI();}
   else if(m.type==='ready'){
    try{renderer!.setGeometries(m.geoms);renderer!.setVisuals(m.visuals);applyAppearance();}catch(e){fail(String(e));return;}
    if(validationBridge)bridge.__s0Ready=m;
    motions=new Map(m.motions.map(v=>[v.id,v]));activeMotion=m.motion;ready=true;populate(motions.get(m.motion)?.kind??'preset');
    if(startupWord){selectWord(false);}
   }else if(m.type==='sequence'){if(m.epoch<epoch)return;motions.set(m.info.id,m.info);activeMotion=m.info.id;activeWord=m.info.sequence!.text;populate('word');}
   else if(m.type==='motion-info'){motions.set(m.info.id,m.info);}
   else if(m.type==='selection'){if(m.epoch<epoch)return;busy=m.state==='loading';selectionError=m.state==='error'?m.message:'';playing=false;renderUI();}
   else if(m.type==='cache'){cache=m;if(validationBridge)bridge.__s0Cache=m;renderUI();}
   else if(m.type==='frame'){
    if(!ready||m.epoch<epoch)return;frame=m;if(validationBridge)bridge.__s0LastFrame=m;busy=false;selectionError='';activeMotion=m.motion;playing=m.playing;complete=m.completed;
    const item=motions.get(m.motion);if(item){if(mode.value!==(item.kind??'preset'))populate(item.kind??'preset');renderer!.setMotion(item);}
    renderer!.setFrame(m);if(pendingReset){renderer!.resetCamera();pendingReset=false;}
    el('viewport').dataset.frame=String(m.frame);el('viewport').dataset.runId=String(m.runId);el('viewport').dataset.motion=m.motion;
    requestAnimationFrame(()=>hide('loading-overlay',true));
    if(performance.now()-lastUI>150||!playing){lastUI=performance.now();renderUI();}
   }else if(m.type==='error')fail(m.message);
  };
  worker.onerror=e=>fail(e.message||t('runtimeError'));worker.onmessageerror=()=>fail(t('runtimeError'));
  send({type:'init',baseUrl:new URL('./',import.meta.url).href,motion:startupMotion,epoch});
 }catch(e){fail(String(e));}
}
function insert(value:string,backspace=false){let start=wordInput.selectionStart??wordInput.value.length;const end=wordInput.selectionEnd??start;if(backspace&&start===end)start=previousCharacterStart(wordInput.value,start);wordInput.setRangeText(value,start,end,'end');wordInput.focus();normalizeInput();}
function normalizeInput(){const start=wordInput.selectionStart??wordInput.value.length,end=wordInput.selectionEnd??start;const a=normalizeDraft(wordInput.value.slice(0,start)).length,b=normalizeDraft(wordInput.value.slice(0,end)).length;wordInput.value=normalizeDraft(wordInput.value);wordInput.setSelectionRange(a,b);draftError='';renderDraft();}
for(const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'){const b=document.createElement('button');b.type='button';b.textContent=letter;b.addEventListener('click',()=>insert(letter));el('letter-keyboard').append(b);}
const heart=document.createElement('button');heart.type='button';heart.dataset.i18n='heart';heart.dataset.aria='insertHeart';heart.addEventListener('click',()=>insert('♡'));el('letter-keyboard').append(heart);
wordInput.addEventListener('input',e=>{if(!(e as InputEvent).isComposing)normalizeInput();});wordInput.addEventListener('compositionend',normalizeInput);
wordInput.addEventListener('paste',e=>{e.preventDefault();const value=normalizeDraft(e.clipboardData?.getData('text')??'');if(/[^A-Z♡ ]/.test(value)){draftError=t('unsupported');renderDraft();}else insert(value);});
el('word-space').onclick=()=>insert(' ');el('word-backspace').onclick=()=>insert('',true);el('word-clear').onclick=()=>{wordInput.value='';draftError='';renderDraft();wordInput.focus();};el('word-start').onclick=()=>selectWord(true);
el('play-button').onclick=()=>{if(!ready||busy)return;if(playing)send({type:'pause'});else{if(complete)request({type:'reset'});send({type:'play'});}};
el('reset-button').onclick=()=>request({type:'reset'});
el('selection-retry').onclick=()=>{if(lastSelection)request(lastSelection);};el('cache-retry').onclick=()=>send({type:'prefetch'});
motionSelect.onchange=()=>{request({type:'motion',motion:motionSelect.value});const item=motions.get(motionSelect.value),url=new URL(location.href);url.searchParams.delete('word');if(item?.letter)url.searchParams.set('letter',item.letter);else url.searchParams.delete('letter');history.replaceState(null,'',url);};
mode.onchange=()=>{const value=mode.value;populate(value);if(value==='word')selectWord(false);else motionSelect.dispatchEvent(new Event('change'));};
el('camera-button').onclick=()=>renderer?.resetCamera();el('overview-button').onclick=()=>renderer?.showOverview();
el<HTMLInputElement>('reference-toggle').onchange=e=>{const checked=(e.target as HTMLInputElement).checked;renderer?.setShowReference(checked);hide('reference-legend',!checked);};el<HTMLInputElement>('glyph-toggle').onchange=e=>renderer?.setShowTarget((e.target as HTMLInputElement).checked);
document.querySelectorAll<HTMLButtonElement>('[data-direction]').forEach(button=>button.onclick=()=>{if(!ready||!playing)return;const direction=button.dataset.direction as 'forward'|'back'|'left'|'right';send({type:'push',direction,force:50,duration:.1});pushDirection=direction;renderUI();clearTimeout(pushTimer);pushTimer=window.setTimeout(()=>{pushDirection='';renderUI();},2400);});
el('copy-motion').onclick=async()=>{const item=motions.get(activeMotion);if(!item)return;try{await navigator.clipboard.writeText(item.sourceFilename);copyState='copied';}catch{const r=document.createRange();r.selectNodeContents(el('motion-filename'));getSelection()?.removeAllRanges();getSelection()?.addRange(r);copyState='selectCopy';}renderUI();};
el('language').onclick=()=>{setLanguage(language==='en'?'zh':'en');draftError='';applyLanguage();};el<HTMLSelectElement>('theme').onchange=e=>{setTheme((e.target as HTMLSelectElement).value as 'system'|'light'|'dark');applyAppearance();};
prefersDark.addEventListener('change',applyAppearance);window.addEventListener('storage',e=>{if(e.key===null||['anchor-language','anchor-theme'].includes(e.key)){syncPreferences();draftError='';applyAppearance();applyLanguage();}});
el('retry-button').onclick=start;
document.addEventListener('visibilitychange',()=>{if(document.hidden&&ready)send({type:'pause'});});
window.addEventListener('keydown',e=>{if(e.code==='Space'&&ready&&!e.repeat&&!(e.target as HTMLElement)?.closest('input,button,select,textarea,a,summary')){e.preventDefault();el('play-button').click();}});
window.addEventListener('pagehide',()=>{if(ready)send({type:'pause'});});window.addEventListener('beforeunload',()=>{worker?.terminate();renderer?.dispose();});
applyLanguage();applyAppearance();start();
