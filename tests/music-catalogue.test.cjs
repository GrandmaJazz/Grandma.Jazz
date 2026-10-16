const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function catalogue(globals) {
  const exports = {};
  const source = ts.transpileModule(readFileSync('src/lib/musicCatalogue.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, { exports, AbortController, setTimeout, clearTimeout,
    process: { env: { NEXT_PUBLIC_API_URL: 'https://catalogue.test' } }, ...globals });
  return exports.loadMusicCatalogue;
}

test('picker and player share one pending request and a short-lived catalogue', async () => {
  let now = 0, calls = 0, finish;
  const load = catalogue({ Date: { now: () => now }, fetch: () => {
    calls++;
    return new Promise(resolve => { finish = resolve; });
  } });
  const picker = load(), player = load();
  assert.equal(picker, player);
  assert.equal(calls, 1);
  const cards = [{ _id: 'b', order: 2 }, { _id: 'a', order: 1 }];
  finish({ ok: true, json: async () => ({ success: true, cards }) });
  assert.equal((await picker).map(card => card._id).join(','), 'a,b');
  assert.equal(cards.map(card => card._id).join(','), 'b,a');
  await load();
  assert.equal(calls, 1);
  now = 61_000;
  const refreshed = load();
  assert.equal(calls, 2);
  finish({ ok: true, json: async () => ({ cards: [] }) });
  await refreshed;
});

test('an unavailable service can recover on the next request', async () => {
  let calls = 0;
  const load = catalogue({ fetch: async () => {
    calls++;
    if (calls === 1) return { ok: false, status: 503 };
    return { ok: true, json: async () => ({ cards: [{ _id: 'recovered', order: 0 }] }) };
  } });
  await assert.rejects(load(), /503/);
  assert.equal((await load())[0]._id, 'recovered');
  assert.equal(calls, 2);
});

test('a stalled catalogue aborts, clears its timer and allows another attempt', async () => {
  let timeout, cleared = 0, calls = 0;
  const load = catalogue({ setTimeout: callback => { timeout = callback; return 1; },
    clearTimeout: () => cleared++, fetch: (_url, { signal }) => {
      calls++;
      return new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason)));
    } });
  const failed = assert.rejects(load(), /abort/i);
  timeout(); await failed;
  assert.equal(cleared, 1);
  const retry = assert.rejects(load(), /abort/i);
  timeout(); await retry;
  assert.equal(calls, 2);
});

test('known artwork is local and available while new artwork retains its own source', () => {
  const exports = {};
  const source = ts.transpileModule(readFileSync('src/lib/albumArtwork.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, { exports, require: () => ({ getOptimizedImageUrl: url => url }) });
  for (const url of readFileSync('src/lib/albumArtwork.ts', 'utf8').match(/https:\/\/[^"\s]+\.png/g)) {
    const local = exports.getAlbumArtworkUrl(url);
    assert.ok(local.startsWith('/images/records/'));
    assert.ok(existsSync(`public${local}`));
  }
  const fresh = 'https://example.test/new-album.png';
  assert.equal(exports.getAlbumArtworkUrl(fresh), fresh);
});
