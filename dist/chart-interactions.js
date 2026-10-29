const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];
const tooltip = document.querySelector('#chart-tooltip');
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const t = (en,zh) => document.documentElement.lang.startsWith('zh') ? zh : en;
const exact = value => Number(value).toLocaleString('en-US',{minimumFractionDigits:4,maximumFractionDigits:4});
const seen = new Set();
const charts = new WeakMap();
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let pinned = false, hideTimer, activeMarks=[], keyboardTip=false;

export function hideTooltip() {
  tooltip.hidden = true;
  pinned = false;
  activeMarks=[];
  clearTimeout(hideTimer);
  $$('[aria-describedby="chart-tooltip"]').forEach(mark => mark.removeAttribute('aria-describedby'));
}

export function finishChart(chart) {
  const state = charts.get(chart);
  if (!state) return;
  seen.add(state.key);
  state.animations.forEach(animation => animation.cancel());
  state.animations = [];
  state.elements.forEach(({element}) => { element.style.removeProperty('transform'); element.style.removeProperty('opacity'); });
  chart.dataset.animationState = 'complete';
  observer.unobserve(chart);
}

function animateChart(chart) {
  const state = charts.get(chart);
  if (!state || chart.dataset.animationState !== 'pending') return;
  if (reduced.matches || seen.has(state.key)) { finishChart(chart); return; }
  seen.add(state.key);
  chart.dataset.animationState = 'running';
  state.animations = state.elements.map(({element, from, to}) => element.animate([from, to], {
    duration:700, easing:'cubic-bezier(.2,.65,.25,1)', fill:'both'
  }));
  Promise.all(state.animations.map(animation => animation.finished.catch(() => {}))).then(() => finishChart(chart));
}

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.target.isConnected) { observer.unobserve(entry.target); return; }
    if (entry.isIntersecting && entry.intersectionRatio >= .25) animateChart(entry.target);
  });
}, {threshold:[0,.25]});

export function enhanceCharts(root=document) {
  $$('.research-svg',root).forEach(chart => {
    if (charts.has(chart)) return;
    const pane = chart.closest('.figure-chart');
    const key = `${pane.id}:${$$('.research-svg',pane).indexOf(chart)}`;
    const elements = [];
    $$('[data-grow]',chart).forEach(element => {
      const horizontal = element.dataset.grow === 'x';
      const x = element.x.baseVal.value, y = element.y.baseVal.value + (horizontal ? 0 : element.height.baseVal.value);
      element.style.transformOrigin = `${x}px ${y}px`;
      elements.push({element, from:{transform:horizontal?'scaleX(0)':'scaleY(0)'}, to:{transform:'scale(1)'}});
    });
    $$('.radar-series',chart).forEach(element => {
      element.style.transformOrigin = `${element.dataset.centerX}px ${element.dataset.centerY}px`;
      elements.push({element,from:{transform:'scale(0)'},to:{transform:'scale(1)'}});
    });
    $$('.bubble-mark',chart).forEach(element => elements.push({element,from:{opacity:0},to:{opacity:1}}));
    charts.set(chart,{key,elements,animations:[]});
    chart.dataset.animationKey = key;
    if (seen.has(key) || reduced.matches) { finishChart(chart); return; }
    elements.forEach(({element,from}) => Object.assign(element.style,from));
    chart.dataset.animationState = 'pending';
    observer.observe(chart);
  });
}
reduced.addEventListener('change', () => { if (reduced.matches) $$('.research-svg').forEach(finishChart); });

function pointPosition(mark) {
  const matrix = mark.getScreenCTM();
  if (!matrix) return null;
  const point = new DOMPoint(Number(mark.dataset.pointX),Number(mark.dataset.pointY)).matrixTransform(matrix);
  return {x:point.x,y:point.y,scale:Math.hypot(matrix.a,matrix.b)};
}

// Resolve by true projected coordinates, independent of SVG painting order.
// Exact coincident points stay coincident; nearby points are independently selectable.
function nearestMarks(chart, x, y, reference=null) {
  const candidates = $$('[data-point-x][data-tip]',chart).filter(mark => !mark.closest('.series-muted'));
  const referencePoint = reference && pointPosition(reference);
  if (referencePoint) { x=referencePoint.x; y=referencePoint.y; }
  const distances = candidates.map(mark => {
    const point = pointPosition(mark);
    return point && {mark,distance:Math.hypot(point.x-x,point.y-y),radius:Math.max(12,Number(mark.dataset.hitRadius||0)*point.scale)};
  }).filter(Boolean);
  const near = distances.filter(item => item.distance <= (reference ? .0001 : item.radius));
  if (!near.length) return [];
  const minimum = Math.min(...near.map(item => item.distance));
  const result = near.filter(item => item.distance <= minimum + .0001).map(item => item.mark);
  // The focused mark is first for a predictable reading order when using Tab.
  if (reference && result.includes(reference)) result.sort((a,b) => Number(b===reference)-Number(a===reference));
  return result;
}

