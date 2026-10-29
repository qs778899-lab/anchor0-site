import type {Direction,PushApplied} from './types';

export function parseForce(value: string): number | null {
  if (!value.trim()) return null;
  const force = Number(value);
  return Number.isFinite(force) && force >= 0 && force <= 60 ? force : null;
}

export function createPulse(direction: Direction, force: number, q: ArrayLike<number>, time: number) {
  const axes = {forward:[1,0],back:[-1,0],left:[0,1],right:[0,-1]};
  if (!Object.hasOwn(axes,direction) || !Number.isFinite(force) || force < 0 || force > 60) return null;
  const local = axes[direction];
  const yaw = Math.atan2(2*(q[0]*q[3]+q[1]*q[2]),1-2*(q[2]*q[2]+q[3]*q[3]));
  return {force:[force*(Math.cos(yaw)*local[0]-Math.sin(yaw)*local[1]),force*(Math.sin(yaw)*local[0]+Math.cos(yaw)*local[1]),0] as [number,number,number],until:time+.1};
}

export class ForceCue {
  event: PushApplied | null = null;
  private fade = 0;
  show(event: PushApplied) { this.event = event.forceN > 0 ? event : null; this.fade = 0; }
  clear() { this.event = null; this.fade = 0; }
  advance(simTime: number, dt: number, playing: boolean, hidden: boolean): number {
    if (!this.event) return 0;
    if (playing && !hidden && simTime >= this.event.endTime - 1e-8) this.fade += Math.max(0,dt);
    const opacity = Math.max(0,1-this.fade/.9);
    if (!opacity) this.clear();
    return opacity;
  }
}
