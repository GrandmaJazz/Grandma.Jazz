const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function moduleFrom(filename, requireModule, globals = {}) {
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(source, { module, exports: module.exports, require: requireModule, Date, ...globals });
  return module.exports;
}

const announcements = moduleFrom('src/lib/eventAnnouncements.ts', name => { throw new Error(`Unexpected import ${name}`); });

function sitemapWith(events, failure) {
  return moduleFrom('src/app/sitemap.ts', name => {
    if (name === '@/lib/eventAnnouncements') return announcements;
    if (name === '@/lib/publishedEvents') return { getPublishedEvents: async strict => {
      assert.equal(strict, true);
      if (failure) throw failure;
      return events;
    } };
    if (name === '@/lib/garmentsSeo') return { getGarmentsEditions: async () => [] };
    if (name === '@/lib/publicBlogs') return { getPublishedBlogs: async () => [] };
    throw new Error(`Unexpected import ${name}`);
  }, { process: { env: { NEXT_PUBLIC_API_URL: 'https://fixture.invalid' } },
    fetch: async () => ({ ok: true, json: async () => ({ products: [] }) }), console,
  }).default;
}

test('sitemap discovers the approved announcement while the booking record stays private', async () => {
  const routes = await sitemapWith([{ slug: 'quiz-session-2026-11-28' }])();
  const urls = routes.map(route => route.url);
  assert.equal(urls.filter(url => url === 'https://www.grandmajazz.com/events/analog-by-beycan-001/').length, 1);
  assert.ok(urls.includes('https://www.grandmajazz.com/events/quiz-session-2026-11-28/'));
  assert.ok(urls.includes('https://www.grandmajazz.com/family/'));
  for (const url of urls) assert.doesNotMatch(url, /\/admin|\/register|\/manage|calendar[.]ics/);
});

test('native publication and announcement never duplicate the canonical event URL', async () => {
  const routes = await sitemapWith([{ slug: 'analog-by-beycan-001' }])();
  assert.equal(routes.filter(route => route.url === 'https://www.grandmajazz.com/events/analog-by-beycan-001/').length, 1);
});

test('upstream event outages keep their existing error rather than silently removing native event URLs', async () => {
  await assert.rejects(sitemapWith([], new Error('Event source unavailable')), /Event source unavailable/);
});
