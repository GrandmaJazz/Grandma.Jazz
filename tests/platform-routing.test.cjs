const { test } = require('node:test');
const assert = require('node:assert/strict');
const config = require('../next.config.js');

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

test('the cloned family wall stays on .com without redirecting its iframe into its parent', async () => {
  const { beforeFiles } = await config.rewrites();
  const wall = beforeFiles.find(route => route.source === '/family-wall/:path*');
  assert.ok(wall);
  assert.ok(wall.destination.endsWith('/family-wall/:path*'));
  const fs = require('node:fs');
  assert.match(fs.readFileSync('src/lib/externalLinks.ts', 'utf8'), /FAMILY_EMBED_URL = '\/family-wall\/'/);
  assert.ok(!config.redirects);
});
