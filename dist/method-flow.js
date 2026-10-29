import {METHOD_IMAGE, METHOD_FLOWS} from './method-flow-paths.js';
import {buildMethodLayers} from './method-flow-layers.js';
import {METHOD_PULSE, METHOD_PANELS, METHOD_DURATION, methodFrame} from './method-flow-timeline.js';

const button = document.querySelector('#method [data-zoom="./assets/images/method.png"]');
const original = button.querySelector('img');
const dialog = document.querySelector('#image-dialog');
const dialogImage = document.querySelector('#dialog-image');
const dialogArea = dialogImage.parentElement;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const namespace = 'http://www.w3.org/2000/svg';
const streamColors = {'#156082':'#008eff','#7960af':'#a13cff','#4e887a':'#00b58b','#aa7b26':'#ee9b00','#747474':'#768da8','#7f7f7f':'#768da8'};
const surfaces = new Set();
const controls = new Set();
let modalSurface = null, modalControl = null;
let userPaused = null, hasStarted = false;
let elapsed = 0, lastFrame = null, frame = null;
const layers=buildMethodLayers(original.src);

const paused = () => userPaused ?? reducedMotion.matches;
const chinese = () => document.documentElement.lang.startsWith('zh');
function element(name, attributes = {}) {
  const node = document.createElementNS(namespace, name);
  Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
  return node;
}
function createSurface(image, id) {
  const container = document.createElement('span');
  container.className = 'method-flow-surface';
  image.before(container);container.append(image);
  const svg = element('svg', {viewBox:`0 0 ${METHOD_IMAGE.width} ${METHOD_IMAGE.height}`, class:'method-flow-overlay', 'aria-hidden':'true', focusable:'false', 'data-surface':id});
  const defs = element('defs');
  const maskId = `method-flow-alpha-${id}`;
  const mask = element('mask', {id:maskId, maskUnits:'userSpaceOnUse', x:0, y:0, width:METHOD_IMAGE.width, height:METHOD_IMAGE.height, style:'mask-type:alpha'});
  const maskImage=element('image', {x:0, y:0, width:METHOD_IMAGE.width, height:METHOD_IMAGE.height});
  mask.append(maskImage);
  const auraMask=mask.cloneNode(true),auraId=`method-flow-aura-${id}`;
  auraMask.setAttribute('id',auraId);
  const auraImage=auraMask.querySelector('image');
  const glowId=`method-flow-glow-${id}`;
  const glow=element('filter',{id:glowId,filterUnits:'userSpaceOnUse',x:0,y:0,width:METHOD_IMAGE.width,height:METHOD_IMAGE.height,'color-interpolation-filters':'sRGB'});
  glow.append(element('feGaussianBlur',{stdDeviation:2}));
  defs.append(mask,auraMask,glow);svg.append(defs);
  const fade=element('image', {class:'method-flow-fade', x:0, y:0, width:METHOD_IMAGE.width, height:METHOD_IMAGE.height});
  svg.append(fade);
  const panels=METHOD_PANELS.map(({group,...geometry})=>{
    const node=element('g',{'data-panel':group,visibility:'hidden'});
    const {color,...bounds}=geometry;
    node.append(element('rect',{...bounds,stroke:color,class:'method-panel-glow method-panel-glow-soft',filter:`url(#${glowId})`}),
      element('rect',{...bounds,stroke:color,class:'method-panel-glow'}));
    svg.append(node);return {group,node};
  });
  const halos = element('g', {mask:`url(#${auraId})`});
  const haloPaths=element('g',{filter:`url(#${glowId})`});halos.append(haloPaths);
  const lines = element('g', {mask:`url(#${auraId})`});
  const tips = element('g', {mask:`url(#${maskId})`});
  const paths = new Map();
  METHOD_FLOWS.forEach((flow, index) => {
    const color=streamColors[flow.color]||flow.color;
    const path = element('path', {d:flow.d, stroke:color, class:'method-flow-highlight', 'data-flow':flow.id, 'data-group':flow.group});
    path.setAttribute('visibility','hidden');
    const halo=path.cloneNode();halo.removeAttribute('data-flow');halo.setAttribute('class','method-flow-highlight method-flow-aura');haloPaths.append(halo);
    const core=path.cloneNode();core.removeAttribute('data-flow');core.setAttribute('class','method-flow-highlight method-flow-core');core.setAttribute('stroke','#f4fcff');
    lines.append(path,core);
    const length=path.getTotalLength(),nodes=[{node:path,shift:0},{node:core,shift:0},{node:halo,shift:0}];
    paths.set(flow.id, {path,nodes,length});
    if(flow.arrowhead!==false){
      const end=path.getPointAtLength(length),previous=path.getPointAtLength(length-1);
      const dx=Math.sign(end.x-previous.x),dy=Math.sign(end.y-previous.y);
      const clipId=`method-flow-tip-${id}-${index}`,clip=element('clipPath',{id:clipId,clipPathUnits:'userSpaceOnUse'});
      clip.append(element('polygon',{points:`${end.x-dy*15.5},${end.y+dx*15.5} ${end.x+dx*28.5},${end.y+dy*28.5} ${end.x+dy*15.5},${end.y-dx*15.5}`}));
      defs.append(clip);
      const tip=element('path',{d:`M${end.x} ${end.y} l${dx*28.5} ${dy*28.5}`,stroke:color,class:'method-flow-highlight method-flow-tip','clip-path':`url(#${clipId})`,'data-flow-tip':flow.id});
      tip.setAttribute('visibility','hidden');
      const tipCore=tip.cloneNode();tipCore.removeAttribute('data-flow-tip');tipCore.setAttribute('class','method-flow-highlight method-flow-core');tipCore.setAttribute('stroke','#f4fcff');
      tips.append(tip,tipCore);
      nodes.push({node:tip,shift:length},{node:tipCore,shift:length});
    }
    nodes.forEach(({node})=>node.style.strokeDasharray=`${METHOD_PULSE} ${length+28.5+METHOD_PULSE*2}`);
  });
  svg.append(halos,lines,tips);container.append(svg);
  const surface = {container, image, svg, id, paths, panels, active:null, visible:false, running:false, ready:false};
  renderFrame(surface);
  surfaces.add(surface);visibility.observe(container);
  image.addEventListener('load', reconcile);
  layers.then(({fadeHref,maskHref,auraHref,stats})=>{
    maskImage.setAttribute('href',maskHref);auraImage.setAttribute('href',auraHref);fade.setAttribute('href',fadeHref);
    svg.dataset.maskPixels=stats.pixels;svg.dataset.maskReady='true';surface.ready=true;
    if(hasStarted){svg.dataset.started='true';renderFrame(surface);}
    reconcile();
  }).catch(error=>console.error('METHOD arrow layer:',error));
  return surface;
}

