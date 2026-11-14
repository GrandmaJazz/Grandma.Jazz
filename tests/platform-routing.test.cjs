const { test } = require('node:test');
const assert = require('node:assert/strict');
const config = require('../next.config.js');

test('legacy fundraiser and Instagram requests stay on the .com origin with their paths intact', async () => {
  const { beforeFiles } = await config.rewrites();
  for (const section of ['fundraiser', 'instagram']) {
    const route = beforeFiles.find(route => route.source === `/${section}/:path*`);
    assert.ok(route, `${section} has a direct service route`);
    assert.ok(route.destination.endsWith(`/${section}/:path*`));
    assert.match(route.destination, /^https:\/\//);
    assert.ok(!route.destination.includes('grandmajazz.store'));
  }
});

test('email and pass brand images reach the binary asset service before event pages', async () => {
  const { beforeFiles } = await config.rewrites();
  const asset = beforeFiles.findIndex(route => route.source === '/events/assets/:path*');
  const page = beforeFiles.findIndex(route => route.source === '/events/:path+');
  assert.ok(asset >= 0 && asset < page);
  assert.ok(beforeFiles[asset].destination.endsWith('/events/assets/:path*'));
});

test('Garments APIs bypass the GET-only page wrapper before all page routes', async () => {
  const { beforeFiles } = await config.rewrites();
  const api = beforeFiles.findIndex(route => route.source === '/garments/api/:path*');
  const pages = beforeFiles.findIndex(route => route.source === '/garments/:path*');
  assert.ok(api >= 0 && api < pages);
  assert.match(beforeFiles[api].destination, /^https?:\/\//);
  assert.ok(beforeFiles[api].destination.endsWith('/garments/api/:path*'));
  assert.deepEqual(beforeFiles[pages].has, [{ type: 'query', key: 'embedded', value: '1' }]);
});

test('publications retain the persistent music shell while assets and administration remain direct', async () => {
  const { beforeFiles } = await config.rewrites();
  const garments = beforeFiles.find(route => route.source === '/garments/:path*');
  const event = beforeFiles.find(route => route.source === '/events/:path+');
  assert.ok(garments.has && event.has);
  assert.ok(beforeFiles.find(route => route.source === '/garments/:section(brand|paper|materials|media)/:path*').destination.endsWith('/garments/:section/:path*'));
  assert.ok(beforeFiles.find(route => route.source === '/events/:section(manage|platform|t|api)/:path*').destination.endsWith('/events/:section/:path*'));
});

test('the Family iframe uses the current website build before the legacy proxy', async () => {
  const { beforeFiles } = await config.rewrites();
  const local = beforeFiles.findIndex(route => route.source === '/family-wall/');
  const legacy = beforeFiles.findIndex(route => route.source === '/family-wall/:path*');
  assert.ok(local >= 0 && local < legacy);
  assert.equal(beforeFiles[local].destination, '/family-experience/family-wall.html');
  assert.match(beforeFiles[legacy].destination, /^https:\/\//);
  assert.ok(beforeFiles.some(route => route.source === '/api/members/:path*' && /^https:\/\//.test(route.destination)));
  const fs = require('node:fs');
  assert.match(fs.readFileSync('src/lib/externalLinks.ts', 'utf8'), /FAMILY_EMBED_URL = '\/family-wall\/'/);
  assert.ok(!config.redirects);
});

test('Family stylesheet receives shared typography before the iframe catchall, with other assets untouched', async () => {
  const { beforeFiles } = await config.rewrites();
  const css = beforeFiles.findIndex(route => route.source === '/family-wall/assets/:asset([^/]+[.]css)');
  const wall = beforeFiles.findIndex(route => route.source === '/family-wall/:path*');
  assert.ok(css >= 0 && css < wall);
  assert.equal(beforeFiles[css].destination, '/api/platform-styles/:asset?family=1');
  assert.ok(beforeFiles[wall].destination.endsWith('/family-wall/:path*'));
});
