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
  vm.runInNewContext(source, { exports, require: () => ({ getAlbumTitle: (_source, title) => title || 'Grandma Jazz' }), AbortController, setTimeout, clearTimeout,
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

test('every existing cover resolves its printed album name rather than a placeholder or filename',()=>{
 const exports={};const source=ts.transpileModule(readFileSync('src/lib/albumArtwork.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(source,{exports,require:()=>({getOptimizedImageUrl:url=>url})});
 const names={'4ccf343a498659':'Day Vision','62b22d7cd1e4e2':'Grandma’s Groove','a8b97e29ae6f36':'Saturday Sessions','e2f7c781c855de':'Sativa','ffbed2540eb424':'Indica','965f3b262e52c6':'Ensemble'};
 for(const [id,title]of Object.entries(names))assert.equal(exports.getAlbumTitle(`/images/records/${id}.webp`,'Music Card'),title);
 assert.equal(exports.getAlbumTitle('/new-cover.webp','New album'),'New album');
 assert.equal(exports.getAlbumTitle('/new-cover.webp','Music Card'),'Grandma Jazz');
});


test('public catalogue cache never forwards a visitor session and failures remain retryable', async () => {
 const exports={};let upstream,options,fail=false;
 const source=ts.transpileModule(readFileSync('src/app/api/music-catalogue/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(source,{exports,Response,AbortSignal,process:{env:{NEXT_PUBLIC_API_URL:'https://catalogue.test'}},fetch:async(url,init)=>{upstream=url;options=init;if(fail)throw new Error('offline');return {ok:true,json:async()=>({success:true,cards:[{_id:'album'}]})};}});
 const r=await exports.GET();assert.equal(r.status,200);assert.equal(upstream,'https://catalogue.test/api/cards');
 assert.equal(options.next.revalidate,60);assert.equal(options.headers,undefined);assert.equal(options.credentials,undefined);
 assert.match(r.headers.get('cache-control'),/s-maxage=60/);assert.equal((await r.json()).cards[0]._id,'album');
 fail=true;const unavailable=await exports.GET();assert.equal(unavailable.status,503);assert.equal(unavailable.headers.get('cache-control'),'no-store');
 fail=false;assert.equal((await exports.GET()).status,200);
});