function updateControls() {
  const isPaused = paused();
  const text = isPaused ? (hasStarted ? (chinese() ? '继续播放' : 'Resume animation') : (chinese() ? '播放动画' : 'Play animation')) : (chinese() ? '暂停动画' : 'Pause animation');
  for (const control of controls) {
    control.querySelector('span').textContent = text;
    control.setAttribute('aria-label', text);
    control.dataset.paused = String(isPaused);
    control.querySelector('path').setAttribute('d', isPaused ? 'M4 2.5 10 6 4 9.5Z' : 'M4 2.5v7M8 2.5v7');
  }
}
function createControl() {
  const control = document.createElement('button');
  control.type = 'button';control.className = 'method-flow-toggle';
  control.innerHTML = '<svg viewBox="0 0 12 12" aria-hidden="true"><path/></svg><span></span>';
  control.addEventListener('click', () => {userPaused = !paused();updateControls();reconcile();});
  controls.add(control);updateControls();
  return control;
}

function renderFrame(surface) {
  const state=methodFrame(elapsed),active=state.entry?.id||null;
  if(surface.active!==active){
    if(surface.active)surface.paths.get(surface.active).nodes.forEach(({node})=>node.setAttribute('visibility','hidden'));
    if(active)surface.paths.get(active).nodes.forEach(({node})=>node.setAttribute('visibility','visible'));
    surface.active=active;
  }
  if(active)surface.paths.get(active).nodes.forEach(({node,shift})=>{node.style.strokeDashoffset=`${state.offset+shift}px`;});
  surface.panels.forEach(({group,node})=>{
    node.setAttribute('visibility',state.entry?.group===group?'visible':'hidden');
    node.setAttribute('opacity',state.breath);
  });
  surface.svg.dataset.elapsed=elapsed.toFixed(3);
  surface.svg.dataset.activeFlow=active||'';
  surface.svg.dataset.stage=state.entry?.group||'';
  surface.svg.dataset.progress=state.progress.toFixed(5);
}
function tick(timestamp) {
  if (lastFrame !== null) elapsed = (elapsed + timestamp - lastFrame) % METHOD_DURATION;
  lastFrame = timestamp;
  for (const surface of surfaces) if (surface.running) renderFrame(surface);
  frame = requestAnimationFrame(tick);
}
function reconcile() {
  let running = false;
  const anyModalOpen = !!document.querySelector('dialog[open]');
  for (const surface of surfaces) {
    surface.running = surface.ready && !paused() && !document.hidden && surface.visible && surface.image.complete && !!surface.image.naturalWidth &&
      (surface.id === 'inline' ? !anyModalOpen : dialog.open && surface === modalSurface);
    surface.svg.dataset.running = String(surface.running);
    if (surface.running) {
      surface.svg.dataset.started = 'true';
      renderFrame(surface);
      running = true;hasStarted = true;
    }
  }
  if (running && frame === null) frame = requestAnimationFrame(tick);
  if (!running && frame !== null) {cancelAnimationFrame(frame);frame = null;lastFrame = null;}
  updateControls();
}
const visibility = new IntersectionObserver(entries => {
  for (const entry of entries) {
    const surface = [...surfaces].find(item => item.container === entry.target);
    if (surface) surface.visible = entry.isIntersecting && entry.intersectionRect.width > 0 && entry.intersectionRect.height > 0;
  }
  reconcile();
});

