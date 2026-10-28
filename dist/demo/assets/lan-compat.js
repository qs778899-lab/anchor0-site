// Local HTTP adapter. The published policy, motions, and physics are unchanged.
const K = new Uint32Array([
  0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
  0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
  0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
  0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
  0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
  0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
  0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
  0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2,
]);
const rotr = (x, n) => (x >>> n) | (x << (32 - n));

export function sha256Fallback(input) {
  const bytes = input instanceof ArrayBuffer ? new Uint8Array(input) : new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  const padded = new Uint8Array(Math.ceil((bytes.length + 9) / 64) * 64);
  padded.set(bytes); padded[bytes.length] = 128;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, Math.floor(bytes.length / 0x20000000));
  view.setUint32(padded.length - 4, bytes.length << 3);
  const hash = new Uint32Array([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]);
  const w = new Uint32Array(64);
  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4);
    for (let i = 16; i < 64; i++) {
      const a = w[i - 15], b = w[i - 2];
      w[i] = w[i - 16] + (rotr(a,7)^rotr(a,18)^(a>>>3)) + w[i - 7] + (rotr(b,17)^rotr(b,19)^(b>>>10));
    }
    let [a,b,c,d,e,f,g,h] = hash;
    for (let i = 0; i < 64; i++) {
      const t1 = (h + (rotr(e,6)^rotr(e,11)^rotr(e,25)) + ((e&f)^(~e&g)) + K[i] + w[i]) | 0;
      const t2 = ((rotr(a,2)^rotr(a,13)^rotr(a,22)) + ((a&b)^(a&c)^(b&c))) | 0;
      h=g; g=f; f=e; e=(d+t1)|0; d=c; c=b; b=a; a=(t1+t2)|0;
    }
    [a,b,c,d,e,f,g,h].forEach((v,i) => { hash[i] += v; });
  }
  const out = new DataView(new ArrayBuffer(32));
  hash.forEach((v,i) => out.setUint32(i * 4, v));
  return out.buffer;
}

export async function digestSha256(bytes) {
  return globalThis.crypto?.subtle ? globalThis.crypto.subtle.digest('SHA-256', bytes) : sha256Fallback(bytes);
}

export async function createResourceCache(base) {
  try {
    if (globalThis.caches) {
      const cache = await caches.open('s0-tracker-model-parts-v1');
      const key = hash => new URL(`__model_cache__/${hash}`, base).href;
      return {
        async read(hash) { return (await cache.match(key(hash)))?.arrayBuffer(); },
        async write(hash, data) { await cache.put(key(hash), new Response(data, {headers:{'Content-Type':'application/octet-stream'}})); },
        async remove(hash) { await cache.delete(key(hash)); },
      };
    }
  } catch { /* HTTP origins use IndexedDB; resource hashes still validate reads. */ }
  if (!globalThis.indexedDB) return null;
  try {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('s0-tracker-lan-assets-v1', 1);
      let expired = false;
      const timer = setTimeout(() => { expired = true; reject(new Error('Cache open timed out')); }, 4000);
      request.onupgradeneeded = () => request.result.createObjectStore('resources');
      request.onerror = () => { clearTimeout(timer); reject(request.error); };
      request.onsuccess = () => { clearTimeout(timer); if (expired) request.result.close(); else resolve(request.result); };
    });
    db.onversionchange = () => db.close();
    const operation = (mode, action) => new Promise((resolve, reject) => {
      const tx = db.transaction('resources', mode);
      let request;
      const timer = setTimeout(() => { try { tx.abort(); } catch {} reject(new Error('Cache transaction timed out')); }, 4000);
      tx.oncomplete = () => { clearTimeout(timer); resolve(request.result); };
      tx.onerror = tx.onabort = () => { clearTimeout(timer); reject(tx.error || new Error('Cache unavailable')); };
      request = action(tx.objectStore('resources'));
    });
    return {
      read: hash => operation('readonly', store => store.get(hash)),
      write: (hash,data) => operation('readwrite', store => store.put(data,hash)),
      remove: hash => operation('readwrite', store => store.delete(hash)),
    };
  } catch { return null; }
}
