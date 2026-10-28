import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { sha256Fallback } from '../dist/demo/assets/lan-compat.js';
const hex = bytes => Buffer.from(bytes).toString('hex');
test('LAN SHA-256 fallback matches standard vectors and block boundaries', () => {
  for (const text of ['', 'abc', 'abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq']) {
    const input = new TextEncoder().encode(text);
    assert.equal(hex(sha256Fallback(input)), createHash('sha256').update(input).digest('hex'));
  }
  for (const size of [1,55,56,63,64,65,1024,16777217]) {
    const input = randomBytes(size);
    assert.equal(hex(sha256Fallback(input)), createHash('sha256').update(input).digest('hex'));
  }
});
test('LAN SHA-256 fallback validates an actual policy part', () => {
  function files(path) { return readdirSync(path).flatMap(name => { const p=`${path}/${name}`;return statSync(p).isDirectory()?files(p):[p]; }); }
  const path = files(fileURLToPath(new URL('../dist/demo/assets', import.meta.url))).find(p => p.endsWith('.bin') && statSync(p).size > 1000000);
  assert.ok(path,'Published policy part exists');
  const input=readFileSync(path);
  assert.equal(hex(sha256Fallback(input)),createHash('sha256').update(input).digest('hex'));
});
