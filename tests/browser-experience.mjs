// Run against a clean, separate headless Chrome profile; see docs/verification.md.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {cdp,evaluate,wait,until,viewport,go,screenshot,close,events} from './browser-client.mjs';
await mkdir('.cache/preview',{recursive:true});
const check=async(name,expression)=>{assert(await evaluate(expression),name);console.log(`PASS: ${name}`);};
const scroll=async(selector)=>{await evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({behavior:'instant',block:'start'})`);await wait(150);};
try {
 await viewport(1440,1000);await go();await evaluate(`localStorage.removeItem('anchor-navigation-position');localStorage.setItem('anchor-language','en');localStorage.setItem('anchor-theme','light')`);await go();await wait(450);
 await check('section order and default English',`document.documentElement.lang==='en' && [...document.querySelectorAll('main>section[id]')].map(e=>e.id).join(',')==='videos,performance,overview,benchmark,results,hardware,applications,method'`);
 await check('floating sidebar and desktop reading column',`getComputedStyle(document.querySelector('.floating-nav')).position==='fixed' && document.querySelector('.floating-nav').getBoundingClientRect().right<document.querySelector('.hero').getBoundingClientRect().left && document.documentElement.scrollWidth===innerWidth`);
 await check('only nearby video sources loaded initially',`[...document.querySelectorAll('.clip-card video')].every(v=>!v.currentSrc)`);
 await check('main film autoplay is muted and does not loop',`!document.querySelector('#scenes-video').paused && document.querySelector('#scenes-video').muted && !document.querySelector('#scenes-video').loop`);
 await screenshot('.cache/preview/desktop-home.png');
 await scroll('#videos');await until(`[...document.querySelectorAll('.clip-card video')].slice(0,3).every(v=>!v.paused&&v.currentTime>0)`);
 await check('visible clips play muted together; hero pauses off screen',`[...document.querySelectorAll('.clip-card video')].slice(0,3).every(v=>!v.paused&&v.muted&&v.loop) && document.querySelector('#scenes-video').paused`);
 await check('all fifteen clips stay in single rows with three desktop cards visible',`document.querySelectorAll('#video-groups .clip-card').length===15 && [...document.querySelectorAll('.clip-rail')].every(r=>[...r.children].every(c=>Math.abs(c.getBoundingClientRect().top-r.firstElementChild.getBoundingClientRect().top)<1)) && Math.abs(document.querySelector('.clip-card').getBoundingClientRect().width*3+36-document.querySelector('.clip-rail').clientWidth)<2`);
 await screenshot('.cache/preview/desktop-videos.png');
 await evaluate(`document.querySelector('.clip-card video').pause()`);await wait(100);
 await scroll('#performance');await scroll('#videos');await wait(300);
 await check('manual pause persists after leaving and returning',`document.querySelector('.clip-card video').paused`);
 await evaluate(`document.querySelector('.clip-card video').play()`);await wait(100);
 await evaluate(`const vs=[...document.querySelectorAll('.clip-card video')];vs[0].muted=false;`);await wait(100);
 await evaluate(`document.querySelectorAll('.clip-card video')[1].muted=false`);await wait(100);
 await check('only the explicitly unmuted player has sound',`document.querySelector('.clip-card video').muted && !document.querySelectorAll('.clip-card video')[1].muted`);
 await evaluate(`document.querySelectorAll('.clip-card video')[1].muted=true`);
 await evaluate(`document.querySelector('[data-full-video]').click()`);await until(`document.querySelector('#video-dialog').open && !document.querySelector('#video-dialog video').paused`);
 await check('full video modal pauses the showcase',`[...document.querySelectorAll('.clip-card video')].every(v=>v.paused) && document.querySelector('#video-dialog video').currentSrc.split('?')[0].endsWith('/comparison.mp4')`);
 await evaluate(`document.querySelector('#video-dialog video').requestFullscreen()`);await until(`!!document.fullscreenElement`);
 await check('native fullscreen',`document.fullscreenElement===document.querySelector('#video-dialog video')`);
 await evaluate(`document.exitFullscreen()`);await evaluate(`document.querySelector('#close-video').click()`);await wait(200);
 await check('closing a full video releases its source',`!document.querySelector('#video-dialog').open && !document.querySelector('#video-dialog video').hasAttribute('src')`);
 // All expected numeric marks and all table values must bind to source JSON, not translated strings or indices.
 const numeric=await evaluate(`(async()=>{
   const data=await(await fetch('./data/paper-results.json')).json();const failures=[];let count=0;
   for(const mark of document.querySelectorAll('[data-tip]')){
     const tip=JSON.parse(mark.dataset.tip);let expected,n,config;
     if(tip.datasetId==='hardware'){const s=data.hardware.trackingErrors.series.find(s=>s.id===tip.modelId);expected=s[tip.metricId];n=s.valid;}
     else if(tip.datasetId==='reachability'){
       if(['steps','slips'].includes(tip.metricId)){const s=data.reachability.footEvents.series.find(s=>s.id===tip.modelId);expected=s[tip.metricId];n=s.count;config=s.config;}
       else{const r=data.reachability.postures,s=r.series.find(s=>s.id===tip.modelId),i=r.axes.findIndex(a=>a.id===tip.metricId);expected=s.values[i];n=s.counts[i];config=s.config;}
     }else if(tip.datasetId.startsWith('home_')){const r=data.radars.find(r=>r.id===tip.datasetId),s=r.series.find(s=>s.id===tip.modelId),i=r.axes.findIndex(a=>a.id===tip.metricId);expected=s.values[i];n=s.counts[i];config=s.config;}
     else{const c=data.lookahead.cohorts.find(c=>c.id===tip.datasetId),s=c?.series.find(s=>s.id===tip.modelId),other=data.simulation.cohorts.find(c=>c.id===tip.datasetId)?.series.find(s=>s.id===tip.modelId);expected=tip.metricId in s?s[tip.metricId]:other?.[tip.metricId];n=c.count;config=s.config;}
     count++;if(tip.value!==expected||tip.count!==n||(config&&tip.config!==config))failures.push(tip);
     if(mark.matches('.exact-value')&&mark.textContent!==Number(expected).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}))failures.push('table precision');
   }return {count,failures};
 })()`);
 assert.equal(numeric.failures.length,0,JSON.stringify(numeric.failures));console.log(`PASS: ${numeric.count} chart/table values, sample counts and configs match raw JSON`);
 // Observe an unvisited bar chart below the fold before and during its first entrance.
 await evaluate(`{const el=document.querySelector('#sim-a-chart svg'),r=el.getBoundingClientRect();window.scrollTo({top:scrollY+r.top-innerHeight+r.height*.1,behavior:'instant'});}`);await wait(100);
 await check('bar chart remains at zero below entrance threshold',`document.querySelector('#sim-a-chart svg').dataset.animationState==='pending' && getComputedStyle(document.querySelector('#sim-a-chart [data-grow]')).transform.startsWith('matrix(0,')`);
 await evaluate(`window.scrollBy({top:document.querySelector('#sim-a-chart svg').getBoundingClientRect().height*.3,behavior:'instant'})`);await wait(100);
 await check('bar entrance starts at quarter visibility',`document.querySelector('#sim-a-chart svg').dataset.animationState==='running'`);
 await wait(750);await check('bar entrance finishes at exact geometry',`document.querySelector('#sim-a-chart svg').dataset.animationState==='complete' && getComputedStyle(document.querySelector('#sim-a-chart [data-grow]')).transform==='none'`);
 await scroll('#simulation-figure');
 await cdp('Page.bringToFront');
 const interactions=await evaluate(`(()=>{
   const failures=[];let tested=0;const fmt=v=>Number(v).toLocaleString('en-US',{minimumFractionDigits:4,maximumFractionDigits:4});
   const hide=()=>document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
   for(const button of document.querySelectorAll('[data-focus-group="simulation"]')){
     button.click();const id=button.dataset.focusModel;
     for(const svg of document.querySelectorAll('#simulation-figure svg')){
       svg.scrollIntoView({behavior:'instant',block:'center'});svg.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,clientX:0,clientY:0}));
       for(const mark of svg.querySelectorAll('[data-tip]')){
         const tip=JSON.parse(mark.dataset.tip);if(tip.modelId!==id)continue;hide();
         let x,y;
         if(mark.hasAttribute('data-point-x')){const pt=new DOMPoint(+mark.dataset.pointX,+mark.dataset.pointY).matrixTransform(mark.getScreenCTM());x=pt.x;y=pt.y;}
         else{const r=mark.getBoundingClientRect();x=r.left+r.width/2;y=r.top+r.height/2;}
         const target=document.elementFromPoint(x,y);target?.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,clientX:x,clientY:y}));
         const box=document.querySelector('#chart-tooltip');
         if(box.hidden||!box.textContent.includes(tip.model)||!box.textContent.includes(tip.metric)||!box.textContent.includes(fmt(tip.value)))failures.push({mode:'pointer',tip,target:target?.tagName});
         hide();mark.focus();if(box.hidden||!box.textContent.includes(fmt(tip.value)))failures.push({mode:'keyboard',tip});
         tested++;
       }
     }
     button.click();
   }
   return {tested,failures};
 })()`);
 assert.equal(interactions.failures.length,0,JSON.stringify(interactions.failures.slice(0,3)));console.log(`PASS: ${interactions.tested} simulation marks selectable by pointer and keyboard for every selected model`);
 await scroll('#sim-c-chart');
 const overlap=await evaluate(`(()=>{
   const svg=document.querySelectorAll('#sim-c-chart svg')[1];svg.scrollIntoView({behavior:'instant',block:'center'});
   const mark=[...svg.querySelectorAll('[data-tip]')].find(m=>{const t=JSON.parse(m.dataset.tip);return t.modelId==='anchor-global'&&t.value===100;});
   mark.focus();return {items:document.querySelector('#chart-tooltip').dataset.items,text:document.querySelector('#chart-tooltip').textContent};
 })()`);
 assert.equal(overlap.items,'2');assert(overlap.text.includes('Anchorᴳ')&&overlap.text.includes('Anchorᴸ'));console.log('PASS: coincident 100% points list both Anchor models');
 const edgeCases=await evaluate(`(()=>{
   const failures=[];const tipBox=document.querySelector('#chart-tooltip');const fmt=v=>Number(v).toLocaleString('en-US',{minimumFractionDigits:4,maximumFractionDigits:4});
   const hover=mark=>{document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));const p=new DOMPoint(+mark.dataset.pointX,+mark.dataset.pointY).matrixTransform(mark.getScreenCTM());document.elementFromPoint(p.x,p.y).dispatchEvent(new PointerEvent('pointermove',{clientX:p.x,clientY:p.y,bubbles:true}));};
   const moving=document.querySelectorAll('#sim-c-chart svg')[1];moving.scrollIntoView({behavior:'instant',block:'center'});
   for(const modelId of ['anchor-global','anchor-local']){const mark=[...moving.querySelectorAll('[data-tip]')].find(m=>{const t=JSON.parse(m.dataset.tip);return t.modelId===modelId&&t.metricId==='combination_L2-5__U2-2';});hover(mark);const tip=JSON.parse(mark.dataset.tip);if(tipBox.dataset.items!=='1'||!tipBox.textContent.includes(fmt(tip.value)))failures.push('nearby point '+modelId);}
   const zero=[...document.querySelectorAll('#reach-f-chart [data-tip]')].find(m=>JSON.parse(m.dataset.tip).value===0);zero.closest('svg').scrollIntoView({behavior:'instant',block:'center'});hover(zero);if(!tipBox.textContent.includes('0.0000'))failures.push('zero center');
   // A DOM-only regression fixture covers future multiple-zero metrics for the same model.
   const duplicate=zero.cloneNode(true),tip=JSON.parse(zero.dataset.tip);tip.metric='Second zero-value metric (test fixture)';tip.metricId='fixture-zero';duplicate.dataset.tip=JSON.stringify(tip);zero.parentNode.append(duplicate);hover(zero);if(tipBox.dataset.items!=='2'||!tipBox.textContent.includes(tip.metric))failures.push('coincident same-model zero metrics');duplicate.remove();
   const hardware=document.querySelector('#hardware-errors-chart svg');hardware.scrollIntoView({behavior:'instant',block:'center'});hardware.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,clientX:0,clientY:0}));let hardwareCount=0;
   for(const mark of hardware.querySelectorAll('[data-tip]')){document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));const r=mark.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;document.elementFromPoint(x,y).dispatchEvent(new PointerEvent('pointermove',{bubbles:true,clientX:x,clientY:y}));const t=JSON.parse(mark.dataset.tip);if(tipBox.hidden||!tipBox.textContent.includes(fmt(t.value)))failures.push('hardware pointer');mark.focus();if(tipBox.hidden||!tipBox.textContent.includes(fmt(t.value)))failures.push('hardware keyboard');hardwareCount++;}
   return {failures,hardwareCount};
 })()`);
 assert.equal(edgeCases.failures.length,0,JSON.stringify(edgeCases.failures));assert.equal(edgeCases.hardwareCount,12);console.log('PASS: nearby points, zero centers, same-model coincident metrics and all 12 hardware bars');
 await evaluate(`document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`);
 await scroll('#performance');await wait(800);
 await check('scatter uses true reversed 1.0 → 0.0 seconds axis',`(()=>{const s=[...document.querySelectorAll('#performance-chart [data-bubble]')];return +s.find(x=>x.dataset.bubble==='sonic').dataset.pointX < +s.find(x=>x.dataset.bubble==='anchor-global').dataset.pointX;})()`);
 for(const dataset of ['inhouse','public']){
   await evaluate(`document.querySelector('#lookahead-cohort').value='${dataset}';document.querySelector('#lookahead-cohort').dispatchEvent(new Event('change',{bubbles:true}));`);
   await check(`${dataset} scatter bubbles and keyboard details`, `(()=>{for(const mark of document.querySelectorAll('#performance-chart [data-bubble]')){mark.focus();const tip=JSON.parse(mark.dataset.tip),box=document.querySelector('#chart-tooltip');if(box.hidden||tip.datasetId!=='${dataset}'||!box.textContent.includes(tip.model)||!box.textContent.includes(Number(tip.value).toLocaleString('en-US',{minimumFractionDigits:4,maximumFractionDigits:4})))return false;}return true;})()`);
 }
 await evaluate(`document.querySelector('#lookahead-cohort').value='inhouse';document.querySelector('#lookahead-cohort').dispatchEvent(new Event('change',{bubbles:true}));document.activeElement.blur();document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));`);
 const heights=await evaluate(`(()=>{const before=document.querySelector('#lookahead-chart .figure-stage').offsetHeight;document.querySelector('#performance-data-tab').click();const after=document.querySelector('#lookahead-chart .figure-stage').offsetHeight;document.querySelector('#performance-chart-tab').click();return {before,after,state:document.querySelector('#performance-chart svg').dataset.animationState};})()`);
 assert.equal(heights.before,heights.after);assert.equal(heights.state,'complete');console.log('PASS: Chart / Data preserves height and does not replay animation');
 await screenshot('.cache/preview/desktop-performance.png');
 await scroll('#simulation-figure');await wait(800);await screenshot('.cache/preview/desktop-results.png');
 await evaluate(`document.querySelector('#language-toggle').click();document.querySelector('#theme-select').value='dark';document.querySelector('#theme-select').dispatchEvent(new Event('change'));`);
 await check('Chinese and dark theme preserve completed animations',`document.documentElement.lang==='zh-CN'&&document.documentElement.dataset.theme==='dark'&&document.querySelector('#performance-chart svg').dataset.animationState==='complete'&&document.querySelector('.full-video-link').textContent.includes('查看')`);
 await screenshot('.cache/preview/desktop-results-dark-zh.png');
 await evaluate(`document.querySelector('#language-toggle').click();document.querySelector('#theme-select').value='light';document.querySelector('#theme-select').dispatchEvent(new Event('change'));`);
 await viewport(1024,900);await wait(300);await scroll('#videos');
 await check('tablet shows two cards and a collapsed sidebar',`Math.abs(document.querySelector('.clip-card').getBoundingClientRect().width*2+18-document.querySelector('.clip-rail').clientWidth)<2&&getComputedStyle(document.querySelector('.floating-nav')).visibility==='hidden'&&document.documentElement.scrollWidth===innerWidth`);
 await viewport(390,844,true);await scroll('#videos');await screenshot('.cache/preview/mobile-videos.png');
 await check('390 px layout shows one card with a preview of the next',`Math.abs(document.querySelector('.clip-card').getBoundingClientRect().width+28-document.querySelector('.clip-rail').clientWidth)<2&&document.documentElement.scrollWidth===innerWidth`);
 await evaluate(`document.querySelector('#nav-toggle').click()`);await wait(180);
 await check('mobile menu opens and demo link is intact',`document.querySelector('#nav-toggle').getAttribute('aria-expanded')==='true'&&document.querySelector('main').inert&&document.querySelector('.nav-demo').getAttribute('href')==='./demo/'`);
 await screenshot('.cache/preview/mobile-navigation.png');
 await evaluate(`document.querySelector('.section-nav a[href="#performance"]').click()`);await wait(700);
 await check('section selection collapses mobile menu',`document.querySelector('#nav-toggle').getAttribute('aria-expanded')==='false'&&!document.querySelector('main').inert&&location.hash==='#performance'`);
 await scroll('#performance');await wait(750);await screenshot('.cache/preview/mobile-performance.png');
 const touchPoint=await evaluate(`(()=>{const m=document.querySelector('[data-bubble="anchor-global"]');const p=new DOMPoint(+m.dataset.pointX,+m.dataset.pointY).matrixTransform(m.getScreenCTM());return {x:p.x,y:p.y};})()`);
 await cdp('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
 await cdp('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touchPoint]});await cdp('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await wait(150);
 await check('real touch input opens exact bubble details',`!document.querySelector('#chart-tooltip').hidden&&document.querySelector('#chart-tooltip').textContent.includes('89.5841')`);
 await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 await go();await check('reduced motion renders final geometry immediately',`[...document.querySelectorAll('.research-svg')].every(svg=>svg.dataset.animationState==='complete')`);
 assert.equal(events.filter(e=>e.method==='Runtime.exceptionThrown').length,0,JSON.stringify(events.filter(e=>e.method==='Runtime.exceptionThrown').slice(0,3).map(e=>e.params.exceptionDetails.exception?.description)));
 console.log('PASS: no browser JavaScript exceptions');
} finally { await close(); }
