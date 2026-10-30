// Build the presentation layer and a narrowly adapted copy of the pinned worker.
import {buildDemoWorker} from './build-demo-worker.mjs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {readFile,writeFile,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('../',import.meta.url));
let dependencyRoot=root,load=createRequire(resolve(root,'package.json'));
try{load.resolve('esbuild');load.resolve('three');}catch{dependencyRoot=process.env.S0_SOURCE_DIR||resolve(root,'../s0-tracker-demo');load=createRequire(resolve(dependencyRoot,'package.json'));}
const {build}=load('esbuild');
const worker=resolve(root,'dist/demo/assets/sim.worker-B2q0D_ik.js');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const before=hash(await readFile(worker));
const adaptedWorker=await buildDemoWorker({root,build});
const result=await build({entryPoints:[resolve(root,'src/demo/main.ts')],bundle:true,format:'esm',target:'es2022',minify:true,metafile:true,nodePaths:[resolve(dependencyRoot,'node_modules')],outfile:resolve(root,'dist/demo/assets/demo-ui.js'),legalComments:'eof'});
await build({entryPoints:[resolve(root,'src/robot/chest-logo.js')],bundle:true,format:'esm',target:'es2022',plugins:[{name:'shared-three',setup(plugin){plugin.onResolve({filter:/^three$/},()=>({path:'three',external:true}));}}],nodePaths:[resolve(dependencyRoot,'node_modules')],outfile:resolve(root,'dist/code/chest-logo.js'),legalComments:'eof'});
for (const page of ['demo', 'code']) await copyFile(resolve(root,'dist/assets/images/archon-logo.png'),resolve(root,`dist/${page}/assets/archon-chest-logo.png`));
await writeFile(resolve(root,'dist/demo/index.html'),await readFile(resolve(root,'src/demo/index.html')));
if(hash(await readFile(worker))!==before)throw new Error('The pinned worker changed');
const outputs={};
for(const name of Object.keys(result.metafile.outputs)){
 const path=resolve(root,name);let bytes=await readFile(path);
 // Three's embedded GLSL contains insignificant trailing spaces.
 if(name.endsWith('.js')){bytes=Buffer.from(bytes.toString().replace(/[ \t]+$/gm,''));await writeFile(path,bytes);}
 outputs[name.replace(root,'')]={bytes:bytes.length,sha256:hash(bytes)};
}
await writeFile(resolve(root,'source/demo-ui-build.json'),JSON.stringify({format:1,entry:'src/demo/main.ts',workerSha256:before,activeWorker:adaptedWorker.output,activeWorkerSha256:adaptedWorker.outputSha256,three:JSON.parse(await readFile(resolve(dependencyRoot,'node_modules/three/package.json'),'utf8')).version,outputs},null,2)+'\n');
const chestOutputs={};
for(const name of ['dist/code/chest-logo.js','dist/code/assets/archon-chest-logo.png','dist/demo/assets/archon-chest-logo.png']) {
 const bytes=await readFile(resolve(root,name));chestOutputs[name]={bytes:bytes.length,sha256:hash(bytes)};
}
await writeFile(resolve(root,'source/chest-logo-build.json'),JSON.stringify({format:1,source:'src/robot/chest-logo.js',sourceSha256:hash(await readFile(resolve(root,'src/robot/chest-logo.js'))),textureSource:'dist/assets/images/archon-logo.png',textureSourceSha256:hash(await readFile(resolve(root,'dist/assets/images/archon-logo.png'))),reference:'User-supplied ARCHON screenshot, 2026-10-30; matching existing high-resolution transparent wordmark reused without image edits.',textureCropPixels:[494,161,1569,158],placement:'Letters only, centered on front torso at local z=0.22 m, width 0.112 m; decal follows the original torso surface and body pose.',outputs:chestOutputs},null,2)+'\n');
console.log('Rebuilt demo UI and force adapter; published worker unchanged.');
