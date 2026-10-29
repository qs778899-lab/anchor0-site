// Pure replay timing and ink indexing. No simulation or inference.
export function duration(clip) {
  return clip.duration / clip.playbackRate + clip.overviewSeconds + clip.holdSeconds + clip.fadeSeconds;
}
export function sampleTime(elapsed, clip) {
  const total = duration(clip), remainder = elapsed % total;
  const time = remainder < 0 ? remainder + total : remainder;
  const writing = clip.duration / clip.playbackRate;
  const overview = clip.overviewSeconds > 0
    ? Math.max(0, Math.min(1, (time - writing) / clip.overviewSeconds))
    : Number(time >= writing);
  const fade = Math.max(0, Math.min(1, (time - writing - clip.overviewSeconds - clip.holdSeconds) / clip.fadeSeconds));
  return {sourceTime: Math.min(clip.duration, time * clip.playbackRate), overview: overview * overview * (3 - 2 * overview), opacity: 1 - fade};
}
export function inkSegments(ink) {
  const points = [], frames = [];
  for (let f = 1; f < ink.frames; f++) {
    if (!ink.penDown[f] || !ink.penDown[f - 1] || ink.strokeId[f] < 0 || ink.strokeId[f] !== ink.strokeId[f - 1]) continue;
    points.push(...ink.actualWrist.slice((f - 1) * 3, (f + 1) * 3)); frames.push(f);
  }
  return {points, frames};
}
export function visibleSegments(frames, frame) {
  let low = 0, high = frames.length;
  while (low < high) { const mid = (low + high) >>> 1; if (frames[mid] <= frame) low = mid + 1; else high = mid; }
  return low;
}
