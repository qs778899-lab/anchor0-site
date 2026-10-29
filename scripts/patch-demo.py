"""Apply the two transport-only adaptations to the pinned, published demo."""
from pathlib import Path
import hashlib

root = Path(__file__).resolve().parents[1]
worker = root / 'dist/demo/assets/sim.worker-B2q0D_ik.js'
text = worker.read_text()
original_digest = 'await crypto.subtle.digest("SHA-256",n)'
original_cache = 'async function ip(n){try{if(typeof caches>"u")return null;const a=await caches.open("s0-tracker-model-parts-v1"),i=d=>new URL(`__model_cache__/${d}`,n).href;return{async read(d){return(await a.match(i(d)))?.arrayBuffer()},async write(d,h){await a.put(i(d),new Response(h,{headers:{"Content-Type":"application/octet-stream"}}))},async remove(d){await a.delete(i(d))}}}catch{return null}}'
if 'import { digestSha256, createResourceCache }' not in text:
    assert text.count(original_digest) == 1, 'Unexpected published digest function'
    assert text.count(original_cache) == 1, 'Unexpected published cache function'
    text = 'import { digestSha256, createResourceCache } from "./lan-compat.js";\n' + text
    text = text.replace(original_digest, 'await digestSha256(n)')
    text = text.replace(original_cache, 'async function ip(n){return createResourceCache(n)}')
    worker.write_text(text)
index = root / 'dist/demo/index.html'
text = index.read_text()
if 'data-home-link' not in text and './assets/demo-ui.js' not in text:
    text = text.replace('</head>', '''<style>
      .home-return{position:fixed;bottom:12px;left:12px;z-index:10000;background:#111418e8;color:#E4E8EE;border:1px solid #44474B;border-radius:7px;padding:8px 13px;font:12px system-ui;text-decoration:none;box-shadow:0 2px 12px #0004}
      .home-return:hover,.home-return:focus-visible{color:#80B4F8;border-color:#80B4F8}
    </style></head>''')
    text = text.replace('</body>', '<a class="home-return" data-home-link href="/">← Anchor-0 · Project</a></body>')
    index.write_text(text)
print('Published demo adapted for local HTTP; policy and motions unchanged.')
