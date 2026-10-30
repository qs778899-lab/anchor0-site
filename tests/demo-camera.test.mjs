import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fitOrthographicDepth} from '../src/demo/orthographic-depth.ts';

let load=createRequire(import.meta.url);
try { load.resolve('three'); } catch { load=createRequire(new URL('../../s0-tracker-demo/package.json',import.meta.url)); }
const {Box3,Vector3,OrthographicCamera}=load('three');
const bounds=new Box3(new Vector3(-40,-40,0),new Vector3(40,40,3));
const corners=[];
for(const x of [-40,40])for(const y of [-40,40])for(const z of [0,3])corners.push(new Vector3(x,y,z));
const close=(a,b)=>assert(Math.abs(a-b)<1e-8,`${a} != ${b}`);

test('wide orthographic orbits keep the whole ground between near/far planes without changing XY or fog',()=>{
 let reproduced=false;
 for(const aspect of [390/844,16/9])for(const zoom of [.02,.04,1,5]) {
  for(const azimuth of [0,.3,Math.PI/2,Math.PI,Math.PI*1.7])for(const elevation of [0,.15,.7,Math.PI/2]) {
   const source=new OrthographicCamera(-aspect,aspect,1,-1,.02,120);
   const target=new Vector3(0,9,.85);
   source.up.set(0,0,1);source.zoom=zoom;source.updateProjectionMatrix();
   source.position.set(Math.cos(azimuth)*Math.cos(elevation),Math.sin(azimuth)*Math.cos(elevation),Math.sin(elevation)).multiplyScalar(4).add(target);
   source.lookAt(target);source.updateMatrixWorld(true);
   const position=source.position.clone(),quaternion=source.quaternion.clone(),projection=source.projectionMatrix.clone();
   const output=new OrthographicCamera();
   const offset=fitOrthographicDepth(source,output,bounds);
   assert(output.near>0);
   for(const corner of corners) {
    const before=corner.clone().project(source),after=corner.clone().project(output);
    if(before.z < -1)reproduced=true;
    assert(after.z>=-1&&after.z<=1,`Clipped corner: ${after.z}`);
    close(before.x,after.x);close(before.y,after.y);
    const oldDepth=-corner.clone().applyMatrix4(source.matrixWorldInverse).z;
    const newDepth=-corner.clone().applyMatrix4(output.matrixWorldInverse).z;
    // Shifting both fog boundaries by offset keeps its blend coordinate identical.
    close((oldDepth-25)/50,(newDepth-(25+offset))/50);
   }
   assert(source.position.equals(position));assert(source.quaternion.equals(quaternion));
   assert(source.projectionMatrix.equals(projection));assert.equal(source.zoom,zoom);
  }
 }
 assert(reproduced,'The test must exercise the original near-plane clipping bug');
});

test('depth fitting covers translated ground, is repeatable and does not pull an already distant camera closer',()=>{
 const source=new OrthographicCamera(-2,2,1,-1,.02,120),output=new OrthographicCamera();
 source.position.set(0,0,200);source.lookAt(0,0,0);
 const moved=bounds.clone().translate(new Vector3(10,30,-15));
 assert.equal(fitOrthographicDepth(source,output,moved),0);
 assert(output.far>200);
 const once=output.matrixWorld.clone(),far=output.far;
 fitOrthographicDepth(source,output,moved);
 assert(output.matrixWorld.equals(once));assert.equal(output.far,far);
 for(const corner of corners) {
  const projected=corner.clone().add(new Vector3(10,30,-15)).project(output);
  assert(projected.z>=-1&&projected.z<=1);
 }
});
