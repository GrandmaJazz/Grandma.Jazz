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
