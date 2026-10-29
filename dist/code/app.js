// Static replay player. The only clock is presentation time.
import { duration } from './replay.js';
const container = document.getElementById('viewer');
const loadState = document.getElementById('load-state');
const status = document.getElementById('status');
const retry = document.getElementById('retry');
const playbackStatus = document.getElementById('playback-status');
const pauseButton = document.getElementById('pause');
const resetButton = document.getElementById('reset-view');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let viewer, clip, ready = false, loading = false, failed = false, inView = true;
let playing = !reduced.matches, time = 0, lastTick = null, animationFrame = null;
let inspectionSlider;

function language() {
  try { return localStorage.getItem('anchor-language') === 'zh' ? 'zh' : 'en'; }
  catch { return 'en'; }
}
const t = (en, zh) => language() === 'zh' ? zh : en;
const active = () => !document.hidden && inView;

function updateMessages() {
  document.documentElement.lang = language() === 'zh' ? 'zh-CN' : 'en';
  container.setAttribute('aria-label', t(
    'Robot writing COMING SOON at 8× speed in a full-phrase view. Drag to rotate, scroll or pinch to zoom, and press Space to pause or play. Arrow keys rotate and zoom. Home resets the view.',
    '机器人以八倍速书写 COMING SOON，默认展示全景。拖动旋转，滚轮或双指缩放，空格暂停或播放；方向键可旋转和缩放，Home 恢复视角。'
  ));
  container.setAttribute('aria-busy', String(loading));
  loadState.hidden = ready;
  status.textContent = failed
    ? t('The animation could not load. Please try again.', '动画暂时无法加载，请重试。')
    : loading ? t('Loading animation…', '正在加载动画…') : '';
  pauseButton.hidden = resetButton.hidden = !ready;
  pauseButton.textContent = playing ? 'Ⅱ' : '▶';
  pauseButton.setAttribute('aria-label', t(playing ? 'Pause replay' : 'Play replay', playing ? '暂停回放' : '播放回放'));
  pauseButton.title = pauseButton.getAttribute('aria-label');
  resetButton.title = t('Reset view · Home', '恢复视角 · Home');
  resetButton.setAttribute('aria-label', resetButton.title);
  retry.hidden = !failed;
  retry.textContent = t('Try again', '重试');
  playbackStatus.textContent = ready
    ? playing ? t('Animation playing.', '动画播放中。')
      : t('Animation paused. Press Space to play.', '动画已暂停，按空格播放。')
    : '';
}

function stopFrames() {
  if (animationFrame !== null) cancelAnimationFrame(animationFrame);
  animationFrame = null;
  lastTick = null;
}

function fail(cause) {
  ready = false;
  failed = true;
  loading = false;
  stopFrames();
  viewer?.dispose();
  viewer = undefined;
  updateMessages();
  console.error('Code coming soon:', cause);
}

function syncPlayback() {
  stopFrames();
  viewer?.setActive(ready && active());
  if (ready && active()) {
    try { viewer.draw(time); }
    catch (cause) { fail(cause); return; }
    if (playing) animationFrame = requestAnimationFrame(tick);
  }
  updateMessages();
}

async function initialize() {
  if (loading) return;
  const restoreFocus = document.activeElement === retry;
  loading = true;
  ready = failed = false;
  stopFrames();
  updateMessages();
  // Keep keyboard focus in the viewer while the retry button is hidden.
  if (restoreFocus) container.focus({ preventScroll: true });
  try {
    const response = await fetch(new URL('./assets/manifest.json', import.meta.url));
    if (!response.ok) throw new Error(`Manifest: ${response.status}`);
    const manifest = await response.json();
    clip = manifest.clips?.[0];
    if (!clip || clip.kind !== 'policy-rollout' || clip.bodies !== manifest.model?.bodies || !(clip.duration > 0) || !(clip.playbackRate > 0)) throw new Error('Invalid replay manifest');
    if (inspectionSlider) inspectionSlider.max = String(duration(clip) - .01);
    const module = await import('./viewer.js');
    viewer = await module.createViewer(container, manifest.model);
    const poses = await viewer.loadClip(clip);
    viewer.setClip(clip, poses);
    viewer.resize();
    time = 0;
    ready = true;
    loading = false;
    syncPlayback();
  } catch (cause) { fail(cause); }
}

pauseButton.addEventListener('click', () => { playing = !playing; syncPlayback(); });
resetButton.addEventListener('click', () => viewer?.reset());
retry.addEventListener('click', event => {
  event.stopPropagation();
  void initialize();
});
container.addEventListener('rendererror', event => fail(event.detail));
container.addEventListener('pointerdown', event => {
  if (event.target !== retry) container.focus({ preventScroll: true });
});
container.addEventListener('click', () => { if (failed) void initialize(); });
container.addEventListener('keydown', event => {
  if (event.target === retry) return;
  if (event.key === 'Enter' && failed) {
    event.preventDefault();
    void initialize();
  } else if (event.code === 'Space') {
    event.preventDefault();
    if (failed) return;
    playing = !playing;
    syncPlayback();
  }
});
document.addEventListener('visibilitychange', syncPlayback);
window.addEventListener('pagehide', () => { stopFrames(); viewer?.setActive(false); });
window.addEventListener('pageshow', syncPlayback);
window.addEventListener('storage', event => {
  if (event.key === 'anchor-language' || event.key === null) updateMessages();
});
new IntersectionObserver(entries => {
  inView = entries[0].isIntersecting;
  syncPlayback();
}, { threshold: .05 }).observe(container);
reduced.addEventListener('change', event => {
  if (event.matches) { playing = false; syncPlayback(); }
});

function tick(now) {
  animationFrame = null;
  if (!ready || !playing || !active()) { lastTick = null; return; }
  if (lastTick === null) lastTick = now;
  if (now - lastTick >= 1000 / 30) {
    // Visibility changes reset lastTick. While visible, retain elapsed time even
    // on a slow device; the ink renderer reveals all samples passed in between.
    time += (now - lastTick) / 1000;
    lastTick = now;
    try { viewer.draw(time); }
    catch (cause) { fail(cause); return; }
  }
  animationFrame = requestAnimationFrame(tick);
}

// A visible inspection control, available only in the explicit test URL.
if (new URLSearchParams(location.search).has('inspect')) {
  const label = document.createElement('label'); label.textContent = 'Replay time '; label.style.cssText = 'font:12px system-ui;position:fixed;bottom:10px;left:10px;background:white;padding:8px';
  const slider = document.createElement('input'); inspectionSlider = slider; slider.type = 'range'; slider.min = '0'; slider.max = '0'; slider.step = '.01'; slider.setAttribute('aria-label', 'Replay time');
  slider.addEventListener('input', () => { if (ready) { playing = false; time = Number(slider.value); syncPlayback(); } });
  label.append(slider); document.body.append(label);
}

await initialize();
