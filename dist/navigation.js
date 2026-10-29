const sidebar = document.querySelector('.floating-nav');
const toggle = document.querySelector('#nav-toggle');
const backdrop = document.querySelector('#nav-backdrop');
const compact = matchMedia('(max-width: 1199px)');
const links = [...sidebar.querySelectorAll('.section-nav a')];
const sections = links.map(link => document.querySelector(link.hash));
const content = [document.querySelector('main'), document.querySelector('footer')];

function setOpen(open, restoreFocus=false) {
  sidebar.classList.toggle('is-open', open);
  toggle.setAttribute('aria-expanded', String(open));
  backdrop.hidden = !open;
  document.body.classList.toggle('menu-open', open);
  content.forEach(el => { el.inert = open; });
  sidebar.inert = compact.matches && !open;
  if (open) (sidebar.querySelector('[aria-current]') || links[0]).focus();
  else if (restoreFocus) toggle.focus();
}
toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
backdrop.addEventListener('click', () => setOpen(false, true));
sidebar.addEventListener('click', event => { if (compact.matches && event.target.closest('a')) setOpen(false, true); });
document.addEventListener('keydown', event => {
  if (toggle.getAttribute('aria-expanded') !== 'true') return;
  if (event.key === 'Escape') { setOpen(false, true); return; }
  if (event.key !== 'Tab') return;
  const available = [toggle, ...sidebar.querySelectorAll('a, button, select')];
  const first = available[0], last = available.at(-1);
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});
compact.addEventListener('change', () => setOpen(false));
setOpen(false);

let pending = false;
function updatePosition() {
  const threshold = innerHeight * .27;
  let active = sections[0];
  for (const section of sections) if (section.getBoundingClientRect().top <= threshold) active = section;
  if (scrollY + innerHeight >= document.documentElement.scrollHeight - 2) active = sections.at(-1);
  links.forEach(link => {
    if (link.hash === `#${active.id}`) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  const total = document.documentElement.scrollHeight - innerHeight;
  document.querySelector('.reading-progress').style.width = `${total > 0 ? scrollY / total * 100 : 0}%`;
  pending = false;
}
window.addEventListener('scroll', () => { if (!pending) { pending = true; requestAnimationFrame(updatePosition); } }, {passive:true});
window.addEventListener('resize', updatePosition);
updatePosition();

// Only the window handle moves the navigation; links and controls remain ordinary controls.
const handle=sidebar.querySelector('.nav-drag-handle');
const reset=sidebar.querySelector('.nav-reset');
const positionKey='anchor-navigation-position';
let positions={},drag=null;
try{const saved=JSON.parse(localStorage.getItem(positionKey)||'{}');if(saved&&typeof saved==='object'&&!Array.isArray(saved))positions=saved;}catch{}
const mode=()=>compact.matches?'compact':'desktop';
const savePositions=()=>{try{localStorage.setItem(positionKey,JSON.stringify(positions));}catch{}};
function place(x,y,save=false){
  const margin=16,minTop=compact.matches?65:margin;
  x=Math.max(margin,Math.min(x,Math.max(margin,innerWidth-sidebar.offsetWidth-margin)));
  y=Math.max(minTop,Math.min(y,Math.max(minTop,innerHeight-sidebar.offsetHeight-margin)));
  sidebar.style.left=`${x}px`;sidebar.style.top=`${y}px`;
  if(save){positions[mode()]={x,y};savePositions();}
}
function restorePosition(){
  const p=positions[mode()];
  sidebar.style.left='';sidebar.style.top='';
  if(p&&Number.isFinite(p.x)&&Number.isFinite(p.y))place(p.x,p.y);
}
function resetPosition(){delete positions[mode()];savePositions();restorePosition();}
function endDrag(event){
  if(!drag||event.pointerId!==drag.id)return;
  const box=sidebar.getBoundingClientRect();place(box.left,box.top,true);
  drag=null;sidebar.classList.remove('is-dragging');
  if(handle.hasPointerCapture(event.pointerId))handle.releasePointerCapture(event.pointerId);
}
handle.addEventListener('pointerdown',event=>{
  if(!event.isPrimary||event.button!==0)return;
  const b=sidebar.getBoundingClientRect();drag={id:event.pointerId,x:event.clientX,y:event.clientY,left:b.left,top:b.top};
  handle.focus({preventScroll:true});handle.setPointerCapture(event.pointerId);sidebar.classList.add('is-dragging');
});
handle.addEventListener('pointermove',event=>{
  if(!drag||event.pointerId!==drag.id)return;
  place(drag.left+event.clientX-drag.x,drag.top+event.clientY-drag.y);
});
['pointerup','pointercancel','lostpointercapture'].forEach(type=>handle.addEventListener(type,endDrag));
handle.addEventListener('keydown',event=>{
  if(event.key==='Home'){event.preventDefault();resetPosition();return;}
  const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.key];
  if(!delta)return;
  event.preventDefault();const b=sidebar.getBoundingClientRect(),step=event.shiftKey?40:10;
  place(b.left+delta[0]*step,b.top+delta[1]*step,true);
});
reset.addEventListener('click',resetPosition);
function translateHandle(){
  const zh=document.documentElement.lang.startsWith('zh');
  handle.setAttribute('aria-label',zh?'移动目录：拖动或使用方向键，Home 键恢复位置':'Move navigation: drag or use arrow keys; Home resets position');
  handle.title=zh?'拖动或使用方向键移动':'Drag or use arrow keys to move';
}
new MutationObserver(()=>{translateHandle();restorePosition();}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
new ResizeObserver(restorePosition).observe(sidebar);
compact.addEventListener('change',restorePosition);
window.addEventListener('resize',restorePosition);
restorePosition();translateHandle();
