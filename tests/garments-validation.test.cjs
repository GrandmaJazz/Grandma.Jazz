const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const filename = 'src/components/admin/garments/issues.ts';
const moduleFixture = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { module: moduleFixture, exports: moduleFixture.exports, require, URL, Set });
const { parseManifest, issueSchema, getLogicalPages } = moduleFixture.exports;
const page = { id: 'fixture-cover', title: 'Cover', alt: 'Fixture artwork', image: '/garments/media/fixture.webp' };
const issue = { id: 'fixture', slug: 'fixture-edition', title: 'Fixture edition', issueNumber: '001',
  publicationDate: '2026-11-27', width: 800, height: 1200, cover: page, pages: [], backCover: { ...page, id: 'fixture-back' } };

test('patched validation accepts existing edition shape and preserves page order and optional fields', () => {
  const result = parseManifest({ logo: null, issues: [issue] });
  assert.equal(result.issues[0].title, issue.title);
  assert.deepEqual(Array.from(getLogicalPages(result.issues[0]), item => item.id), ['fixture-cover', 'fixture-back']);
  assert.equal(result.issues[0].blankColor, undefined);
});

test('edition assets reject executable, insecure and protocol-relative URLs', () => {
  for (const image of ['javascript:alert(1)', 'data:text/html,test', '//untrusted.invalid/a.png', 'http://untrusted.invalid/a.png']) {
    assert.equal(issueSchema.safeParse({ ...issue, cover: { ...page, image } }).success, false, image);
  }
  assert.equal(issueSchema.safeParse({ ...issue, cover: { ...page, image: 'https://cdn.example.invalid/a.webp' } }).success, true);
});

test('enquiry links stay on HTTPS Instagram without accepting lookalike hostnames', () => {
  for (const enquiryUrl of ['https://instagram.com.evil.invalid/', 'https://evil.invalid/?instagram.com', 'http://instagram.com/']) {
    assert.equal(issueSchema.safeParse({ ...issue, enquiryUrl }).success, false);
  }
  assert.equal(issueSchema.safeParse({ ...issue, enquiryUrl: 'https://www.instagram.com/garments_grandmajazz/' }).success, true);
});

test('published manifests reject duplicate slugs, development fixtures and missing artwork', () => {
  assert.throws(() => parseManifest({ logo: null, issues: [issue, issue] }), /Duplicate issue slug/);
  assert.throws(() => parseManifest({ logo: null, issues: [{ ...issue, isDevelopmentFixture: true }] }), /real page artwork/);
  assert.throws(() => parseManifest({ logo: null, issues: [{ ...issue, cover: { ...page, image: undefined } }] }), /real page artwork/);
});
