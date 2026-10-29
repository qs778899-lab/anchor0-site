// Record the current /demo/ worker; retain the exact loaded worker provenance.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
const root = fileURLToPath(new URL('../../', import.meta.url));
const source = process.env.S0_SOURCE_DIR || resolve(root, '../s0-tracker-demo');
const { chromium } = createRequire(resolve(source, 'package.json'))('playwright');
const origin = process.env.SITE_URL || 'http://127.0.0.1:18081';
const output = resolve(root, process.env.REPLAY_RECORDING || 'source/code-replay/coming-soon-rollout.json.gz');
try { await access(output); throw new Error(`Refusing to overwrite recording: ${output}`); } catch (e) { if (e.code !== 'ENOENT') throw e; }
const manifestBytes = await readFile(resolve(root, 'dist/demo/assets/manifest.json'));
const manifest = JSON.parse(manifestBytes);
const first = JSON.parse(await readFile(resolve(root, 'dist/demo/assets/motions/letter-C.json')));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const uiBuild = JSON.parse(await readFile(resolve(root, 'source/demo-ui-build.json')));
const activeWorker = uiBuild.activeWorker || 'dist/demo/assets/sim.worker-B2q0D_ik.js';
const activeWorkerHash = sha(await readFile(resolve(root, activeWorker)));
if (uiBuild.activeWorkerSha256) assert.equal(activeWorkerHash, uiBuild.activeWorkerSha256);
const workerBuild = uiBuild.activeWorker ? JSON.parse(await readFile(resolve(root, 'source/demo-worker-build.json'))) : null;
assert.equal(manifest.model.sha256, 'e4f393a62ceb64d14fe310dd8f1ac7f9790f945ef22708074ce9e383d0928f3c');
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-unsafe-swiftshader', '--disable-background-timer-throttling'] });
try {
  const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  page.on('console', message => { if (message.text().startsWith('REPLAY ')) console.log(message.text()); });
  await page.goto(`${origin}/demo/?word=COMING+SOON&validate=1`);
  await page.waitForFunction(() => window.__s0Ready, null, { timeout: 300000 });
  console.log('Demo worker ready; recording COMING SOON with the published policy.');
  const result = await page.evaluate(() => new Promise((resolve, reject) => {
    const worker = window.__s0Worker, requestId = 'coming-soon-recording';
    const timer = setTimeout(() => reject(Error('Recording timed out')), 1200000);
    let last = -1;
    const listen = event => {
      const data = event.data;
      if (data.type === 'frame' && data.frame % 500 === 0 && data.frame !== last) {
        last = data.frame; console.log(`REPLAY ${data.frame}/${data.totalFrames}`);
      }
      if (data.type === 'error' || data.type === 'validation' && data.requestId === requestId) {
        clearTimeout(timer); worker.removeEventListener('message', listen);
        data.type === 'error' ? reject(Error(data.message)) : resolve(data.result);
      }
    };
    worker.addEventListener('message', listen);
    worker.postMessage({ type: 'rollout', motion: 'word', text: 'COMING SOON', requestId });
  }));
  assert.equal(result.motion, 'word:COMING SOON');
  assert.equal(result.historyResets, 1); assert.equal(result.initializations, 1); assert.equal(result.runIdUnchanged, true);
  assert.equal(result.records.length, 10974);
  let minRootHeight = Infinity, minUpright = Infinity;
  for (const [i, record] of result.records.entries()) {
    assert.equal(record.frame, i + 1);
    for (const key of ['qpos', 'qvel', 'action', 'tokens', 'pointPositions']) assert(record[key].every(Number.isFinite), key);
    assert.equal(record.qpos.length, 36); assert.equal(record.qvel.length, 35);
    minRootHeight = Math.min(minRootHeight, record.qpos[2]);
    minUpright = Math.min(minUpright, 1 - 2 * (record.qpos[4] ** 2 + record.qpos[5] ** 2));
  }
  assert(minRootHeight >= .3 && minUpright >= Math.cos(75 * Math.PI / 180), 'Recorded controller fell');
  assert.deepEqual(errors, []);
  const recording = {
    format: 1, text: 'COMING SOON', fps: 50, capturedAt: new Date().toISOString(),
    policy: { name: 'test052', step: manifest.model.checkpointStep, sha256: manifest.model.sha256 },
    manifestSha256: sha(manifestBytes), physicsSha256: manifest.physics.physicsSha256,
    workerSha256: activeWorkerHash, workerPath: activeWorker, workerBuild,
    physics: { jointNames: manifest.physics.jointNames, qposAddresses: manifest.physics.qposAddresses },
    initial: { qpos: first.initial.qpos, qvel: first.initial.qvel,
      pointPositions: manifest.policy.pointNames.flatMap(name => {
        const index = result.bodyNames.indexOf(name); assert(index >= 0);
        return result.initialBodyXpos.slice(index * 3, index * 3 + 3);
      }), penDown: false, strokeId: -1 },
    validation: { minRootHeight, minUpright, frames: result.records.length + 1, initializations: result.initializations, historyResets: result.historyResets, runIdUnchanged: result.runIdUnchanged },
    result,
  };
  await mkdir(resolve(output, '..'), { recursive: true });
  const bytes = gzipSync(JSON.stringify(recording), { level: 9 });
  await writeFile(output, bytes, { flag: 'wx' });
  console.log(JSON.stringify({ output, bytes: bytes.length, sha256: sha(bytes), ...recording.validation }));
} finally { await browser.close(); }
