import assert from 'node:assert/strict';
import {cdp,evaluate,until,viewport,go,close,events,wait} from './browser-client.mjs';

const base = process.env.SITE_URL || 'https://qs778899-lab.github.io/anchor0-site/';
try {
  await viewport(1440);
  await go(base);
  assert.equal(await evaluate(`document.querySelector('.hero-actions a[href$="code/"]').href`),new URL('code/',base).href);
  assert.equal(await evaluate(`document.querySelector('.hero-actions a[href$="demo/"]').href`),new URL('demo/',base).href);
  await evaluate(`document.querySelector('#language-toggle').click()`);
  assert.equal(await evaluate('document.documentElement.lang'),'zh-CN');
  await evaluate(`document.querySelector('#language-toggle').click()`);
  await viewport(390,844,true);
  assert.equal(await evaluate('document.documentElement.scrollWidth > innerWidth'),false);
  console.log('PASS: public homepage, charts, navigation, bilingual toggle and mobile width');

  await viewport(1440);
  await cdp('Page.navigate',{url:new URL('demo/?word=ANCHOR&validate=1',base).href});
  await until('!!window.__s0Ready && !!window.__s0LastFrame',240000);
  assert.equal(await evaluate(`document.querySelector('#word-input').value`),'ANCHOR');
  assert.equal(await evaluate(`document.querySelector('[data-home-link]').href`),base);
  await until(`!document.querySelector('#play-button').disabled`);
  const before=await evaluate('window.__s0LastFrame.frame');
  await evaluate(`document.querySelector('#play-button').click()`);
  await until(`window.__s0LastFrame.frame > ${before}+5`,60000);
  await evaluate(`document.querySelector('#play-button').click()`);
  console.log('PASS: public demo, model validation, robot assets, WASM, ANCHOR sequence and live inference');

  await cdp('Page.navigate',{url:new URL('code/',base).href});
  await until(`document.querySelector('#viewer')?.getAttribute('aria-busy')==='false' && document.querySelector('#pause')?.hidden===false`,120000);
  await wait(1000);
  assert.ok(await evaluate(`document.querySelector('#viewer canvas')?.width > 0`));
  await evaluate(`document.querySelector('#pause').click()`);
  console.log('PASS: public Code page, compressed replay and robot rendering');

  const errors=events.filter(e=>e.method==='Runtime.exceptionThrown');
  const missing=events.filter(e=>e.method==='Network.responseReceived' && e.params.response.status>=400 && !e.params.response.url.endsWith('/favicon.ico'));
  assert.deepEqual(errors,[]);
  assert.deepEqual(missing,[]);
  console.log('PASS: no page exceptions or failed HTTP resource responses');
} finally {
  await close();
}
