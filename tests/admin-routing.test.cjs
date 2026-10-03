const { test } = require('node:test');
const assert = require('node:assert/strict');
const { needsPageSlash } = require('../src/lib/canonicalPath.cjs');
test('Apple device registration and retrieval reach their authenticated API without a redirect', () => {
  assert.equal(needsPageSlash('/events/api/v1/wallet/apple/v1/devices/device/registrations/pass.type/serial'), false);
  assert.equal(needsPageSlash('/events/api/v1/wallet/apple/v1/passes/pass.type/serial'), false);
});
test('native admin JSON and upload calls do not redirect', () => {
  for (const path of ['/api/admin/members', '/garments/api/auth/current-admin', '/garments/api/manage/uploads', '/events/api/v1/auth/current-admin']) assert.equal(needsPageSlash(path), false);
});
test('public pages keep existing trailing slash URLs and assets retain their filenames', () => {
  assert.equal(needsPageSlash('/events/quiz-session'), true);
  assert.equal(needsPageSlash('/admin/settings'), true);
  for (const path of ['/', '/admin/settings/', '/sitemap.xml', '/assets/reader.js', '/.well-known/apple-app-site-association']) assert.equal(needsPageSlash(path), false);
});

test('Next page prefetches return their component payload directly', () => {
  assert.equal(needsPageSlash('/admin/events', true), false);
  assert.equal(needsPageSlash('/products', true), false);
});