function marksAt(event, keyboard=false) {
  const direct = event.target.closest?.('[data-tip]');
  const chart = event.target.closest?.('.research-svg');
  if (chart) {
    finishChart(chart);
    if (keyboard && direct?.hasAttribute('data-point-x')) return nearestMarks(chart,0,0,direct);
    if (!keyboard) {
      const nearest = nearestMarks(chart,event.clientX,event.clientY);
      if (nearest.length) return nearest;
    }
  }
  return direct && !direct.closest('svg .series-muted') ? [direct] : [];
}

function showTips(marks, event, keyboard=false) {
  if (!marks.length) return;
  clearTimeout(hideTimer);
  $$('[aria-describedby="chart-tooltip"]').forEach(mark=>{if(!marks.includes(mark))mark.removeAttribute('aria-describedby');});
  activeMarks=marks;keyboardTip=keyboard;
  const tips = marks.map(mark => JSON.parse(mark.dataset.tip));
  tooltip.innerHTML = `<div class="tooltip-dataset">${esc(tips[0].dataset||'')}</div>${tips.map(tip => `<div class="tooltip-entry"><strong>${esc(tip.model)}</strong><div>${esc(tip.metric)}</div><div class="tooltip-value">${exact(tip.value)} ${esc(tip.unit)}</div>${tip.count!=null?`<small>${tip.successes!=null?`${tip.successes.toLocaleString('en-US')} / `:''}${tip.count.toLocaleString('en-US')} ${t('motions','条动作')}${tip.contributing!=null?` · ${t('contributing to error mean','参与误差统计')} ${tip.contributing}`:''}</small>`:''}${tip.note?`<small>${esc(tip.note)}</small>`:''}${tip.config?`<small class="tooltip-config">${esc(tip.config)}</small>`:''}</div>`).join('')}`;
  tooltip.dataset.items = String(tips.length);
  tooltip.hidden = false;
  marks.forEach(mark => mark.setAttribute('aria-describedby','chart-tooltip'));
  const rect = marks[0].getBoundingClientRect();
  const x = keyboard ? rect.left+rect.width/2 : event.clientX;
  const y = keyboard ? rect.top : event.clientY;
  tooltip.style.left = `${Math.max(8,Math.min(innerWidth-tooltip.offsetWidth-8,x+16))}px`;
  tooltip.style.top = `${Math.max(8,Math.min(innerHeight-tooltip.offsetHeight-8,y+18))}px`;
}

document.addEventListener('pointermove', event => {
  const chart=event.target.closest?.('.research-svg');
  if (chart) finishChart(chart);
  if (tooltip.contains(event.target)) return;
  const marks = marksAt(event);
  if (marks.length) { showTips(marks,event); pinned=false; }
  else if (!pinned && !tooltip.hidden) { clearTimeout(hideTimer); hideTimer=setTimeout(hideTooltip,160); }
});
document.addEventListener('pointerout', event => {
  if (!pinned && !event.relatedTarget) hideTooltip();
});
tooltip.addEventListener('pointerenter', () => clearTimeout(hideTimer));
tooltip.addEventListener('pointerleave', () => { if (!pinned) hideTooltip(); });
document.addEventListener('focusin', event => {
  hideTooltip();
  const marks = marksAt(event,true);
  if (marks.length) showTips(marks,event,true);
});
document.addEventListener('click', event => {
  if (tooltip.contains(event.target)) return;
  const marks = marksAt(event,event.detail===0);
  if (marks.length) { showTips(marks,event,event.detail===0); pinned=true; }
  else hideTooltip();
});
document.addEventListener('keydown', event => {
  if (event.key==='Escape') hideTooltip();
  if (['Enter',' '].includes(event.key) && event.target.matches('[data-tip]')) {
    event.preventDefault(); showTips(marksAt(event,true),event,true); pinned=true;
  }
});
window.addEventListener('scroll',()=>{
  // Keyboard focus may scroll a newly focused mark into view. Keep its details attached.
  if(keyboardTip && activeMarks.includes(document.activeElement)){
    const rect=document.activeElement.getBoundingClientRect();
    if(rect.bottom>0 && rect.top<innerHeight){showTips(activeMarks,null,true);return;}
  }
  hideTooltip();
},{passive:true});
window.addEventListener('resize',hideTooltip);
