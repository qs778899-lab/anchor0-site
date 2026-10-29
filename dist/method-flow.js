import {METHOD_IMAGE, METHOD_FLOWS} from './method-flow-paths.js';

const button = document.querySelector('#method [data-zoom="./assets/images/method.png"]');
const original = button.querySelector('img');
const dialog = document.querySelector('#image-dialog');
const dialogImage = document.querySelector('#dialog-image');
const dialogArea = dialogImage.parentElement;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const namespace = 'http://www.w3.org/2000/svg';
const surfaces = new Set();
const controls = new Set();
let modalSurface = null, modalControl = null;
let userPaused = null, hasStarted = false;
let elapsed = 0, lastFrame = null, frame = null;

const paused = () => userPaused ?? reducedMotion.matches;
const chinese = () => document.documentElement.lang.startsWith('zh');
function element(name, attributes = {}) {
  const node = document.createElementNS(namespace, name);
  Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
  return node;
}
function highlight(color) {
  return '#' + color.slice(1).match(/../g).map(channel => {
    const base = parseInt(channel, 16);
    return Math.round(base + (255 - base) * .58).toString(16).padStart(2, '0');
  }).join('');
}

function createSurface(image, id) {
  const container = document.createElement('span');
  container.className = 'method-flow-surface';
  image.before(container);container.append(image);
  const svg = element('svg', {viewBox:`0 0 ${METHOD_IMAGE.width} ${METHOD_IMAGE.height}`, class:'method-flow-overlay', 'aria-hidden':'true', focusable:'false', 'data-surface':id});
  const defs = element('defs');
  const maskId = `method-flow-alpha-${id}`;
  const mask = element('mask', {id:maskId, maskUnits:'userSpaceOnUse', x:0, y:0, width:METHOD_IMAGE.width, height:METHOD_IMAGE.height, style:'mask-type:alpha'});
  // The PNG's alpha preserves the exact existing gaps in the outer dashed feedback lines.
  mask.append(element('image', {href:original.src, x:0, y:0, width:METHOD_IMAGE.width, height:METHOD_IMAGE.height}));
  defs.append(mask);svg.append(defs);
  const lines = element('g', {mask:`url(#${maskId})`});
  const paths = new Map();
  METHOD_FLOWS.forEach((flow, index) => {
    const path = element('path', {d:flow.d, stroke:highlight(flow.color), class:'method-flow-highlight', 'data-flow':flow.id, 'data-group':flow.group});
    const preceding = paths.get(flow.continues);
    const phase = preceding ? preceding.phase + preceding.path.getTotalLength() : index * 37 % 200;
    path.style.setProperty('--flow-phase', `${phase % 200}px`);
    lines.append(path);paths.set(flow.id, {path, phase});
  });
  svg.append(lines);container.append(svg);
  const surface = {container, image, svg, id, visible:false, running:false};
  surfaces.add(surface);visibility.observe(container);
  image.addEventListener('load', reconcile);
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

function tick(timestamp) {
  if (lastFrame !== null) elapsed = (elapsed + timestamp - lastFrame) % 2000;
  lastFrame = timestamp;
  for (const surface of surfaces) if (surface.running) surface.svg.style.setProperty('--flow-offset', `${-elapsed / 10}px`);
  frame = requestAnimationFrame(tick);
}
function reconcile() {
  let running = false;
  const anyModalOpen = !!document.querySelector('dialog[open]');
  for (const surface of surfaces) {
    surface.running = !paused() && !document.hidden && surface.visible && surface.image.complete && !!surface.image.naturalWidth &&
      (surface.id === 'inline' ? !anyModalOpen : dialog.open && surface === modalSurface);
    surface.svg.dataset.running = String(surface.running);
    if (surface.running) {
      surface.svg.dataset.started = 'true';
      surface.svg.style.setProperty('--flow-offset', `${-elapsed / 10}px`);
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
