// Rebuild only the presentation layer. The published worker and its assets stay pinned.
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('../',import.meta.url));
let dependencyRoot=root,load=createRequire(resolve(root,'package.json'));
try{load.resolve('esbuild');load.resolve('three');}catch{dependencyRoot=process.env.S0_SOURCE_DIR||resolve(root,'../s0-tracker-demo');load=createRequire(resolve(dependencyRoot,'package.json'));}
const {build}=load('esbuild');
const worker=resolve(root,'dist/demo/assets/sim.worker-B2q0D_ik.js');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const before=hash(await readFile(worker));
const result=await build({entryPoints:[resolve(root,'src/demo/main.ts')],bundle:true,format:'esm',target:'es2022',minify:true,metafile:true,nodePaths:[resolve(dependencyRoot,'node_modules')],outfile:resolve(root,'dist/demo/assets/demo-ui.js'),legalComments:'eof'});
await writeFile(resolve(root,'dist/demo/index.html'),await readFile(resolve(root,'src/demo/index.html')));
if(hash(await readFile(worker))!==before)throw new Error('The pinned worker changed');
const outputs={};
for(const name of Object.keys(result.metafile.outputs)){
 const path=resolve(root,name);let bytes=await readFile(path);
 // Three's embedded GLSL contains insignificant trailing spaces.
 if(name.endsWith('.js')){bytes=Buffer.from(bytes.toString().replace(/[ \t]+$/gm,''));await writeFile(path,bytes);}
 outputs[name.replace(root,'')]={bytes:bytes.length,sha256:hash(bytes)};
}
await writeFile(resolve(root,'source/demo-ui-build.json'),JSON.stringify({format:1,entry:'src/demo/main.ts',workerSha256:before,three:JSON.parse(await readFile(resolve(dependencyRoot,'node_modules/three/package.json'),'utf8')).version,outputs},null,2)+'\n');
console.log('Rebuilt demo UI; frozen inference worker unchanged.');
