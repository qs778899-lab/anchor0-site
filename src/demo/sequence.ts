import type { HandwritingData, MotionInfo, SequenceProgress } from './types.ts';

export interface MotionResource {
  id: string; numFrames: number; positions: number[]; quaternions: number[];
  initial: { qpos: number[]; qvel: number[] };
  handwriting?: HandwritingData;
}
export interface Segment {
  start: number; end: number; offset: number; letterIndex: number;
  letter: string; source: MotionResource; repeats: number; strokeOffset: number;
  kind: 'letter' | 'lateral';
}
export const LATERAL_DISTANCE = .424;
export const LATERAL_ID = 'lateral-r2-052';
export const HEART = '♡';
export function glyphResourceId(glyph: string): string {
  return glyph === HEART ? 'shape-heart' : `letter-${glyph}`;
}
/** Canonicalize without trimming so draft cursor positions and spaces survive. */
export function normalizeDraft(input: string): string {
  return input.replace(/[♡♥❤][\uFE0E\uFE0F]?/g, HEART)
    .replace(/\u3000/g, ' ').replace(/[a-z]/g, c => c.toUpperCase());
}
export function previousCharacterStart(text: string, end: number): number {
  const units = [...text.slice(0, end).matchAll(/[♡♥❤][\uFE0E\uFE0F]?|[\s\S]/gu)];
  return units.at(-1)?.index ?? 0;
}
export function normalizeText(input: string): string {
  const text = normalizeDraft(input).replace(/^ +| +$/g, '');
  if (!text || !/[A-Z♡]/.test(text)) throw new Error('请输入至少一个英文字母或爱心。');
  if (/[^A-Z♡ ]/.test(text)) throw new Error('仅支持英文字母、爱心和空格，请移除其他字符。');
  if (text.replace(/ /g, '').length > 32) throw new Error('字母与爱心合计最多 32 个，空格不占名额。');
  return text;
}
export function textLayout(input: string) {
  const text = normalizeText(input);
  const letters = [...text.matchAll(/[A-Z♡]/g)].map(m => ({ letter: m[0], column: m.index }));
  return { text, letters, transfers: text.length - 1, spaces: text.length - letters.length };
}

