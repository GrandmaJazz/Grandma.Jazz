const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');

function load(name, fetch = () => { throw new Error('Unexpected network request'); }) {
  const filename = path.join(__dirname, '../src/lib', `${name}.ts`);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(source, {
    module, exports: module.exports, URL, Date, AbortSignal, process: { env: { EVENTS_PLATFORM_ORIGIN: 'https://fixture.invalid' } }, fetch,
    require: value => value === 'react' ? { cache: fn => fn } : load(value.replace('./', ''), fetch),
  }, { filename });
  return module.exports;
}

test('public reader paths accept archived editions and reject fabricated nested pages', () => {
  const { garmentsRoute, eventRoute } = load('publicationRoutes');
  assert.equal(garmentsRoute().canonical, '/garments/');
  assert.equal(garmentsRoute(['archive']).canonical, '/garments/archive/');
  assert.equal(garmentsRoute(['archive', 'edition-1']).canonical, garmentsRoute(['edition-1']).canonical);
  assert.equal(garmentsRoute(['archive', 'edition-1']).archive, true);
  for (const parts of [['edition', 'made-up'], ['archive', 'issue', 'page'], ['manage'], ['..'], ['paper']]) assert.equal(garmentsRoute(parts), null);
  assert.equal(eventRoute(['quiz-session', 'register']).canonical, '/events/quiz-session/');
  assert.equal(eventRoute(['quiz-session', 'register']).registration, true);
  assert.equal(eventRoute(['quiz-session']).registration, false);
  assert.equal(eventRoute(['quiz-session', 'made-up']), null);
  assert.equal(eventRoute(['quiz-session', 'register', 'extra']), null);
});

test('Garments reads published, archived and direct public editions without treating outages as missing content', async () => {
  const requested = [];
  const edition = { slug: 'edition-1', title: 'Found in the Folds', issueNumber: '004', publicationDate: '2026-05-01', cover: { image: '/garments/media/cover.webp' } };
  const { getGarmentsEditions } = load('garmentsSeo', async url => {
    requested.push(url);
    if (url.endsWith('/missing')) return { status: 404, ok: false };
    if (url.endsWith('/outage')) return { status: 503, ok: false };
    return { status: 200, ok: true, json: async () => ({ issues: [edition] }) };
  });
  assert.equal((await getGarmentsEditions())[0].slug, 'edition-1');
  await getGarmentsEditions(true);
  await getGarmentsEditions(false, 'edition-1');
  assert.equal((await getGarmentsEditions(false, 'missing')).length, 0);
  await assert.rejects(getGarmentsEditions(false, 'outage'), /503/);
  assert.deepEqual(requested.slice(0, 3), [
    'https://fixture.invalid/api/garments/issues',
    'https://fixture.invalid/api/garments/issues?archive=1',
    'https://fixture.invalid/api/garments/issues/edition-1',
  ]);
});

test('edition structured data identifies the real publication and cover rather than inventing an offer', () => {
  const { garmentsEditionSchema } = load('garmentsSeo');
  const schema = garmentsEditionSchema({ slug: 'edition-1', title: 'Found in the Folds', issueNumber: '004', publicationDate: '2026-05-01', cover: { image: '/garments/media/cover.webp' } });
  assert.equal(schema.url, 'https://www.grandmajazz.com/garments/edition-1/');
  assert.equal(schema.image, 'https://www.grandmajazz.com/garments/media/cover.webp');
  assert.equal(schema.datePublished, '2026-05-01');
  assert.equal(schema['@type'], 'CreativeWork');
  assert.equal(schema.offers, undefined);
});
