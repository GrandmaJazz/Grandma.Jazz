const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

function load(filename) {
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
    jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(source, { module, exports: module.exports, URL, require: name => {
    if (name === 'next/link') return ({ children, ...props }) => React.createElement('a', props, children);
    if (name === '@/lib/structuredData' || name === './structuredData') return {
      SITE_URL: 'https://www.grandmajazz.com', serializeJsonLd: value => JSON.stringify(value),
    };
    if (name === './publishedEvents') return { publishedQuiz: () => undefined };
    if (name === './recurringEvents') return {};
    if (name === './quizSeo') return {};
    if (name.startsWith('@/')) return load(`src/${name.slice(2)}.ts`);
    if (name.startsWith('.')) return load(path.join(path.dirname(filename), `${name}.ts`));
    return require(name);
  } });
  return module.exports;
}

const { analogAnnouncement, withEventAnnouncements, isEventAnnouncementPath } = load('src/lib/eventAnnouncements.ts');
const { buildEventListing } = load('src/lib/eventListing.ts');

test('only the standalone announcement uses website chrome; platform and booking routes keep their own', () => {
  for (const path of ['/events/analog-by-beycan-001', '/events/analog-by-beycan-001/']) assert.equal(isEventAnnouncementPath(path), true);
  for (const path of ['/events/', '/events/quiz-session-2026-12-12/', '/events/analog-by-beycan-001/register/', '/events/manage/preview/analog-by-beycan-001/', '/garments/']) assert.equal(isEventAnnouncementPath(path), false);
});

test('announcement lists the approved price and date without presenting booking as open', () => {
  const result = buildEventListing(withEventAnnouncements([]), [], new Date('2026-11-27T00:00:00Z'));
  assert.equal(result.upcoming.length, 1);
  const card = result.upcoming[0];
  assert.equal(card.price, 420);
  assert.equal(card.badge, 'Coming soon');
  assert.equal(card.start, Date.parse('2026-12-12T11:30:00Z'));
  assert.equal(card.end, Date.parse('2026-12-12T14:30:00Z'));
  assert.equal(analogAnnouncement.registration.state, 'closed');
});

test('native event release supersedes the announcement listing without duplicates', () => {
  const native = { ...analogAnnouncement, announcement: false, registration: { state: 'open' } };
  const other = { ...native, slug: 'another-session' };
  const events = withEventAnnouncements([other, native]);
  assert.equal(events.length, 2);
  assert.equal(events.find(event => event.slug === native.slug), native);
});

test('public announcement renders details, closed notice and artwork with no booking or payment controls', () => {
  const page = load('src/app/events/analog-by-beycan-001/page.tsx');
  const html = renderToStaticMarkup(React.createElement(page.default));
  assert.match(html, /Reservations are not open yet/);
  assert.match(html, /Coming soon/);
  assert.match(html, /฿420/);
  assert.match(html, /Limited to 20 guests/);
  assert.match(html, /Family membership will be required/);
  assert.match(html, /85149af1c6f6f7a888ca684837766967.webp/);
  assert.doesNotMatch(html, /href="[^"]*(?:register|booking|luma|promptpay)|<form|<button|"offers"|"isAccessibleForFree":true/i);
  assert.equal(page.metadata.alternates.canonical, '/events/analog-by-beycan-001/');
});
