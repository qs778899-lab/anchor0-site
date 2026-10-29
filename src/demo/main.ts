import './style.css';
import {S0Renderer} from './renderer';
import {downloadPng,snapshotFilename} from './download';
import {parseForce} from './disturbance';
import type {WorkerEvent,WorkerCommand,RenderFrame,MotionInfo} from './types';
import {normalizeDraft,previousCharacterStart,textLayout,glyphResourceId} from './sequence';
import {t,language,theme,setLanguage,setTheme,syncPreferences,validationMessage,workerText} from './i18n';
const app=document.querySelector<HTMLDivElement>('#app')!;
const tr=(key:string)=>`data-i18n="${key}"`;
app.innerHTML=`<div class="app-shell">
 <header class="page-header"><a class="brand" href="/" aria-label="Anchor"><img src="../assets/images/archon-logo.png" alt="Archon"><span class="brand-divider"></span><span>Anchor</span></a><div class="header-actions"><a class="home-return" data-home-link href="/">← <span ${tr('home')}></span></a><button id="language" type="button"></button><label class="theme-label"><span class="sr-only" ${tr('theme')}></span><select id="theme" aria-label="Appearance"><option value="system" ${tr('system')}></option><option value="light" ${tr('light')}></option><option value="dark" ${tr('dark')}></option></select></label></div></header>
 <div class="page-intro"><h1 ${tr('title')}></h1><span class="local-badge"><i></i><span ${tr('local')}></span></span></div>
 <main class="workspace"><section class="viewer-card" data-aria="simulation"><div id="viewport" class="viewport"></div><div class="viewer-top"><span id="status-pill" class="status-pill"><i></i><span id="status-text"></span></span><div class="mode-buttons" role="group" data-aria="mode"><button type="button" data-mode="preset" aria-pressed="true" disabled ${tr('preset')}></button><button type="button" data-mode="word" aria-pressed="false" disabled ${tr('word')}></button></div></div><div class="viewer-bottom"><div class="viewer-hints"><span ${tr('rotate')}></span><div class="legends"><span id="ink-legend" class="hidden"><i></i><span ${tr('inkLegend')}></span></span></div></div><div class="camera-actions"><button id="overview-button" class="secondary-button hidden" ${tr('overview')}></button><button id="camera-button" class="icon-button" data-aria="camera" data-title="camera">⌖</button></div></div><div id="loading-overlay" class="loading-overlay" role="status" aria-live="polite"><div class="loading-card"><div class="loading-orbit" aria-hidden="true"></div><h2 id="loading-title"></h2><p id="loading-message"></p><div class="progress-track"><div id="loading-progress"></div></div><span id="loading-percent">0%</span><button id="retry-button" class="primary-button hidden" ${tr('retry')}></button></div></div></section>
 <aside class="control-panel" data-aria="controls"><section class="panel-section motion-section"><div class="section-label"><span>01</span><h2 ${tr('choose')}></h2></div>
 <div id="motion-picker"><label for="motion-select" id="motion-select-label"></label><select id="motion-select" disabled></select></div>
 <div id="word-panel" class="word-panel hidden"><label for="word-input" ${tr('wordLabel')}></label><input id="word-input" type="text" autocomplete="off" spellcheck="false" aria-describedby="word-help word-error"><div id="letter-keyboard" class="letter-keyboard"></div><div class="word-edit-buttons"><button id="word-space" class="secondary-button" ${tr('space')}></button><button id="word-backspace" class="secondary-button" ${tr('backspace')}></button><button id="word-clear" class="secondary-button" ${tr('clear')}></button></div><p id="word-help" class="hint" ${tr('wordHelp')}></p><div class="word-preview-row"><div id="word-preview" class="word-preview"></div><button id="save-image" type="button" class="secondary-button" disabled ${tr('saveImage')}></button></div><p id="save-status" class="micro-copy" role="status"></p><p id="word-estimate" class="micro-copy"></p><p id="word-error" class="word-error" role="status"></p><button id="word-start" class="primary-button" ${tr('startOver')}></button><p id="word-draft" class="micro-copy"></p><p id="word-state" class="word-state" aria-live="polite"></p></div>
 <p id="motion-hint" class="hint"></p>
 <div class="playback-buttons"><button id="play-button" class="primary-button" disabled><span id="play-icon" aria-hidden="true">▶</span><span id="play-label"></span></button><button id="reset-button" class="secondary-button" disabled>↺ <span ${tr('reset')}></span></button></div><div class="timeline"><div><span id="time-label">0.00 s</span><span id="frame-label"></span></div><progress id="motion-progress" max="1" value="0" data-aria="progress"></progress></div><p id="selection-error" class="word-error" role="status"></p><button id="selection-retry" class="secondary-button hidden" ${tr('retryMotion')}></button></section>
 <section class="panel-section"><div class="section-label"><span>02</span><h2 ${tr('pushTitle')}></h2></div><p class="hint" ${tr('pushHelp')}></p><label for="push-force" ${tr('forceLabel')}></label><div class="force-input"><input id="push-force" type="number" min="0" max="60" step="any" inputmode="decimal" value="50" aria-describedby="force-error"><span aria-hidden="true">N</span></div><p id="force-error" class="word-error" role="status"></p><div class="direction-pad"><button class="push-button push-forward" data-direction="forward" disabled>↑<span ${tr('forward')}></span></button><button class="push-button push-left" data-direction="left" disabled>←<span ${tr('left')}></span></button><span class="push-center" aria-hidden="true">＋</span><button class="push-button push-right" data-direction="right" disabled>→<span ${tr('right')}></span></button><button class="push-button push-back" data-direction="back" disabled>↓<span ${tr('back')}></span></button></div><p id="push-feedback" class="micro-copy" aria-live="polite"></p></section>
</aside></main><footer><span ${tr('footer')}></span><a href="/" ${tr('home')}></a></footer></div>`;
const el=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const text=(id:string,value:string)=>{el(id).textContent=value;};
const hide=(id:string,value:boolean)=>el(id).classList.toggle('hidden',value);
let currentMode:'preset'|'word'='word';
const motionSelect=el<HTMLSelectElement>('motion-select'),wordInput=el<HTMLInputElement>('word-input');
const bridge=window as unknown as Record<string,unknown>;
const validationBridge=new URLSearchParams(location.search).has('validate');
const search=new URLSearchParams(location.search),legacyLetter=search.get('letter')?.toUpperCase();
const initialWord=search.get('word')??(legacyLetter&&/^[A-Z]$/.test(legacyLetter)?legacyLetter:null);
if(search.has('letter')){const url=new URL(location.href);url.searchParams.delete('letter');if(initialWord!==null)url.searchParams.set('word',initialWord);history.replaceState(null,'',url);}
wordInput.value=normalizeDraft(initialWord??'HELLO WORLD');
let worker:Worker|undefined,renderer:S0Renderer|undefined,ready=false,playing=false,complete=false,busy=false,error='',selectionError='',progress=0,progressMessage='',epoch=0;
let motions=new Map<string,MotionInfo>(),activeMotion='',activeWord='',frame:RenderFrame|undefined;
let pendingReset=true,lastUI=0,lastPreset='',saving=false,saveStatus='',pushDirection='',pushMagnitude=50,pushTimer=0,draftError='',lastSelection:WorkerCommand|undefined;
const prefersDark=matchMedia('(prefers-color-scheme: dark)');
function send(command:WorkerCommand){worker?.postMessage(command);}
function applyAppearance(){
 const dark=theme==='dark'||theme==='system'&&prefersDark.matches;
 document.documentElement.dataset.theme=dark?'dark':'light';renderer?.setTheme(dark);el<HTMLSelectElement>('theme').value=theme;
}
function applyLanguage(){
 document.documentElement.lang=language==='zh'?'zh-CN':'en';document.title=`Anchor · ${t('title')}`;
 document.querySelectorAll<HTMLElement>('[data-i18n]').forEach(node=>node.textContent=t(node.dataset.i18n!));
 document.querySelectorAll<HTMLElement>('[data-aria]').forEach(node=>node.setAttribute('aria-label',t(node.dataset.aria!)));
 document.querySelectorAll<HTMLElement>('[data-title]').forEach(node=>node.title=t(node.dataset.title!));
 text('language',language==='en'?'中文':'EN');el('language').setAttribute('aria-label',t('language'));el('theme').setAttribute('aria-label',t('theme'));
 document.querySelectorAll<HTMLElement>('[data-direction]').forEach(button=>button.setAttribute('aria-label',t('pushAria',{direction:t(button.dataset.direction!)})));
 renderer?.setLanguage(t('viewportAria'));
 for(const option of motionSelect.options){const m=motions.get(option.value);if(m)option.textContent=m.label;}
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
function renderUI(){
 const kind=currentMode,item=motions.get(activeMotion);
 hide('word-panel',kind!=='word');hide('motion-picker',kind==='word');hide('overview-button',kind!=='word');hide('ink-legend',kind==='preset');
 text('motion-select-label',t('motion'));text('motion-hint',t(kind==='word'?'wordHint':'presetHint'));
 motionSelect.disabled=!ready;
 document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(b=>{b.disabled=!ready;b.setAttribute('aria-pressed',String(b.dataset.mode===currentMode));});
 text('save-image',t(saving?'savingImage':'saveImage'));text('save-status',saveStatus?t(saveStatus):'');el<HTMLButtonElement>('save-image').disabled=!ready||busy||saving||!frame;
 for(const id of ['play-button','reset-button'])el<HTMLButtonElement>(id).disabled=!ready||busy||!!selectionError||(kind==='word'&&item?.kind!=='word');
 const validForce=parseForce(el<HTMLInputElement>('push-force').value)!==null;
 text('force-error',validForce?'':t('forceInvalid'));el('push-force').setAttribute('aria-invalid',String(!validForce));
 document.querySelectorAll<HTMLButtonElement>('[data-direction]').forEach(b=>b.disabled=!ready||busy||!playing||!validForce);
 text('play-label',t(playing?'pause':complete?'replay':'play'));text('play-icon',playing?'Ⅱ':'▶');el('play-button').setAttribute('aria-label',t(playing?'pause':complete?'replay':'play'));
 text('status-text',t(error||selectionError?'failed':!ready?'preparing':busy?'selecting':playing?'running':complete?'complete':'paused'));el('status-pill').classList.toggle('is-playing',playing);
 text('loading-title',t(error?'failed':'loadingTitle'));text('loading-message',error?workerText(error):progressMessage?workerText(progressMessage):t('loading'));
 text('loading-percent',error?t('retry'):`${Math.round(progress*100)}%`);el('loading-progress').style.width=`${Math.round(progress*100)}%`;hide('retry-button',!error);hide('selection-retry',!selectionError);text('selection-error',selectionError?workerText(selectionError):'');
 el('loading-overlay').classList.toggle('has-error',!!error);
 text('push-feedback',t(pushDirection?(pushMagnitude===0?'pushZero':'pushFeedback'):'pushReady',pushDirection?{direction:t(pushDirection),force:pushMagnitude}:{}));
 if(frame){
  text('time-label',`${frame.simTime.toFixed(2)} s`);text('frame-label',t('frames',{current:frame.frame+1,total:frame.totalFrames}));
  const p=el<HTMLProgressElement>('motion-progress');p.max=frame.totalFrames;p.value=frame.frame+1;

  const names:Record<string,string>={prepare:'phasePrepare',approach:'phaseApproach',write:'phaseWrite',pen_up:'phasePenUp',return:'phaseReturn',settle:'phaseSettle',lateral:'phaseLateral',hold:'phaseSettle'};
  const s=frame.sequence,phase=t(names[frame.handwriting?.phase??'']??'phasePrepare');
  text('word-state',s?t(s.kind==='letter'?'sequence':'transfer',{current:s.kind==='letter'?s.letterIndex+1:s.transfer,total:s.kind==='letter'?s.totalLetters:s.transfers,letter:s.letter,phase}):'');
 }
 renderDraft();
}
function populate(kind:'preset'|'word'){
 currentMode=kind;motionSelect.replaceChildren();
 for(const item of motions.values())if((item.kind??'preset')==='preset'){const option=document.createElement('option');option.value=item.id;option.textContent=item.label;motionSelect.append(option);}
 if([...motionSelect.options].some(o=>o.value===lastPreset))motionSelect.value=lastPreset;
 else lastPreset=motionSelect.value;
 renderUI();
}
function request(command:WorkerCommand){
 epoch++;pendingReset=true;busy=true;selectionError='';playing=complete=false;renderer?.clearInk();renderer?.clearForce();pushDirection='';saveStatus='';lastSelection={...command,epoch} as WorkerCommand;send(lastSelection);renderUI();
}
function selectWord(play:boolean){
 const normalized=normalizeDraft(wordInput.value).trim(),invalid=validationMessage(normalized);if(invalid){draftError=invalid;send({type:'pause'});playing=false;renderUI();return;}
 request({type:'word',text:normalized,play});
 const url=new URL(location.href);url.searchParams.delete('letter');url.searchParams.set('word',normalized);history.replaceState(null,'',url);
}
function fail(message:string){worker?.terminate();ready=playing=busy=false;error=message;hide('loading-overlay',false);renderUI();console.error('Interactive demo:',message);}
function start(){
 const startupWord=currentMode==='word'||!activeMotion&&initialWord!==null;
 const startupMotion=lastPreset||undefined;
 worker?.terminate();renderer?.dispose();renderer=undefined;ready=playing=complete=busy=false;error=selectionError='';progress=0;progressMessage='';frame=undefined;epoch++;pendingReset=true;hide('loading-overlay',false);renderUI();
 try{
  renderer=new S0Renderer(el('viewport'));applyAppearance();renderer.setLanguage(t('viewportAria'));
  if(validationBridge){for(const key of ['__s0Ready','__s0LastFrame','__s0Cache'])delete bridge[key];bridge.__s0InkSnapshot=()=>renderer!.inkSnapshot();bridge.__s0VisualSnapshot=()=>renderer!.visualSnapshot();}
  worker=new Worker(new URL('./sim.worker-interactive.js',import.meta.url),{type:'module'});
  if(validationBridge)bridge.__s0Worker=worker;
  worker.onmessage=(event:MessageEvent<WorkerEvent>)=>{
   const m=event.data;
   if(m.type==='progress'){progress=m.progress;progressMessage=m.message;renderUI();}
   else if(m.type==='ready'){
    try{renderer!.setGeometries(m.geoms);renderer!.setVisuals(m.visuals);applyAppearance();}catch(e){fail(String(e));return;}
    if(validationBridge)bridge.__s0Ready=m;
    motions=new Map(m.motions.map(v=>[v.id,v]));activeMotion=m.motion;ready=true;lastPreset=m.motion;populate(startupWord?'word':'preset');
    if(startupWord){selectWord(false);}
   }else if(m.type==='sequence'){if(m.epoch<epoch)return;motions.set(m.info.id,m.info);activeMotion=m.info.id;activeWord=m.info.sequence!.text;populate('word');}
   else if(m.type==='motion-info'){motions.set(m.info.id,m.info);}
   else if(m.type==='selection'){if(m.epoch<epoch)return;busy=m.state==='loading';selectionError=m.state==='error'?m.message:'';playing=false;renderUI();}
   else if(m.type==='push-applied'){
    if(m.epoch!==epoch||m.runId!==frame?.runId)return;
    renderer?.showForce(m);pushDirection=m.direction;pushMagnitude=m.forceN;renderUI();clearTimeout(pushTimer);pushTimer=window.setTimeout(()=>{pushDirection='';renderUI();},2400);
   }else if(m.type==='cache'){if(validationBridge)bridge.__s0Cache=m;}
   else if(m.type==='frame'){
    if(!ready||m.epoch<epoch)return;frame=m;if(validationBridge)bridge.__s0LastFrame=m;busy=false;selectionError='';activeMotion=m.motion;playing=m.playing;complete=m.completed;
    const item=motions.get(m.motion);if(item)renderer!.setMotion(item);
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
el('selection-retry').onclick=()=>{if(lastSelection)request(lastSelection);};
motionSelect.onchange=()=>{lastPreset=motionSelect.value;request({type:'motion',motion:lastPreset});const url=new URL(location.href);url.searchParams.delete('word');url.searchParams.delete('letter');history.replaceState(null,'',url);};
document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(button=>button.onclick=()=>{
 const value=button.dataset.mode as 'preset'|'word';if(!ready||value===currentMode)return;
 populate(value);if(value==='word')selectWord(false);else motionSelect.dispatchEvent(new Event('change'));
});
el('save-image').onclick=async()=>{
 if(!ready||busy||saving||!renderer||!frame)return;
 saving=true;saveStatus='';renderUI();
 try{const name=snapshotFilename(currentMode==='word'?activeWord:activeMotion);const blob=await renderer.capturePng();downloadPng(blob,name);saveStatus='imageSaved';}
 catch{saveStatus='imageError';}finally{saving=false;renderUI();}
};
el('camera-button').onclick=()=>renderer?.resetCamera();el('overview-button').onclick=()=>renderer?.showOverview();
el('push-force').addEventListener('input',renderUI);
document.querySelectorAll<HTMLButtonElement>('[data-direction]').forEach(button=>button.onclick=()=>{
 const force=parseForce(el<HTMLInputElement>('push-force').value);if(!ready||busy||!playing||!frame||force===null)return;
 const direction=button.dataset.direction as 'forward'|'back'|'left'|'right';
 send({type:'push',direction,force,duration:.1,runId:frame.runId,epoch});
});
el('language').onclick=()=>{setLanguage(language==='en'?'zh':'en');draftError='';applyLanguage();};el<HTMLSelectElement>('theme').onchange=e=>{setTheme((e.target as HTMLSelectElement).value as 'system'|'light'|'dark');applyAppearance();};
prefersDark.addEventListener('change',applyAppearance);window.addEventListener('storage',e=>{if(e.key===null||['anchor-language','anchor-theme'].includes(e.key)){syncPreferences();draftError='';applyAppearance();applyLanguage();}});
el('retry-button').onclick=start;
document.addEventListener('visibilitychange',()=>{if(document.hidden&&ready)send({type:'pause'});});
window.addEventListener('keydown',e=>{if(e.code==='Space'&&ready&&!e.repeat&&!(e.target as HTMLElement)?.closest('input,button,select,textarea,a,summary')){e.preventDefault();el('play-button').click();}});
window.addEventListener('pagehide',()=>{if(ready)send({type:'pause'});});window.addEventListener('beforeunload',()=>{worker?.terminate();renderer?.dispose();});
applyLanguage();applyAppearance();start();
