const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

// Render the real detail component with fixture API results; no database or email.
function render({ status = 'draft', preview, state = 'closed', error, privateRoute = true } = {}) {
  let query;
  class ApiError extends Error { constructor(status) { super(); this.status = status; } }
  const event = { slug: 'fixture-session', title: 'Fixture session', status,
    heroImagePath: '/events/uploads/fixture.webp', heroImageAlt: 'Fixture cover',
    startsAt: '2026-12-12T11:30:00Z', endsAt: '2026-12-12T14:30:00Z', timezone: 'Asia/Bangkok',
    registration: { state, remaining: 20 }, canonicalUrl: 'https://fixture.invalid/events/fixture-session' };
  const ui = Object.fromEntries(['EventsLayout', 'BrickTile', 'MicroLabel', 'Spinner', 'StateBanner', 'EmptyState']
    .map(name => [name, ({ children }) => React.createElement('div', null, children)]));
  ui.EmptyState = ({ title, children }) => React.createElement('div', null, title, children);
  ui.BrickLinkButton = ({ children, href }) => React.createElement('a', { href }, children);
  ui.BrickButton = ({ children }) => React.createElement('button', null, children);
  const filename = 'apps/grandmajazz-platform/client/src/events/pages/EventDetail.tsx';
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX,
  }}).outputText;
  const module = { exports: {} };
  vm.runInNewContext(source, { module, exports: module.exports, require: name => {
    if (name === 'react') return React;
    if (name === 'react/jsx-runtime') return require(name);
    if (name === 'wouter') return { useRoute: pattern => [true, pattern.includes('/manage/preview/') === privateRoute ? { slug: event.slug } : null] };
    if (name === '@tanstack/react-query') return { useQuery: options => { query = options; return {
      data: error ? undefined : { event, preview }, error: error ? new ApiError(error) : null, isLoading: false,
    }; }};
    if (name === '../api') return { ApiError, api: () => {}, fmtDateTime: () => '12 December 2026, 18:30', fmtTime: () => '21:30' };
    if (name === '../ui') return ui;
    if (name === '@/lib/api') return { apiUrl: value => value };
    throw new Error(`Unexpected import: ${name}`);
  }});
  return { html: renderToStaticMarkup(React.createElement(module.exports.default)), get query() { return query; } };
}

test('private preview resolves the slug and renders artwork without booking or sharing', () => {
  const { html, query } = render({ preview: true, state: 'open' });
  assert.equal(query.queryKey[1], 'fixture-session');
  assert.equal(query.enabled, true);
  assert.match(html, /Private preview/);
  assert.match(html, /src="\/events\/uploads\/fixture.webp"/);
  assert.match(html, /Unpublished draft/);
  assert.doesNotMatch(html, /Reserve your place|>Share<|href="[^\"]*\/register/);
});

test('draft status disables booking even when a preview flag is missing', () => {
  const { html } = render({ state: 'limited' });
  assert.match(html, /Private preview/);
  assert.doesNotMatch(html, /Reserve your place|>Share</);
});

test('published public events retain reservation and sharing actions', () => {
  const { html } = render({ status: 'published', state: 'limited', privateRoute: false });
  assert.match(html, /Reserve your place.*20 left/);
  assert.match(html, /href="\/events\/fixture-session\/register"/);
  assert.match(html, />Share</);
  assert.doesNotMatch(html, /Private preview/);
});

test('API 404 renders a missing event without private event details', () => {
  const { html } = render({ error: 404 });
  assert.match(html, /couldn&#x27;t find that event/);
  assert.doesNotMatch(html, /Fixture session|fixture.webp|Reserve your place|>Share</);
});
