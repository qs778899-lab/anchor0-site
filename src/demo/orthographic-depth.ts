import type { Box3, OrthographicCamera } from 'three';

/** Keep an orthographic view's XY projection while bringing its bounds in front
 * of a positive near plane. OrbitControls keeps its original camera and target.
 * Return the depth offset so distance fog can retain its original appearance. */
export function fitOrthographicDepth(source: OrthographicCamera, output: OrthographicCamera, bounds: Box3): number {
  source.updateMatrixWorld(true);
  output.copy(source, false);
  const view = source.matrixWorldInverse.elements;
  let nearest = Infinity, farthest = -Infinity;
  for (const x of [bounds.min.x, bounds.max.x]) {
    for (const y of [bounds.min.y, bounds.max.y]) {
      for (const z of [bounds.min.z, bounds.max.z]) {
        const depth = -(view[2] * x + view[6] * y + view[10] * z + view[14]);
        nearest = Math.min(nearest, depth);
        farthest = Math.max(farthest, depth);
      }
    }
  }
  const padding = .1;
  const offset = Math.max(0, source.near + padding - nearest);
  output.translateZ(offset);
  output.far = Math.max(source.far + offset, farthest + offset + padding);
  output.updateProjectionMatrix();
  output.updateMatrixWorld(true);
  return offset;
}
