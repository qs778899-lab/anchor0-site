import type { RenderFrame } from './types.ts';

/** Ink joins consecutive physical samples within a single pen-down stroke. */
export class InkTrace {
  readonly segments: number[] = [];
  private runId = -1;
  private previous?: { frame: number; stroke: number; point: number[] };
  private lastFrame = -1;

  clear(): void {
    this.segments.length = 0;
    this.runId = -1;
    this.previous = undefined;
    this.lastFrame = -1;
  }

  append(frame: Pick<RenderFrame, 'runId' | 'frame' | 'handwriting' | 'actualWrist'>): boolean {
    let changed = false;
    if (frame.runId !== this.runId) {
      this.clear(); this.runId = frame.runId; changed = true;
    }
    if (frame.frame <= this.lastFrame) return changed;
    this.lastFrame = frame.frame;
    const pen = frame.handwriting;
    if (!pen?.penDown) { this.previous = undefined; return changed; }
    const point = Array.from(frame.actualWrist);
    if (point.length !== 3 || !point.every(Number.isFinite)) { this.previous = undefined; return changed; }
    if (this.previous && this.previous.frame + 1 === frame.frame && this.previous.stroke === pen.strokeId) {
      this.segments.push(...this.previous.point, ...point);
      changed = true;
    }
    this.previous = { frame: frame.frame, stroke: pen.strokeId, point };
    return changed;
  }
}
