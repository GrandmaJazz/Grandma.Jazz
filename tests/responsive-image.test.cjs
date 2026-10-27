const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const manifest = { 'https://example.test/current.jpg': { base: '/images/responsive/current', widths: [160,320,640,1200], width:1200,height:1200 } };
const exportsUnderTest = {};
vm.runInNewContext(ts.transpileModule(readFileSync('src/components/ResponsiveImage.tsx','utf8'), { compilerOptions:{ module:ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2022, jsx:ts.JsxEmit.ReactJSX, esModuleInterop:true } }).outputText, { exports:exportsUnderTest, require: name => name === '@/lib/responsive-images.json' ? manifest : require(name) });
const Image = exportsUnderTest.default;
test('known photos render responsive files in the server HTML with correct loading priority', () => {
  const html = renderToStaticMarkup(React.createElement(Image,{src:'https://example.test/current.jpg',alt:'Product',fill:true,sizes:'50vw',priority:true}));
  assert.match(html,/srcSet="[^\"]+160w[^\"]+320w[^\"]+640w[^\"]+1200w/);
  assert.match(html,/sizes="50vw"/); assert.match(html,/loading="eager"/); assert.match(html,/fetchpriority="high"/); assert.match(html,/position:absolute/);
  assert.doesNotMatch(html,/_next\/image/);
});
test('a newly uploaded CMS URL retains its own original instead of serving a stale mapped photo', () => {
  const html = renderToStaticMarkup(React.createElement(Image,{src:'https://example.test/new.jpg',alt:'New product',width:80,height:80}));
  assert.match(html,/src="https:\/\/example.test\/new.jpg"/);assert.doesNotMatch(html,/srcSet=/);assert.match(html,/loading="lazy"/);
});
test('every responsive manifest candidate decodes with the advertised width', async () => {
  const real = JSON.parse(readFileSync('src/lib/responsive-images.json','utf8'));
  assert.ok(Object.keys(real).length >= 80);
  for(const entry of Object.values(real)) for(const width of entry.widths) {
    const file = `public${entry.base}-${width}.webp`;
    assert.ok(existsSync(file), file);
    const metadata = await require('sharp')(file).metadata(); assert.equal(metadata.width, width, file);
  }
});
