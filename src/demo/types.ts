export type Direction = 'forward' | 'back' | 'left' | 'right';
export interface PushApplied {
  type: 'push-applied'; direction: Direction; forceN: number;
  vector: [number, number, number]; bodyId: number;
  startTime: number; endTime: number; runId: number; epoch: number;
}
export interface MotionInfo {
  id: string; label: string; taskName: string; category: string;
  sourceFilename: string; recordId: string; datasetId: string;
  sourceRelativePath?: string;
  retarget?: { commit: string; configVersion: string; retargetVersion: string;
    pairedFps: number; pairedFrames: number };
  sourceFps: number; sourceFrames: number; numFrames: number; fps: number;
  kind?: 'letter' | 'shape' | 'preset' | 'word'; letter?: string;
  sequence?: { text: string; letters: number; transfers: number; inkCapacity: number; span: number };
  referenceSource?: string; referenceFrame?: string;
  handwriting?: { targetStrokes: number[][][]; planeX: number };
}
export interface HandwritingData {
  penDown: boolean[]; strokeId: number[]; phase: string[];
  targetStrokes: number[][][]; planeX: number;
}
export interface SequenceProgress {
  text: string; letter: string; letterIndex: number; totalLetters: number;
  kind: 'letter' | 'lateral'; transfer: number; transfers: number;
}
export interface VisualComponent {
  name: string; bodyName: string; bodyId: number; meshUrl: string;
  /** Original visual link; bodyName identifies the unchanged physics anchor. */
  sourceBodyName?: string;
  position: [number, number, number]; quaternion: [number, number, number, number];
  scale: [number, number, number]; rgba: [number, number, number, number]; materialName: string;
}
export interface VisualResources {
  components: VisualComponent[];
  meshes: { url: string; bytes: ArrayBuffer }[];
}
export interface RenderGeom {
  id: number;
  type: 'plane' | 'sphere' | 'capsule' | 'ellipsoid' | 'cylinder' | 'box' | 'mesh';
  size: [number, number, number];
  rgba: [number, number, number, number];
  mesh?: { vertices: Float32Array; indices: Uint32Array; normals?: Float32Array };
}
export interface RenderFrame {
  type: 'frame';
  runId: number; epoch: number;
  actualWrist: Float32Array;
  handwriting?: { penDown: boolean; strokeId: number; phase: string };
  sequence?: SequenceProgress;
  geomXpos: Float32Array;
  geomXmat: Float32Array;
  bodyXpos: Float32Array;
  bodyXquat: Float32Array;
  rootPosition: [number, number, number];
  referencePoints: Float32Array;
  simTime: number;
  realTimeFactor: number;
  inferenceMs: number;
  playing: boolean;
  motion: string;
  frame: number;
  totalFrames: number;
  completed: boolean;
}
export type WorkerCommand =
  | { type: 'init'; baseUrl: string; motion?: string; word?: string; epoch?: number; sourceId?: string }
  | { type: 'prefetch' }
  | { type: 'download-source'; sourceId?: string }
  | { type: 'play' | 'pause' | 'reset'; epoch?: number }
  | { type: 'motion'; motion: string; epoch?: number }
  | { type: 'word'; text: string; epoch?: number; play?: boolean }
  | { type: 'push'; direction: Direction; force: number; duration: number; runId: number; epoch: number }
  | { type: 'validate'; requestId: string; goldenUrl: string; debugTick?: number }
  | { type: 'rollout'; requestId: string; motion: string; text?: string; perturb?: boolean; captureInputsAt?: number[] };
export type WorkerEvent =
  | PushApplied
  | { type: 'progress'; progress: number; message: string }
  | { type: 'download-source'; id: string; label: string; available: number }
  | { type: 'persistent-cache'; complete: boolean; errors: number; skipped: number }
  | { type: 'ready'; geoms: RenderGeom[]; visuals: VisualResources; bodyNames: string[];
      motions: MotionInfo[]; motion: string; loadMs: number;
      loading?: { model: unknown; assets: unknown;
        resourcesMs: number; sessionMs: number; initialMotionIds: string[] } }
  | RenderFrame
  | { type: 'motion-info'; info: MotionInfo }
  | { type: 'selection'; epoch: number; state: 'loading' | 'error'; message: string }
  | { type: 'cache'; loaded: number; total: number; complete: boolean; pending: boolean; errors: string[] }
  | { type: 'sequence'; info: MotionInfo; epoch: number }
  | { type: 'error'; message: string }
  | { type: 'validation'; requestId: string; result: unknown };
