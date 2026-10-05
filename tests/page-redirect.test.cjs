const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const ts = require('typescript');
const { NextURL } = require('next/dist/server/web/next-url');

const filename = path.resolve(__dirname, '../src/middleware.ts');
const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const moduleExports = {};
const requireFromMiddleware = createRequire(filename);
vm.runInNewContext(output, {
  exports: moduleExports,
  // Load the actual response implementation without unrelated next/server exports.
  require: (id) => id === 'next/server'
    ? { NextResponse: require('next/dist/server/web/spec-extension/response').NextResponse }
    : requireFromMiddleware(id),
  URL,
});
const { middleware } = moduleExports;
function request(url, rsc = false) {
  return {
    url,
    nextUrl: new NextURL(url, { nextConfig: { trailingSlash: true } }),
    headers: new Headers(rsc ? { rsc: '1' } : {}),
  };
}

test('affected page URLs redirect once to the slash URL, preserving query strings', () => {
  for (const pathname of [
    '/blogs',
    '/blogs/how-we-help-you-choose',
    '/blogs/garments-why-wearing-second-hand-clothing-still-makes-sense',
    '/products',
  ]) {
    const input = 'https://www.grandmajazz.com' + pathname + '?source=search';
    const response = middleware(request(input));
    const target = 'https://www.grandmajazz.com' + pathname + '/?source=search';
    assert.equal(response.status, 308);
    assert.equal(response.headers.get('location'), target);
    assert.notEqual(response.headers.get('location'), input);
    assert.equal(middleware(request(target)).headers.get('location'), null);
  }
});

test('API, static, canonical and RSC requests are not redirected', () => {
  for (const pathname of [
    '/',
    '/blogs/',
    '/robots.txt',
    '/api/members/join',
    '/events/api/v1/wallet/apple/v1/devices/device/registrations/pass.type/serial',
    '/garments/api/items',
  ]) {
    assert.equal(middleware(request('https://www.grandmajazz.com' + pathname)).headers.get('location'), null);
  }
  assert.equal(middleware(request('https://www.grandmajazz.com/blogs', true)).headers.get('location'), null);
});
