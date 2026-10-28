import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';

// S0 Motion Lab viewer adapted for scoped assets, responsive framing, and retry cleanup.

export async function createViewer(container, spec) {
  const response = await fetch(new URL('./assets/robot.bin', import.meta.url));
  if (!response.ok) throw new Error(`Robot: ${response.status}`);
  const buffer = await response.arrayBuffer();
  if (buffer.byteLength !== spec.bytes) throw new Error('Incomplete robot geometry');
  // Retry without multisampling when context allocation rejects it.
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); }
  catch { renderer = new THREE.WebGLRenderer({ antialias: false }); }
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);
  const camera = new THREE.PerspectiveCamera(38, 1, .01, 100);
  camera.up.set(0, 0, 1);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  container.appendChild(renderer.domElement);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.minDistance = 1.7;
  controls.maxDistance = 5.5;
  controls.minPolarAngle = .2;
  controls.maxPolarAngle = Math.PI / 2 - .02;
  const fill = new THREE.HemisphereLight(0xffffff, 0xc6cbd3, 1.3);
  fill.position.set(0, 0, 4);
  scene.add(fill);
  const key = new THREE.DirectionalLight(0xffffff, 1.8);
  key.position.set(2, -3, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, .65);
  rim.position.set(-2, 2, 3);
  scene.add(rim);
  const bodies = Array.from({ length: spec.bodies }, () => new THREE.Group());
  bodies.forEach(body => scene.add(body));
  const meshes = spec.meshes.map(item => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(buffer, item.offset, item.vertices * 3), 3));
    geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(buffer, item.offset + item.vertices * 12, item.faces * 3), 1));
    geometry.computeVertexNormals();
    return geometry;
  });
  const materials = new Map();
  for (const geom of spec.geoms) {
    const materialKey = JSON.stringify([geom.color, geom.specular, geom.shininess]);
    if (!materials.has(materialKey)) materials.set(materialKey, new THREE.MeshPhongMaterial({
      color: new THREE.Color().fromArray(geom.color),
      specular: new THREE.Color().setRGB(geom.specular, geom.specular, geom.specular),
      shininess: geom.shininess * 128,
    }));
    const mesh = new THREE.Mesh(meshes[geom.mesh], materials.get(materialKey));
    mesh.position.fromArray(geom.position);
    mesh.quaternion.fromArray(geom.quaternion);
    bodies[geom.body].add(mesh);
  }
  let clip, poses, active = true;
  const cache = new Map();
  const p = new THREE.Vector3(), q = new THREE.Quaternion();
  const render = () => { if (active && !container.hidden && !document.hidden) renderer.render(scene, camera); };
  controls.addEventListener('change', render);
  function reset() {
    camera.position.set(-2.2, 1.55, 1.2);
    controls.target.set(0, 0, .73);
    controls.update();
    render();
  }
  function resize() {
    if (!container.clientWidth || !container.clientHeight) return;
    camera.aspect = container.clientWidth / container.clientHeight;
    // Keep the full dance in frame on narrow screens without changing orbit/zoom.
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(
      Math.tan(THREE.MathUtils.degToRad(38) / 2) * Math.max(1, .85 / camera.aspect)
    ));
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
    render();
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  const onKeyDown = event => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const offset = camera.position.clone().sub(controls.target);
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') offset.applyAxisAngle(new THREE.Vector3(0, 0, 1), event.key === 'ArrowLeft' ? .12 : -.12);
    else offset.multiplyScalar(event.key === 'ArrowUp' ? .93 : 1.07).clampLength(controls.minDistance, controls.maxDistance);
    camera.position.copy(controls.target).add(offset);
    controls.update();
  };
  container.addEventListener('keydown', onKeyDown);
  const onContextLost = event => {
    event.preventDefault();
    container.dispatchEvent(new CustomEvent('rendererror', { detail: new Error('WebGL context lost') }));
  };
  renderer.domElement.addEventListener('webglcontextlost', onContextLost);
  reset();
  resize();
  return {
    reset, resize,
    setActive(value) { active = value; },
    dispose() {
      active = false;
      resizeObserver.disconnect();
      container.removeEventListener('keydown', onKeyDown);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      controls.removeEventListener('change', render);
      controls.dispose();
      meshes.forEach(geometry => geometry.dispose());
      materials.forEach(material => material.dispose());
      renderer.dispose();
      renderer.domElement.remove();
      cache.clear();
    },
    async loadClip(next) {
      if (!cache.has(next.id)) {
        const response = await fetch(new URL(`./assets/${next.id}.bin`, import.meta.url));
        if (!response.ok) throw new Error(`Motion: ${response.status}`);
        const data = await response.arrayBuffer();
        if (data.byteLength !== next.frames * spec.bodies * 7 * 4) throw new Error('Incomplete trajectory');
        cache.set(next.id, new Float32Array(data));
      }
      return cache.get(next.id);
    },
    setClip(next, data) { clip = next; poses = data; },
    draw(seconds) {
      if (!poses) return;
      const frame = Math.min(Math.max(seconds * clip.fps, 0), clip.frames - 1);
      const a = Math.floor(frame), b = Math.min(a + 1, clip.frames - 1), alpha = frame - a;
      for (let i = 0; i < bodies.length; i++) {
        const x = (a * spec.bodies + i) * 7, y = (b * spec.bodies + i) * 7;
        bodies[i].position.fromArray(poses, x).lerp(p.fromArray(poses, y), alpha);
        bodies[i].quaternion.fromArray(poses, x + 3).slerp(q.fromArray(poses, y + 3), alpha);
      }
      render();
    }
  };
}
