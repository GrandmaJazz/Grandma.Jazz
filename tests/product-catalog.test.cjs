const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function catalog(fetch) {
  const exports = {};
  const source = ts.transpileModule(readFileSync('src/lib/productCatalog.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, { exports, fetch, AbortSignal,
    process: { env: { NEXT_PUBLIC_API_URL: 'https://shop.test' } },
    require: () => ({ cache: fn => fn }) });
  return exports;
}

test('a missing product is a 404 but a shop outage is not disguised as missing stock', async () => {
  let calls = 0;
  const missing = catalog(async () => { calls++; return new Response('{}', { status: 404 }); });
  assert.equal(await missing.getProduct('invalid'), null);
  assert.equal(calls, 0);
  assert.equal(await missing.getProduct('a'.repeat(24)), null);
  const unavailable = catalog(async () => new Response('{}', { status: 503 }));
  await assert.rejects(unavailable.getProduct('a'.repeat(24)), /503/);
});

test('product catalogue responses may be cached briefly while retaining price and stock facts', async () => {
  const product = { _id: 'a'.repeat(24), name: 'Hand fan', price: 5, isOutOfStock: true };
  const api = catalog(async (url, options) => {
    assert.equal(url, `https://shop.test/api/products/${product._id}`);
    assert.equal(options.next.revalidate, 300);
    assert.equal(options.cache, undefined);
    assert.ok(options.signal);
    return new Response(JSON.stringify({ product }));
  });
  const result = await api.getProduct(product._id);
  assert.equal(result.price, 5);
  assert.equal(result.isOutOfStock, true);
});

test('optional related recommendations cannot turn an available product into a page failure', async () => {
  const unavailable = catalog(async () => { throw new Error('Recommendations unavailable'); });
  const related = await unavailable.getRelatedProducts({ _id: 'a'.repeat(24), category: 'merchandise' });
  assert.equal(related.length, 0);
});
