import {METHOD_FLOWS} from './method-flow-paths.js';

export const METHOD_PULSE = 64;
export const METHOD_PANELS = [
  {group:'A', x:7, y:15, width:1628, height:547, rx:30, color:'#438eff'},
  {group:'B', x:7, y:582, width:1626, height:868, rx:37, color:'#a779ed'},
  {group:'C', x:1655, y:15, width:611, height:1435, rx:28, color:'#36b8a1'},
];
// Pedagogical relay order. The source arrows and branch directions remain unchanged.
export const METHOD_STAGES = [
  ['A', ['calibration', 'offline-retargeting', 'quality-check', 'curated-pairs']],
  ['B', ['reference-encoder', 'encoder-token', 'token-decoder', 'decoder-robot',
    'robot-state', 'token-reconstruction', 'reconstruction-selector', 'reference-selector',
    'selector-error', 'state-error', 'error-decoder', 'state-decoder', 'robot-reward', 'reward-decoder']],
  ['C', ['teleoperation-reference', 'policy-reference', 'deployment-reference-encoder',
    'deployment-encoder-token', 'policy-token', 'deployment-token-decoder',
    'deployment-decoder-robot', 'deployment-state-error', 'deployment-error-decoder', 'deployment-state-decoder']],
];
function pathLength(d) {
  const tokens=d.match(/[MHV]|-?\d+(?:\.\d+)?/g);let x=0,y=0,length=0;
  for(let i=0;i<tokens.length;){
    const command=tokens[i++];
    if(command==='M'){x=+tokens[i++];y=+tokens[i++];continue;}
    const nx=command==='H'?+tokens[i++]:x,ny=command==='V'?+tokens[i++]:y;
    length+=Math.abs(nx-x)+Math.abs(ny-y);x=nx;y=ny;
  }
  return length;
}
let cursor=0;
export const METHOD_TIMELINE=METHOD_STAGES.flatMap(([group,ids])=>{
  const entries=ids.map(id=>{
    const flow=METHOD_FLOWS.find(flow=>flow.id===id);
    const length=pathLength(flow.d), head=flow.arrowhead===false?0:28.5;
    const travel=length+head+METHOD_PULSE;
    const duration=Math.min(1800,Math.max(600,travel/350*1000));
    const entry={id,group,length,head,travel,start:cursor,duration,end:cursor+duration};
    cursor+=duration;return entry;
  });
  cursor+=300;return entries;
});
export const METHOD_DURATION=cursor;
export function methodFrame(elapsed) {
  const time=((elapsed%METHOD_DURATION)+METHOD_DURATION)%METHOD_DURATION;
  const entry=METHOD_TIMELINE.find(item=>time>=item.start&&time<item.end);
  if(!entry)return {time,entry:null,progress:0,offset:0,breath:0};
  const progress=(time-entry.start)/entry.duration;
  return {time,entry,progress,offset:METHOD_PULSE-entry.travel*progress,
    breath:.18+.22*(1-Math.cos(2*Math.PI*time/1400))/2};
}
