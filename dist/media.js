const $ = (selector, root=document) => root.querySelector(selector);
const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];
const locale = () => document.documentElement.lang.startsWith('zh') ? 'zh' : 'en';
const t = (en, zh) => locale() === 'zh' ? zh : en;
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const bilingual = (tag, title) => `<${tag} data-en="${esc(title.en)}" data-zh="${esc(title.zh)}">${esc(title[locale()])}</${tag}>`;
const videoUrl = (path, revision) => `./${path}${revision ? `?v=${encodeURIComponent(revision)}` : ''}`;
const states = new Map();
const rails = new Map();
let manifest;
const dialog = $('#video-dialog');

function available(video, state) {
  return !document.hidden && (document.fullscreenElement?.contains(video) || video.webkitDisplayingFullscreen ||
    (state.visible && (dialog.open ? dialog.contains(video) : !dialog.contains(video))));
}

function load(video) {
  if (video.dataset.loaded) return;
  $$('source[data-src]', video).forEach(source => { source.src = source.dataset.src; });
  video.preload = 'metadata';
  video.dataset.loaded = 'true';
  video.load();
}

function pauseAutomatically(video, state) {
  if (!video.paused) {
    state.automaticPauses++;
    video.pause();
  }
}

async function play(video, state, manual=false) {
  if (!video.paused || state.pendingPlay || (!manual && (state.userPaused || state.finished || !available(video, state)))) return;
  load(video);
  if (manual) { state.userPaused = false; state.finished = false; }
  state.pendingPlay = true;
  state.automaticPlay = !manual;
  try {
    await video.play();
    state.cover.hidden = true;
  } catch (error) {
    // An interrupted load/pause is normal when scrolling quickly.
    if (error.name !== 'AbortError') state.cover.hidden = false;
  } finally {
    state.pendingPlay = false;
    state.automaticPlay = false;
    if (!available(video, state)) pauseAutomatically(video, state);
  }
}

function reconcile() {
  for (const [video, state] of states) {
    if (available(video, state)) play(video, state);
    else pauseAutomatically(video, state);
  }
}

const preloadObserver = new IntersectionObserver(entries => {
  entries.forEach(({target, isIntersecting}) => {
    if (!isIntersecting || target.closest('dialog')) return;
    load(target);
    preloadObserver.unobserve(target);
  });
}, {rootMargin: '350px 0px'});
const playbackObserver = new IntersectionObserver(entries => {
  entries.forEach(({target, isIntersecting, intersectionRatio}) => {
    const state = states.get(target);
    state.visible = isIntersecting && intersectionRatio >= .15;
  });
  reconcile();
}, {threshold: [0, .15]});

function updateRail(rail) {
  const state=rails.get(rail), maximum=Math.max(0,rail.scrollWidth-rail.clientWidth);
  state.controls.hidden=maximum<=2;
  state.previous.disabled=rail.scrollLeft<=2;
  state.next.disabled=rail.scrollLeft>=maximum-2;
  if (!state.near) return;
  // A rail can be near vertically while most of its clips are still far off to the side.
  const bounds=rail.getBoundingClientRect();
  const visible=state.cards.map((card,index)=>{
    const rect=card.getBoundingClientRect();
    const overlap=Math.min(bounds.right,rect.right)-Math.max(bounds.left,rect.left);
    return overlap>=rect.width*.15?index:-1;
  }).filter(index=>index>=0);
  if (!visible.length) return;
  const first=Math.max(0,visible[0]-1), last=Math.min(state.cards.length-1,visible.at(-1)+1);
  state.cards.slice(first,last+1).forEach(card=>load($('video',card)));
}