function sizeDialog() {
  if (!modalSurface) return;
  const style = getComputedStyle(dialogArea);
  const width = dialogArea.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  const height = dialogArea.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
  if (width <= 0 || height <= 0) return;
  const scale = dialogImage.classList.contains('expanded') ? 1 : Math.min(1, width / METHOD_IMAGE.width, height / METHOD_IMAGE.height);
  modalSurface.container.style.width = `${METHOD_IMAGE.width * scale}px`;
  modalSurface.container.style.height = `${METHOD_IMAGE.height * scale}px`;
}
function updateDialog() {
  const isMethod = dialog.open && dialogImage.src === original.src;
  if (isMethod && !modalSurface) {
    dialog.classList.add('method-flow-dialog');dialogArea.classList.add('method-flow-area');
    modalSurface = createSurface(dialogImage, 'dialog');
    modalControl = createControl();document.querySelector('#original-image').before(modalControl);
  } else if (!isMethod && modalSurface) {
    visibility.unobserve(modalSurface.container);
    dialogImage.removeEventListener('load', reconcile);
    surfaces.delete(modalSurface);
    modalSurface.container.replaceWith(dialogImage);modalSurface = null;
    controls.delete(modalControl);modalControl.remove();modalControl = null;
    dialog.classList.remove('method-flow-dialog');dialogArea.classList.remove('method-flow-area');
  }
  sizeDialog();reconcile();
}

createSurface(original, 'inline');
const actions = document.createElement('div');actions.className = 'method-flow-actions';
actions.append(createControl());button.after(actions);
new ResizeObserver(sizeDialog).observe(dialogArea);
const modalObserver = new MutationObserver(updateDialog);
document.querySelectorAll('dialog').forEach(modal => modalObserver.observe(modal, {attributes:true, attributeFilter:['open']}));
modalObserver.observe(dialogImage, {attributes:true, attributeFilter:['src','class']});
dialog.addEventListener('close', updateDialog);
new MutationObserver(() => {
  updateControls();
  if (modalSurface) document.querySelector('#image-caption').textContent = button.dataset[chinese() ? 'captionZh' : 'captionEn'];
}).observe(document.documentElement, {attributes:true, attributeFilter:['lang']});
document.addEventListener('visibilitychange', reconcile);
reducedMotion.addEventListener('change', reconcile);
