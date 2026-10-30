import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { LineSegments2 } from './vendor/lines/LineSegments2.js';
import { LineSegmentsGeometry } from './vendor/lines/LineSegmentsGeometry.js';
import { LineMaterial } from './vendor/lines/LineMaterial.js';
import { sampleTime, inkSegments, visibleSegments } from './replay.js';
import { createChestLogo } from './chest-logo.js';

async function binary(name) {
  const response = await fetch(new URL(`./assets/${name}`, import.meta.url));
  if (!response.ok) throw new Error(`Resource: ${response.status}`);
  if (!name.endsWith('.gz')) return response.arrayBuffer();
  return new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
}
export async function createViewer(container, spec) {
  const buffer = await binary(spec.url);
  if (buffer.byteLength !== spec.bytes) throw new Error('Incomplete robot geometry');
  const chestLogoTexture = await new THREE.TextureLoader().loadAsync(new URL('./assets/archon-chest-logo.png', import.meta.url).href);
  let renderer;
  try { renderer = new THREE.WebGLRenderer({antialias:true, powerPreference:'high-performance'}); }
  catch { renderer = new THREE.WebGLRenderer({antialias:false}); }
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0xffffff);
  const camera = new THREE.OrthographicCamera(-1,1,1,-1,.01,100); camera.up.set(0,0,1);
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5)); renderer.toneMapping = THREE.ACESFilmicToneMapping;
  container.appendChild(renderer.domElement);
  const controls = new OrbitControls(camera,renderer.domElement);
  controls.enablePan = false; controls.minZoom = .2; controls.maxZoom = 3.5;
  controls.minPolarAngle = .15; controls.maxPolarAngle = Math.PI - .15;
  const fill = new THREE.HemisphereLight(0xffffff,0xc6cbd3,1.3); fill.position.set(0,0,4); scene.add(fill);
  const key = new THREE.DirectionalLight(0xffffff,1.8); key.position.set(2,-3,5); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff,.65); rim.position.set(-2,2,3); scene.add(rim);
  const bodies = Array.from({length:spec.bodies},()=>new THREE.Group()); bodies.forEach(b=>scene.add(b));
  const meshes = spec.meshes.map(item=>{
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(buffer,item.offset,item.vertices*3),3));
    geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(buffer,item.offset+item.vertices*12,item.faces*3),1));
    geometry.computeVertexNormals(); return geometry;
  });
  const materials = new Map();
  let chestLogo;
  for (const geom of spec.geoms) {
    const id = JSON.stringify([geom.color,geom.specular,geom.shininess]);
    if (!materials.has(id)) materials.set(id,new THREE.MeshPhongMaterial({color:new THREE.Color().fromArray(geom.color),specular:new THREE.Color().setScalar(geom.specular),shininess:geom.shininess*128}));
    const mesh = new THREE.Mesh(meshes[geom.mesh],materials.get(id));
    mesh.position.fromArray(geom.position); mesh.quaternion.fromArray(geom.quaternion); mesh.scale.fromArray(geom.scale ?? [1,1,1]); bodies[geom.body].add(mesh);
    if (!chestLogo && spec.bodyNames[geom.body] === 'torso_link') {
      chestLogo = createChestLogo(mesh.geometry, chestLogoTexture); mesh.add(chestLogo);
    }
  }
  let clip, poses, ink, strokeMesh, segmentFrames=[], active=true, manual=false, previousFrame=-1, lastElapsed=0;
  let baseHeight=2, overviewTarget=new THREE.Vector3(), overviewWidth=5;
  const p=new THREE.Vector3(),q=new THREE.Quaternion(),start=new THREE.Vector3(),end=new THREE.Vector3(),mid=new THREE.Vector3(),axis=new THREE.Vector3(0,1,0),matrix=new THREE.Matrix4();
  const strokeMaterial=new LineMaterial({color:0x1769d2,linewidth:2.8,depthTest:false});
  const strokeGeometry=new LineSegmentsGeometry();
  function render() {
    strokeMaterial.resolution.set(Math.max(container.clientWidth,1),Math.max(container.clientHeight,1));
    if(active&&!container.hidden&&!document.hidden) renderer.render(scene,camera);
  }
  const userControl=()=>{manual=true;};
  controls.addEventListener('start',userControl); controls.addEventListener('change',render);
  function reset() { manual=false; if(clip) draw(lastElapsed); else {camera.position.set(5,0,.8);controls.target.set(0,0,.8);controls.update();render();} }
  function resize() {
    if(!container.clientWidth||!container.clientHeight)return;
    const aspect=container.clientWidth/container.clientHeight;
    baseHeight=Math.max(1.9,1.7/aspect);
    camera.left=-baseHeight*aspect/2; camera.right=-camera.left;camera.top=baseHeight/2;camera.bottom=-camera.top;
    camera.updateProjectionMatrix();renderer.setSize(container.clientWidth,container.clientHeight);
    if(clip)draw(lastElapsed);else render();
  }
  const observer=new ResizeObserver(resize);observer.observe(container);
  const onKeyDown=event=>{
    if(event.key==='Home'){event.preventDefault();reset();return;}
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;
    event.preventDefault();manual=true;
    if(event.key==='ArrowUp'||event.key==='ArrowDown') {camera.zoom=THREE.MathUtils.clamp(camera.zoom*(event.key==='ArrowUp'?1.1:1/1.1),.2,3.5);camera.updateProjectionMatrix();}
    else {const offset=camera.position.clone().sub(controls.target).applyAxisAngle(new THREE.Vector3(0,0,1),event.key==='ArrowLeft'?.12:-.12);camera.position.copy(controls.target).add(offset);}
    controls.update();render();
  };
  const lost=event=>{event.preventDefault();container.dispatchEvent(new CustomEvent('rendererror',{detail:new Error('WebGL context lost')}));};
  container.addEventListener('keydown',onKeyDown);renderer.domElement.addEventListener('webglcontextlost',lost);
  function draw(elapsed) {
    lastElapsed=elapsed;if(!poses)return;
    const clock=sampleTime(elapsed,clip),frame=clock.sourceTime*clip.fps;
    const a=Math.min(Math.floor(frame),clip.frames-1),b=Math.min(a+1,clip.frames-1),alpha=frame-a;
    if(frame<previousFrame){manual=false;} previousFrame=frame;
    for(let i=0;i<bodies.length;i++){
      const x=(a*spec.bodies+i)*7,y=(b*spec.bodies+i)*7;
      bodies[i].position.fromArray(poses,x).lerp(p.fromArray(poses,y),alpha);
      bodies[i].quaternion.fromArray(poses,x+3).slerp(q.fromArray(poses,y+3),alpha);
    }
    if(strokeMesh)strokeMesh.geometry.instanceCount=visibleSegments(segmentFrames,frame);
    if(!manual){
      controls.target.copy(overviewTarget);camera.position.copy(overviewTarget).add(new THREE.Vector3(5,0,0));
      const overviewZoom=Math.min(1,(camera.right-camera.left)/(overviewWidth*1.14));
      camera.zoom=overviewZoom;camera.updateProjectionMatrix();controls.update();
    }
    renderer.domElement.style.opacity=String(clock.opacity);
    container.dataset.replayFrame=String(a);container.dataset.inkSegments=String(strokeMesh?.geometry.instanceCount ?? 0);
    container.dataset.replayPhase=clock.opacity<1?'fade':clock.overview>0?'overview':'writing';
    render();
  }
  reset();resize();
  return {reset,resize,draw,setActive(value){active=value;},
    async loadClip(next){
      const [data,response]=await Promise.all([binary(next.poseUrl),fetch(new URL(`./assets/${next.inkUrl}`,import.meta.url))]);
      if(data.byteLength!==next.frames*spec.bodies*7*4||!response.ok)throw new Error('Incomplete replay');
      const trace=await response.json();if(trace.frames!==next.frames||trace.actualWrist.length!==next.frames*3)throw new Error('Incomplete ink');
      return {poses:new Float32Array(data),ink:trace};
    },
    setClip(next,data){
      clip=next;poses=data.poses;ink=data.ink;
      const segments=inkSegments(ink);segmentFrames=segments.frames;
      strokeGeometry.setPositions(segments.points);
      strokeMesh=new LineSegments2(strokeGeometry,strokeMaterial);strokeMesh.frustumCulled=false;strokeMesh.renderOrder=10;
      let low=Infinity,high=-Infinity;
      for(let i=1;i<segments.points.length;i+=3){low=Math.min(low,segments.points[i]);high=Math.max(high,segments.points[i]);}
      strokeGeometry.instanceCount=0;scene.add(strokeMesh);
      const lastRoot=(clip.frames-1)*spec.bodies*7+clip.rootBody*7;
      high=Math.max(high,poses[lastRoot+1]+.4);low=Math.min(low,-.55);
      overviewWidth=high-low;overviewTarget.set(0,(low+high)/2,.78);reset();
    },
    dispose(){
      active=false;observer.disconnect();container.removeEventListener('keydown',onKeyDown);renderer.domElement.removeEventListener('webglcontextlost',lost);
      controls.removeEventListener('start',userControl);controls.removeEventListener('change',render);controls.dispose();
      meshes.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());strokeGeometry.dispose();strokeMaterial.dispose();renderer.dispose();renderer.domElement.remove();
      chestLogo?.geometry.dispose();chestLogo?.material.dispose();chestLogoTexture.dispose();
    }
  };
}