function moveRail(rail,direction) {
  const state=rails.get(rail), maximum=Math.max(0,rail.scrollWidth-rail.clientWidth);
  const step=state.cards[0].getBoundingClientRect().width+parseFloat(getComputedStyle(rail).columnGap);
  const position=state.destination??rail.scrollLeft;
  const destination=direction==='start'?0:direction==='end'?maximum:
    Math.max(0,Math.min(maximum,(Math.round(position/step)+direction)*step));
  state.destination=destination;
  rail.scrollTo({left:destination,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
}

const railProximityObserver=new IntersectionObserver(entries=>{
  entries.forEach(({target,isIntersecting})=>{rails.get(target).near=isIntersecting;updateRail(target);});
},{rootMargin:'350px 0px'});
const railSizeObserver=new ResizeObserver(entries=>entries.forEach(({target})=>updateRail(target)));

function registerRail(rail) {
  const group=rail.closest('.video-group');
  const state={cards:$$('.clip-card',rail),controls:$('.rail-controls',group),previous:$('[data-rail-step="-1"]',group),next:$('[data-rail-step="1"]',group),near:false,destination:null,pending:false,settleTimer:null};
  rails.set(rail,state);
  state.previous.addEventListener('click',()=>moveRail(rail,-1));
  state.next.addEventListener('click',()=>moveRail(rail,1));
  rail.addEventListener('keydown',event=>{
    if(event.target!==rail)return; // Keep native video controls' keyboard shortcuts intact.
    const direction={ArrowLeft:-1,ArrowRight:1,Home:'start',End:'end'}[event.key];
    if(direction===undefined)return;
    event.preventDefault();moveRail(rail,direction);
  });
  rail.addEventListener('scroll',()=>{
    if(!state.pending){state.pending=true;requestAnimationFrame(()=>{state.pending=false;updateRail(rail);});}
    clearTimeout(state.settleTimer);
    state.settleTimer=setTimeout(()=>{state.destination=null;},160);
  },{passive:true});
  ['pointerdown','touchstart','wheel'].forEach(type=>rail.addEventListener(type,()=>{state.destination=null;},{passive:true}));
  railProximityObserver.observe(rail);
  railSizeObserver.observe(rail);
  updateRail(rail);
}

function register(frame) {
  const video = $('video', frame), cover = $('.video-cover', frame);
  if (states.has(video)) return;
  const state = {visible:false, userPaused:false, finished:false, automaticPauses:0, pendingPlay:false, automaticPlay:false, cover};
  states.set(video, state);
  video.muted = true;
  video.defaultMuted = true;
  video.controls = true;
  cover.addEventListener('click', () => play(video, state, true));
  video.addEventListener('play', () => {
    cover.hidden = true;
    if (!state.automaticPlay) { state.userPaused = false; state.finished = false; }
    if (!available(video, state)) pauseAutomatically(video, state);
  });
  video.addEventListener('pause', () => {
    if (state.automaticPauses) state.automaticPauses--;
    else if (!video.ended) state.userPaused = true;
  });
  video.addEventListener('ended', () => { state.finished = true; });
  video.addEventListener('volumechange', () => {
    if (!video.muted && video.volume > 0) for (const other of states.keys()) if (other !== video) other.muted = true;
  });
  video.addEventListener('error', () => {
    cover.hidden = false;
    frame.dataset.error = 'true';
    cover.setAttribute('aria-label', t('Video unavailable. Retry playback.', '视频暂不可用，重新播放。'));
  });
  playbackObserver.observe(video);
  if(!video.closest('.clip-rail'))preloadObserver.observe(video);
}

function render() {
  $('#video-groups').innerHTML = manifest.groups.map((group, gi) => `<section class="video-group" aria-labelledby="${group.id}-title">
    <div class="video-group-heading"><div><h3 id="${group.id}-title">${bilingual('span', group.title)}</h3>${bilingual('p', group.description)}</div><div class="video-group-actions"><button type="button" class="full-video-link" data-full-video="${group.id}" data-en="Watch full video ↗" data-zh="查看完整视频 ↗">${t('Watch full video ↗','查看完整视频 ↗')}</button><div class="rail-controls" hidden><button type="button" class="rail-arrow" data-rail-step="-1" aria-controls="${group.id}-clips" aria-label="${t('Previous video','上一段视频')}" disabled><svg aria-hidden="true" viewBox="0 0 24 24"><path d="m14 6-6 6 6 6"/></svg></button><button type="button" class="rail-arrow" data-rail-step="1" aria-controls="${group.id}-clips" aria-label="${t('Next video','下一段视频')}"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="m10 6 6 6-6 6"/></svg></button></div></div></div>
    <div class="clip-rail" id="${group.id}-clips" role="region" aria-labelledby="${group.id}-title" tabindex="0">${group.clips.map((clip, i) => `<article class="clip-card">
      <div class="video-frame" data-video="${clip.id}" style="--video-ratio:${clip.width} / ${clip.height}">
        <video preload="none" muted playsinline controls loop poster="${videoUrl(clip.poster, clip.posterRevision)}" aria-label="${esc(clip.title[locale()])}" data-label-en="${esc(clip.title.en)}" data-label-zh="${esc(clip.title.zh)}"><source data-src="${videoUrl(clip.output, clip.revision)}" type="video/mp4"></video>
        <button class="video-cover" type="button" aria-label="${t('Play video','播放视频')}"><span class="play-circle" aria-hidden="true">▶</span></button>
      </div><div class="clip-caption"><span class="clip-number">${String(gi + 1).padStart(2,'0')}.${String(i + 1).padStart(2,'0')}</span>${bilingual('h4', clip.title)}<span class="clip-duration">${Math.round(clip.duration)} s</span></div>
    </article>`).join('')}</div></section>`).join('');
  $$('.clip-card .video-frame').forEach(register);
  $$('.clip-rail').forEach(registerRail);
}

export function translateMedia() {
  $$('video[data-label-en]').forEach(video => video.setAttribute('aria-label', video.dataset[locale() === 'zh' ? 'labelZh' : 'labelEn']));
  $('#close-video').setAttribute('aria-label',t('Close video','关闭视频'));
  $$('[data-rail-step]').forEach(button=>button.setAttribute('aria-label',button.dataset.railStep==='-1'?t('Previous video','上一段视频'):t('Next video','下一段视频')));
  if (dialog.open && manifest) $('#full-video-title').textContent = manifest.groups.find(g => g.id === dialog.dataset.group).title[locale()];
}

export async function initializeMedia() {
  register($('.hero-video'));
  register($('.video-frame', dialog));
  document.addEventListener('visibilitychange', reconcile);
  document.addEventListener('fullscreenchange', reconcile);
  document.addEventListener('click', event => {
    const button = event.target.closest?.('[data-full-video]');
    if (!button || !manifest) return;
    const group = manifest.groups.find(g => g.id === button.dataset.fullVideo);
    const video = $('video', dialog), state = states.get(video);
    pauseAutomatically(video, state);
    state.finished = false; state.userPaused = false;
    video.src = videoUrl(group.fullVideo, group.fullVideoRevision); video.poster = videoUrl(group.fullPoster, group.fullPosterRevision);
    video.style.aspectRatio = group.fullWidth && group.fullHeight ? `${group.fullWidth} / ${group.fullHeight}` : '';
    video.dataset.loaded = 'true'; video.muted = true; video.load();
    dialog.dataset.group = group.id;
    $('#full-video-title').textContent = group.title[locale()];
    dialog.showModal(); state.visible = true; reconcile();
  });
  $('#close-video').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => {
    const video = $('video', dialog), state = states.get(video);
    state.visible = false; pauseAutomatically(video, state);
    video.removeAttribute('src'); video.load(); delete video.dataset.loaded;
    reconcile();
  });
  try {
    const response = await fetch('./data/video-clips.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    manifest = await response.json(); render(); translateMedia();
  } catch (error) {
    $('#video-load-error').hidden = false;
    console.error('Video clips:', error);
  }
}
