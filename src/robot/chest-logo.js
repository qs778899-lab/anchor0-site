import * as THREE from 'three';
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js';

// Sample only the ARCHON letters from the original transparent brand asset.
// Pixel crop [494, 161, 1569, 158] excludes the triangle without redrawing letters.
// Torso coordinates: +X front, +Y screen right from the front, +Z up.
export function createChestLogo(torsoGeometry, texture) {
  const surface = new THREE.Mesh(torsoGeometry);
  const orientation = new THREE.Euler().setFromRotationMatrix(new THREE.Matrix4().makeBasis(
    new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0),
  ));
  const geometry = new DecalGeometry(surface, new THREE.Vector3(.08, 0, .22), orientation,
    new THREE.Vector3(.112, .112 * 158 / 1569, .045));
  texture.offset.set(494 / 2133, (480 - 161 - 158) / 480);
  texture.repeat.set(1569 / 2133, 158 / 480);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshStandardMaterial({
    map: texture, color: 0xffffff, roughness: 1, metalness: 0,
    transparent: true, alphaTest: .02, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  const decal = new THREE.Mesh(geometry, material);
  decal.name = 'archon-chest-logo';
  decal.receiveShadow = true;
  return decal;
}
