import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
export const sourceHash='9c6fd1c5ea028011b531a2b9cbddbfaf5157d04cad7f8433a6c5594b47f883b5';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function buildDemoWorker({root,build}) {
  const source='dist/demo/assets/sim.worker-B2q0D_ik.js',output='dist/demo/assets/sim.worker-interactive.js';
  const original=await readFile(resolve(root,source));
  if(sha(original)!==sourceHash)throw new Error('Published worker hash changed; review the disturbance adapter before rebuilding.');
  const code=original.toString(),pattern=/function Dl\(n\)\{.*?\}(?=async function mp\()/s;
  if((code.match(new RegExp(pattern,'gs'))??[]).length!==1||code.split('case"push":Dl(n.direction);break;').length!==2)throw new Error('Unexpected published push implementation');
  const replacement=await readFile(resolve(root,'src/demo/worker-push.js'),'utf8');
  const result=code.replace(pattern,()=>replacement).replace('case"push":Dl(n.direction);break;',
    'case"push":{if(vr&&n.epoch===Dn&&n.runId===jo){const event=Dl(n.direction,n.force);if(event)Fr(event)}break;}');
  await build({entryPoints:[resolve(root,'src/demo/disturbance.ts')],bundle:true,format:'esm',target:'es2022',minify:true,outfile:resolve(root,'dist/demo/assets/demo-disturbance.js')});
  const adapted='import {createPulse} from "./demo-disturbance.js";\n'+result;
  await writeFile(resolve(root,output),adapted);
  const record={format:1,source,sourceSha256:sourceHash,output,outputSha256:sha(adapted),
    helperSha256:sha(await readFile(resolve(root,'dist/demo/assets/demo-disturbance.js'))),
    adapterSha256:sha(replacement),changes:['Push magnitude 0–60 N; 100 ms pulse','Acknowledge actual world force, body, simulation times, run and epoch','Reject paused or stale interactive commands'],policyChanged:false};
  await writeFile(resolve(root,'source/demo-worker-build.json'),JSON.stringify(record,null,2)+'\n');
  return record;
}
