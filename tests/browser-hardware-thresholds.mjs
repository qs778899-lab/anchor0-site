import assert from 'node:assert/strict';
import {go,evaluate,viewport,screenshot,close,wait,cdp} from './browser-client.mjs';
await go();
await evaluate("if(document.documentElement.lang.startsWith('zh'))document.querySelector('.language-button').click()");

const result=await evaluate(`(async()=>{
 const data=await(await fetch('./data/hardware-thresholds.json')).json(),root=document.querySelector('#hardware-thresholds');
 const failures=[];let checked=0;
 for(const p of data.panels)for(const s of p.series)for(let i=0;i<7;i++){
  const chart=root.querySelector('#hardware-threshold-'+p.id+'-chart');
  const marks=[...chart.querySelectorAll('.radar-point')];
  const mark=marks.find(m=>{const d=JSON.parse(m.dataset.tip);return d.modelId===s.model_id&&d.metricId===data.categories[i].id});
  const tip=JSON.parse(mark.dataset.tip);
  if(tip.value!==s.values[i]||tip.count!==s.evaluated_motions[i]||tip.successes!==s.successful_motions[i])failures.push('data');
  mark.focus();
  if(document.querySelector('#chart-tooltip').hidden||!document.querySelector('#chart-tooltip').textContent.includes(tip.value.toFixed(4)))failures.push('focus');
  checked++;
 }
 for(const button of root.querySelectorAll('[data-focus-model]')){
  button.click();const selected=button.dataset.focusModel;
  for(const svg of root.querySelectorAll('svg')){
   if(svg.lastElementChild.dataset.series!==selected)failures.push('paint order');
   if([...svg.querySelectorAll('.series-muted [data-tip]')].some(m=>m.tabIndex!==-1))failures.push('focus mute');
  }
  button.click();
 }
 for(const p of data.panels){const id='hardware-threshold-'+p.id;root.querySelector('#'+id+'-data-tab').click();if(root.querySelector('#'+id+'-data').hidden)failures.push('data tab');root.querySelector('#'+id+'-chart-tab').click();}
 return {checked,failures,panels:root.querySelectorAll('.research-svg').length};
})()`);
assert.equal(result.checked,252);assert.equal(result.panels,6);assert.deepEqual(result.failures,[]);console.log(result);
const pointerCheck=await evaluate(`(()=>{
 const root=document.querySelector('#hardware-thresholds'),failures=[];let checked=0;
 for(const button of root.querySelectorAll('[data-focus-model]')){
  button.click();
  for(const mark of root.querySelectorAll('.radar-series:not(.series-muted) .radar-point')){
   const point=new DOMPoint(+mark.dataset.pointX,+mark.dataset.pointY).matrixTransform(mark.getScreenCTM());
   mark.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,clientX:point.x,clientY:point.y}));
   if(!document.querySelector('#chart-tooltip').textContent.includes(JSON.parse(mark.dataset.tip).value.toFixed(4)))failures.push('pointer');
   checked++;
  }
  button.click();
 }
 const chart=root.querySelector('svg'),zero=[...chart.querySelectorAll('.radar-point')].filter(m=>JSON.parse(m.dataset.tip).value===0);
 zero[0].focus();
 if(+document.querySelector('#chart-tooltip').dataset.items!==zero.length)failures.push('zero overlaps');
 const final=root.querySelector('#hardware-threshold-f-chart'),hundred=[...final.querySelectorAll('.radar-point')].filter(m=>{const t=JSON.parse(m.dataset.tip);return t.value===100&&t.metricId==='Mobile'});
 hundred[0].focus();
 if(+document.querySelector('#chart-tooltip').dataset.items!==hundred.length)failures.push('100 overlaps');
 return {checked,zeroOverlaps:zero.length,hundredOverlaps:hundred.length,failures};
})()`);
assert.equal(pointerCheck.checked,252);assert.deepEqual(pointerCheck.failures,[]);console.log(pointerCheck);
await evaluate("document.activeElement.blur();document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))");
for(const width of [1440,1024,390]){
 await viewport(width,1050,width===390);await wait(250);
 await evaluate("document.querySelector('#hardware-thresholds').scrollIntoView({behavior:'instant'})");
 const layout=await evaluate(`(()=>{const r=document.querySelector('#hardware-thresholds');return {width:${width},columns:getComputedStyle(r.querySelector('.threshold-matrix')).gridTemplateColumns.split(' ').length,overflow:document.documentElement.scrollWidth>innerWidth}})()`);
 assert.equal(layout.overflow,false);console.log(layout);
 await screenshot(`docs/previews/hardware-thresholds-${width}.png`);
}
await cdp('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
const touch=await evaluate(`(()=>{const m=document.querySelector('#hardware-threshold-a-chart .radar-point');m.focus();m.blur();const p=new DOMPoint(+m.dataset.pointX,+m.dataset.pointY).matrixTransform(m.getScreenCTM());return {x:p.x,y:p.y,value:JSON.parse(m.dataset.tip).value.toFixed(4)}})()`);
await cdp('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:touch.x,y:touch.y}]});
await cdp('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await wait(100);
assert.equal(await evaluate(`!document.querySelector('#chart-tooltip').hidden && document.querySelector('#chart-tooltip').textContent.includes('${touch.value}')`),true);
await evaluate("document.querySelector('.language-button').click()");
assert.equal(await evaluate("document.querySelectorAll('#hardware-thresholds .radar-point').length"),252);
await evaluate("document.documentElement.dataset.theme='dark'");
await screenshot('docs/previews/hardware-thresholds-mobile-dark.png');
await close();