/** The full 50 Hz timeline is indexed; a space never allocates another pose array. */
export class WordSequence {
  readonly id: string;
  readonly text: string;
  readonly numFrames: number;
  readonly initial: MotionResource['initial'];
  readonly segments: Segment[] = [];
  readonly info: MotionInfo;
  constructor(input: string, resources: ReadonlyMap<string, MotionResource>) {
    const layout = textLayout(input);
    this.text = layout.text; this.id = `word:${layout.text}`;
    const lateral = resources.get(LATERAL_ID);
    if (!lateral || lateral.numFrames !== 451) throw new Error('缺少完整的 r2-052 横移资源。');
    const first = resources.get(glyphResourceId(layout.letters[0].letter));
    if (!first) throw new Error('缺少书写资源。');
    this.initial = first.initial;
    let end = 0, strokeOffset = 0;
    const targetStrokes: number[][][] = [];
    for (let i = 0; i < layout.letters.length; i++) {
      const { letter, column } = layout.letters[i];
      const source = resources.get(glyphResourceId(letter));
      if (!source?.handwriting) throw new Error(`缺少字符 ${letter} 的书写资源。`);
      const offset = column * LATERAL_DISTANCE;
      this.segments.push({ start: end, end: end + source.numFrames - 1, offset, source,
        letterIndex: i, letter, kind: 'letter', repeats: 1, strokeOffset });
      end += source.numFrames - 1;
      targetStrokes.push(...source.handwriting.targetStrokes.map(s => s.map(p => [p[0], p[1] + offset, p[2]])));
      strokeOffset += Math.max(...source.handwriting.strokeId) + 1;
      if (i < layout.letters.length - 1) {
        const repeats = layout.letters[i + 1].column - column;
        this.segments.push({ start: end, end: end + (lateral.numFrames - 1) * repeats,
          offset, source: lateral, letterIndex: i, letter, kind: 'lateral', repeats, strokeOffset });
        end += (lateral.numFrames - 1) * repeats;
      }
    }
    if (!Number.isSafeInteger(end + 1)) throw new Error('输入内容过长。');
    this.numFrames = end + 1;
    // Check each seam in world space, allowing only quaternion sign equivalence.
    for (let i = 1; i < this.segments.length; i++) {
      const a = this.sampleSegment(this.segments[i - 1], this.segments[i - 1].end);
      const b = this.sampleSegment(this.segments[i], this.segments[i].start);
      if (a.positions.some((x, j) => Math.abs(x - b.positions[j]) > 2e-6)) throw new Error('参考位置接缝不一致。');
      for (let p = 0; p < 5; p++) {
        const dot = a.quaternions.slice(p * 4, p * 4 + 4).reduce((v, x, j) => v + x * b.quaternions[p * 4 + j], 0);
        if (Math.abs(Math.abs(dot) - 1) > 2e-6) throw new Error('参考朝向接缝不一致。');
      }
    }
    this.info = { id: this.id, label: this.text, taskName: 'Continuous handwriting', category: 'Handwriting',
      kind: 'word', sourceFilename: '冻结字库 / 爱心 + r2-052', recordId: this.text,
      datasetId: `handwriting_letters_v2${this.text.includes(HEART) ? ' + handwriting_shapes_v1/heart' : ''} + lateral_sparse_v1`,
      sourceFps: 50, sourceFrames: this.numFrames, numFrames: this.numFrames, fps: 50,
      referenceSource: 'g1_fk + sparse_refined', referenceFrame: 'global',
      handwriting: { targetStrokes, planeX: first.handwriting!.planeX },
      sequence: { text: this.text, letters: layout.letters.length, transfers: layout.transfers,
        inkCapacity: this.segments.filter(s => s.kind === 'letter').reduce((n, s) => n + s.source.handwriting!.penDown.filter(Boolean).length, 0),
        span: (layout.text.length - 1) * LATERAL_DISTANCE } };
  }
  private sampleSegment(s: Segment, frame: number) {
    const local = frame - s.start, width = s.source.numFrames - 1;
    const cycle = s.kind === 'lateral' ? Math.max(0, Math.ceil(local / width) - 1) : 0;
    const f = local - cycle * width;
    const positions = s.source.positions.slice(f * 15, f * 15 + 15);
    const shift = s.offset + cycle * LATERAL_DISTANCE;
    for (let p = 0; p < 5; p++) positions[p * 3 + 1] += shift;
    const pen = s.source.handwriting;
    return { positions, quaternions: s.source.quaternions.slice(f * 20, f * 20 + 20),
      handwriting: { penDown: s.kind === 'letter' && Boolean(pen?.penDown[f]),
        strokeId: s.kind === 'letter' && pen && pen.strokeId[f] >= 0 ? pen.strokeId[f] + s.strokeOffset : -1,
        phase: s.kind === 'letter' ? pen!.phase[f] : f > 300 ? 'hold' : 'lateral' },
      sequence: { text: this.text, letter: s.letter, letterIndex: s.letterIndex,
        totalLetters: this.segments.filter(v => v.kind === 'letter').length,
        kind: s.kind, transfer: cycle + 1, transfers: s.repeats } satisfies SequenceProgress };
  }
  sample(frame: number) {
    const f = Math.max(0, Math.min(this.numFrames - 1, frame));
    if (!Number.isInteger(f)) throw new Error('帧编号必须是整数。');
    return this.sampleSegment(this.segments.find(s => f <= s.end)!, f);
  }
  reference(frame: number) {
    const positions = new Float32Array(60), quaternions = new Float32Array(80);
    for (let k = 0; k < 4; k++) { const s = this.sample(frame + k); positions.set(s.positions, k * 15); quaternions.set(s.quaternions, k * 20); }
    return { positions, quaternions };
  }
}
