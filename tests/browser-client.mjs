import {writeFile} from 'node:fs/promises';
const target=await (await fetch(`${process.env.CDP_URL || 'http://127.0.0.1:9223'}/json/new?about:blank`,{method:'PUT'})).json();
const socket=new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
let id=0;const pending=new Map();export const events=[];
socket.addEventListener('message',e=>{const value=JSON.parse(e.data);if(value.id){const p=pending.get(value.id);pending.delete(value.id);if(value.error)p.reject(value.error);else p.resolve(value.result);}else events.push(value);});
export const cdp=(method,params={})=>new Promise((resolve,reject)=>{pending.set(++id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
export async function evaluate(expression){const result=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});if(result.exceptionDetails)throw new Error(JSON.stringify(result.exceptionDetails));return result.result.value;}
export const wait=ms=>new Promise(r=>setTimeout(r,ms));
export async function until(expression,timeout=15000){const start=Date.now();while(Date.now()-start<timeout){if(await evaluate(expression))return;await wait(100);}throw new Error('Timed out: '+expression);}
export async function viewport(width,height=1000,mobile=false){await cdp('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile});}
export async function go(url=process.env.SITE_URL||'http://127.0.0.1:18081/'){await cdp('Page.navigate',{url});await until('document.querySelectorAll("#video-groups .clip-card").length===15 && document.querySelectorAll(".research-svg").length>=9');}
export async function screenshot(path){const r=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(path,Buffer.from(r.data,'base64'));}
export async function close(){await cdp('Page.close');socket.close();}
await cdp('Page.enable');await cdp('Page.bringToFront');await cdp('Runtime.enable');await cdp('Network.enable');
