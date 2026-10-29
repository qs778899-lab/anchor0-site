import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { InkTrace } from './ink';
import type { RenderGeom, RenderFrame, VisualResources, MotionInfo } from './types';

/**
 * Original URDF visuals follow MuJoCo rigid-link poses in Z-up coordinates.
 * Geometry conventions follow the public MuJoCo API; this renderer is original
 * code. Three.js and its OrbitControls are distributed under the MIT license.
 */
export class S0Renderer {
  private readonly scene = new THREE.Scene();
  private readonly perspective = new THREE.PerspectiveCamera(42, 1, 0.02, 120);
  private readonly orthographic = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.02, 120);
  private camera: THREE.PerspectiveCamera | THREE.OrthographicCamera = this.perspective;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly controls: OrbitControls;
  private readonly geometryGroup = new THREE.Group();
  private readonly objects = new Map<number, THREE.Mesh>();
  private readonly visualObjects: { mesh: THREE.Mesh; bodyId: number; local: THREE.Matrix4 }[] = [];
  private readonly bodyMatrix = new THREE.Matrix4();
  private readonly bodyPosition = new THREE.Vector3();
  private readonly bodyQuaternion = new THREE.Quaternion();
  private readonly unitScale = new THREE.Vector3(1, 1, 1);
  private readonly root = new THREE.Vector3(0, 0, 0.8);
  private readonly previousRoot = new THREE.Vector3(0, 0, 0.8);
  private readonly delta = new THREE.Vector3();
  private readonly observer: ResizeObserver;
  private grid!: THREE.GridHelper;
  private animationId = 0;
  private hasFrame = false;
  private disposed = false;
  private letterMode = false;
  private wordMode = false;
  private overviewMode = false;
  private completedRun = -1;
  private wordSpan = 0;
  private readonly followRoot = new THREE.Vector3();
  private inkCapacity = 0;
  private uploadedInk = 0;
  private motionId = '';
  private readonly ink = new InkTrace();
  private readonly inkMaterial = new LineMaterial({ color: 0x55bcff, linewidth: 4, depthTest: true });
  private readonly inkLine = new LineSegments2(new LineSegmentsGeometry(), this.inkMaterial);

  constructor(private readonly container: HTMLElement) {
    this.scene.background = new THREE.Color('#101a23');
    this.scene.fog = new THREE.Fog('#101a23', 25, 75);
    this.camera.up.set(0, 0, 1);
    this.orthographic.up.set(0, 0, 1);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.35;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.setAttribute('aria-label', 'S0 机器人三维仿真视图，可拖动旋转和滚轮缩放');
    this.renderer.domElement.setAttribute('role', 'img');
    this.container.append(this.renderer.domElement);

    const ambient = new THREE.HemisphereLight('#e6f3ff', '#596460', 2.2);
    ambient.position.set(0, 0, 10);
    this.scene.add(ambient);
    const key = new THREE.DirectionalLight('#fff8e8', 3.3);
    key.position.set(4, -5, 9);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -8;
    key.shadow.camera.right = 8;
    key.shadow.camera.top = 8;
    key.shadow.camera.bottom = -8;
    key.shadow.camera.near = 0.1;
    key.shadow.camera.far = 25;
    key.shadow.normalBias = 0.015;
    this.scene.add(key);
    const fill = new THREE.DirectionalLight('#93c5df', 1.1);
    fill.position.set(-4, 3, 5);
    this.scene.add(fill);

    const grid = new THREE.GridHelper(80, 80, '#405658', '#283c43');
    this.grid = grid;
    grid.rotation.x = Math.PI / 2;
    grid.position.z = 0.003;
    grid.material.transparent = true;
    grid.material.opacity = 0.52;
    this.inkLine.visible = false;
    this.inkLine.frustumCulled = false;
    this.scene.add(grid, this.geometryGroup, this.inkLine);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = !matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 0.7;
    this.controls.maxDistance = 18;
    this.controls.maxPolarAngle = Math.PI * 0.5;
    this.controls.minZoom = .5; this.controls.maxZoom = 5;
    this.controls.screenSpacePanning = true;
    this.resetCamera();
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(this.container);
    this.resize();
    this.render();
  }

  setGeometries(geoms: RenderGeom[]): void {
    this.clearGeometries();
    for (const geom of geoms) {
      if (geom.rgba[3] <= 0) continue;
      const geometry = this.buildGeometry(geom);
      if (!geometry) continue;
      const material = new THREE.MeshStandardMaterial({
        color: geom.type === 'plane' ? new THREE.Color('#26363e')
          : new THREE.Color(geom.rgba[0], geom.rgba[1], geom.rgba[2]),
        opacity: geom.rgba[3],
        transparent: geom.rgba[3] < 1,
        roughness: geom.type === 'plane' ? 1 : 0.66,
        metalness: geom.type === 'plane' ? 0 : 0.15,
        side: geom.type === 'mesh' ? THREE.DoubleSide : THREE.FrontSide,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.matrixAutoUpdate = false;
      mesh.castShadow = geom.type !== 'plane';
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      mesh.userData.ground = geom.type === 'plane';
      this.objects.set(geom.id, mesh);
      this.geometryGroup.add(mesh);
    }
    this.hasFrame = false;
  }

  setVisuals(resources: VisualResources): void {
    this.clearVisuals();
    const loader = new STLLoader();
    const geometryByUrl = new Map(resources.meshes.map(({ url, bytes }) => [url, loader.parse(bytes)]));
    for (const visual of resources.components) {
      const geometry = geometryByUrl.get(visual.meshUrl);
      if (!geometry?.getAttribute('position').count) throw new Error(`视觉资源损坏：${visual.meshUrl}`);
      // Match the forearm finish without changing source assets or physics.
      const isWrist = /^(left|right)_wrist_(roll|pitch|yaw)_link$/.test(visual.sourceBodyName ?? visual.bodyName);
      const material = new THREE.MeshStandardMaterial({
        color: isWrist ? new THREE.Color(0.7, 0.7, 0.7)
          : new THREE.Color(...visual.rgba.slice(0, 3) as [number, number, number]),
        opacity: visual.rgba[3], transparent: visual.rgba[3] < 1,
        roughness: .66, metalness: .15,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = visual.name;
      mesh.matrixAutoUpdate = false;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      const [w, x, y, z] = visual.quaternion;
      const local = new THREE.Matrix4().compose(new THREE.Vector3(...visual.position),
        new THREE.Quaternion(x, y, z, w), new THREE.Vector3(...visual.scale));
      this.visualObjects.push({ mesh, bodyId: visual.bodyId, local });
      this.geometryGroup.add(mesh);
    }
  }

  setLanguage(label: string): void { this.renderer.domElement.setAttribute('aria-label', label); }

  capturePng(): Promise<Blob> {
    if (this.disposed || !this.hasFrame || this.renderer.getContext().isContextLost()) throw new Error('View unavailable');
    // Copy immediately after rendering: preserveDrawingBuffer can remain off.
    this.renderer.render(this.scene, this.camera);
    const canvas = document.createElement('canvas');
    canvas.width = this.renderer.domElement.width;
    canvas.height = this.renderer.domElement.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Snapshot unavailable');
    context.drawImage(this.renderer.domElement, 0, 0);
    return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG export failed')), 'image/png'));
  }

  setTheme(dark: boolean): void {
    const background = dark ? '#111418' : '#ffffff';
    this.scene.background = new THREE.Color(background);
    if (this.scene.fog instanceof THREE.Fog) this.scene.fog.color.set(background);
    const ground = dark ? '#1b2027' : '#f5f7fa';
    for (const mesh of this.objects.values()) if (mesh.userData.ground) {
      const material = mesh.material as THREE.MeshStandardMaterial;
      material.color.set(ground);
    }
    const grid = this.grid.material as THREE.LineBasicMaterial;
    grid.color.set(dark ? '#687585' : '#bdc8d5'); grid.opacity = dark ? .3 : .24;
    this.inkMaterial.color.set(dark ? '#80b4f8' : '#1769d2');
    this.renderer.domElement.dataset.theme = dark ? 'dark' : 'light';
  }

  visualSnapshot() {
    return this.visualObjects.map(({ mesh, bodyId }) => ({ name: mesh.name, bodyId,
      vertices: mesh.geometry.getAttribute('position').count, matrix: mesh.matrix.toArray(),
      color: (mesh.material as THREE.MeshStandardMaterial).color.toArray() }));
  }

  setMotion(motion: MotionInfo): void {
    if (this.motionId === motion.id) return;
    this.motionId = motion.id;
    this.wordMode = motion.kind === 'word';
    this.letterMode = motion.kind === 'letter' || this.wordMode;
    this.wordSpan = motion.sequence?.span ?? 0;
    this.overviewMode = false; this.completedRun = -1;
    this.controls.minZoom = this.wordMode ? .00001 : .5;
    this.camera = this.letterMode ? this.orthographic : this.perspective;
    this.controls.object = this.camera;
    this.clearInk();
    this.allocateInk(motion.sequence?.inkCapacity ?? motion.numFrames);
    this.resize(); this.resetCamera();
  }

  private allocateInk(capacity: number): void {
    this.inkCapacity = Math.max(1, capacity);
    this.inkLine.geometry.dispose();
    this.inkLine.geometry = new LineSegmentsGeometry();
    this.inkLine.geometry.setPositions(new Float32Array(this.inkCapacity * 6));
    (this.inkLine.geometry.getAttribute('instanceStart') as THREE.InterleavedBufferAttribute).data.setUsage(THREE.DynamicDrawUsage);
    this.inkLine.geometry.instanceCount = 0; this.uploadedInk = 0;
  }
  clearInk(): void {
    this.ink.clear(); this.inkLine.visible = false; this.uploadedInk = 0;
    this.inkLine.geometry.instanceCount = 0; this.completedRun = -1;
  }
  inkSnapshot() { return { motion: this.motionId, segments: [...this.ink.segments], orthographic: this.letterMode,
    cameraPosition: this.camera.position.toArray(), cameraTarget: this.controls.target.toArray(),
    overview: this.overviewMode, inkCapacity: this.inkCapacity }; }

  setFrame(frame: RenderFrame): void {
    if (this.ink.append(frame)) {
      const count = this.ink.segments.length;
      if (count / 6 > this.inkCapacity) this.allocateInk(Math.max(count / 6, this.inkCapacity * 2));
      if (count < this.uploadedInk) this.uploadedInk = 0;
      if (count > this.uploadedInk) {
        const buffer = (this.inkLine.geometry.getAttribute('instanceStart') as THREE.InterleavedBufferAttribute).data;
        buffer.array.set(this.ink.segments.slice(this.uploadedInk), this.uploadedInk);
        buffer.addUpdateRange(this.uploadedInk, count - this.uploadedInk); buffer.needsUpdate = true;
      }
      this.uploadedInk = count;
      this.inkLine.geometry.instanceCount = count / 6;
      this.inkLine.visible = this.letterMode && this.ink.segments.length > 0;
    }
    const positions = frame.geomXpos;
    const rotations = frame.geomXmat;
    for (const [id, mesh] of this.objects) {
      const p = id * 3;
      const r = id * 9;
      if (p + 2 >= positions.length || r + 8 >= rotations.length) continue;
      mesh.matrix.set(
        rotations[r], rotations[r + 1], rotations[r + 2], positions[p],
        rotations[r + 3], rotations[r + 4], rotations[r + 5], positions[p + 1],
        rotations[r + 6], rotations[r + 7], rotations[r + 8], positions[p + 2],
        0, 0, 0, 1,
      );
      mesh.matrixWorldNeedsUpdate = true;
    }
    for (const { mesh, bodyId, local } of this.visualObjects) {
      const p = bodyId * 3, q = bodyId * 4;
      this.bodyPosition.fromArray(frame.bodyXpos, p);
      this.bodyQuaternion.set(frame.bodyXquat[q + 1], frame.bodyXquat[q + 2], frame.bodyXquat[q + 3], frame.bodyXquat[q]);
      this.bodyMatrix.compose(this.bodyPosition, this.bodyQuaternion, this.unitScale);
      mesh.matrix.multiplyMatrices(this.bodyMatrix, local);
      mesh.matrixWorldNeedsUpdate = true;
    }
    this.root.set(...frame.rootPosition);
    if (!this.hasFrame) {
      this.resetCamera();
      this.hasFrame = true;
    } else if (this.wordMode && !this.overviewMode) {
      this.delta.subVectors(this.root, this.followRoot); this.delta.z = 0; this.delta.multiplyScalar(.18);
      this.camera.position.add(this.delta); this.controls.target.add(this.delta); this.followRoot.add(this.delta);
    } else if (!this.letterMode) {
      // Keep the user's orbit and zoom while following horizontal translation.
      this.delta.subVectors(this.root, this.previousRoot);
      this.delta.z = 0;
      if (this.delta.lengthSq() < 4) {
        this.camera.position.add(this.delta);
        this.controls.target.add(this.delta);
      }
    }
    this.previousRoot.copy(this.root);
    if (this.wordMode && frame.completed && this.completedRun !== frame.runId) {
      this.completedRun = frame.runId; this.showOverview();
    }
  }

  resetCamera(): void {
    this.overviewMode = false;
    this.followRoot.copy(this.root);
    // Consume pending orbit/pan damping before setting an exact new view.
    const damping = this.controls.enableDamping;
    this.controls.enableDamping = false;
    this.controls.update();
    this.controls.enableDamping = damping;
    // +X looks towards the robot's front; screen right is robot-left (+Y).
    if (this.letterMode) {
      const y = this.wordMode ? this.root.y - .08 : -.08;
      this.controls.target.set(0, y, .85);
      this.camera.position.set(4, y, .85);
      this.camera.zoom = 1;
      this.camera.updateProjectionMatrix();
      this.controls.update();
      return;
    }
    const targetZ = Math.min(1.15, Math.max(0.55, this.root.z));
    this.controls.target.set(this.root.x, this.root.y, targetZ);
    this.camera.position.set(this.root.x + 2.1, this.root.y - 2.8, targetZ + 1.3);
    this.controls.update();
  }

  showOverview(): void {
    if (!this.wordMode) return;
    this.resetCamera(); this.overviewMode = true;
    let low = -.6, high = this.wordSpan + .5;
    for (let i = 1; i < this.ink.segments.length; i += 3) {
      low = Math.min(low, this.ink.segments[i] - .15); high = Math.max(high, this.ink.segments[i] + .15);
    }
    const center = (low + high) / 2;
    this.controls.target.set(0, center, .85); this.camera.position.set(4, center, .85);
    this.camera.zoom = Math.min(1, (this.orthographic.right - this.orthographic.left) / ((high - low) * 1.1));
    this.camera.updateProjectionMatrix(); this.controls.update();
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.animationId);
    this.observer.disconnect();
    this.controls.dispose();
    this.clearGeometries();
    this.clearVisuals();
    this.inkLine.geometry.dispose();
    this.inkMaterial.dispose();
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) material.dispose();
      }
    });
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private buildGeometry(geom: RenderGeom): THREE.BufferGeometry | null {
    const [x, y, z] = geom.size;
    switch (geom.type) {
      case 'plane': return new THREE.PlaneGeometry(x > 0 ? x * 2 : 80, y > 0 ? y * 2 : 80);
      case 'sphere': return new THREE.SphereGeometry(x, 24, 16);
      case 'ellipsoid': return new THREE.SphereGeometry(1, 24, 16).scale(x, y, z);
      case 'box': return new THREE.BoxGeometry(x * 2, y * 2, z * 2);
      case 'cylinder': return new THREE.CylinderGeometry(x, x, y * 2, 24).rotateX(Math.PI / 2);
      case 'capsule': return new THREE.CapsuleGeometry(x, y * 2, 8, 16).rotateX(Math.PI / 2);
      case 'mesh': {
        if (!geom.mesh?.vertices.length || !geom.mesh.indices.length) return null;
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(geom.mesh.vertices, 3));
        geometry.setIndex(new THREE.BufferAttribute(geom.mesh.indices, 1));
        if (geom.mesh.normals && geom.mesh.normals.length === geom.mesh.vertices.length) {
          geometry.setAttribute('normal', new THREE.BufferAttribute(geom.mesh.normals, 3));
        } else {
          geometry.computeVertexNormals();
        }
        return geometry;
      }
      default: return null;
    }
  }

  private clearGeometries(): void {
    for (const mesh of this.objects.values()) {
      mesh.geometry.dispose();
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of materials) material.dispose();
      this.geometryGroup.remove(mesh);
    }
    this.objects.clear();
  }

  private clearVisuals(): void {
    const geometries = new Set<THREE.BufferGeometry>();
    for (const { mesh } of this.visualObjects) {
      geometries.add(mesh.geometry);
      (mesh.material as THREE.Material).dispose();
      this.geometryGroup.remove(mesh);
    }
    for (const geometry of geometries) geometry.dispose();
    this.visualObjects.length = 0;
  }

  private resize(): void {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.perspective.aspect = width / height;
    this.perspective.updateProjectionMatrix();
    const halfHeight = Math.max(.95, .8 / (width / height));
    this.orthographic.top = halfHeight; this.orthographic.bottom = -halfHeight;
    this.orthographic.left = -halfHeight * width / height; this.orthographic.right = halfHeight * width / height;
    this.orthographic.updateProjectionMatrix();
    this.inkMaterial.resolution.set(width, height);
    this.renderer.setSize(width, height);
  }

  private render = (): void => {
    if (this.disposed) return;
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.animationId = requestAnimationFrame(this.render);
  };
}
