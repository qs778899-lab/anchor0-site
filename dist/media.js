const $ = (selector, root=document) => root.querySelector(selector);
const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];
const locale = () => document.documentElement.lang.startsWith('zh') ? 'zh' : 'en';
const t = (en, zh) => locale() === 'zh' ? zh : en;
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const bilingual = (tag, title) => `<${tag} data-en="${esc(title.en)}" data-zh="${esc(title.zh)}">${esc(title[locale()])}</${tag}>`;
const states = new Map();
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
  preloadObserver.observe(video);
}

function render() {
  $('#video-groups').innerHTML = manifest.groups.map((group, gi) => `<section class="video-group" aria-labelledby="${group.id}-title">
    <div class="video-group-heading"><div><h3 id="${group.id}-title">${bilingual('span', group.title)}</h3>${bilingual('p', group.description)}</div><button type="button" class="full-video-link" data-full-video="${group.id}" data-en="Watch full video ↗" data-zh="查看完整视频 ↗">${t('Watch full video ↗','查看完整视频 ↗')}</button></div>
    <div class="clip-grid">${group.clips.map((clip, i) => `<article class="clip-card">
      <div class="video-frame" data-video="${clip.id}" style="--video-ratio:${clip.width} / ${clip.height}">
        <video preload="none" muted playsinline controls loop poster="./${clip.poster}" aria-label="${esc(clip.title[locale()])}" data-label-en="${esc(clip.title.en)}" data-label-zh="${esc(clip.title.zh)}"><source data-src="./${clip.output}" type="video/mp4"></video>
        <button class="video-cover" type="button" aria-label="${t('Play video','播放视频')}"><span class="play-circle" aria-hidden="true">▶</span></button>
      </div><div class="clip-caption"><span class="clip-number">${String(gi + 1).padStart(2,'0')}.${String(i + 1).padStart(2,'0')}</span>${bilingual('h4', clip.title)}<span class="clip-duration">${Math.round(clip.duration)} s</span></div>
    </article>`).join('')}</div></section>`).join('');
  $$('.clip-card .video-frame').forEach(register);
}

export function translateMedia() {
  $$('video[data-label-en]').forEach(video => video.setAttribute('aria-label', video.dataset[locale() === 'zh' ? 'labelZh' : 'labelEn']));
  $('#close-video').setAttribute('aria-label',t('Close video','关闭视频'));
  if (dialog.open && manifest) $('#full-video-title').textContent = manifest.groups.find(g => g.id === dialog.dataset.group).title[locale()];
}

export async function initializeMedia() {
  register($('.hero-video'));
  register($('.video-frame', dialog));
  document.addEventListener('visibilitychange', reconcile);
  document.addEventListener('fullscreenchange', reconcile);
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-full-video]');
    if (!button || !manifest) return;
    const group = manifest.groups.find(g => g.id === button.dataset.fullVideo);
    const video = $('video', dialog), state = states.get(video);
    pauseAutomatically(video, state);
    state.finished = false; state.userPaused = false;
    video.src = `./${group.fullVideo}`; video.poster = `./${group.fullPoster}`;
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
