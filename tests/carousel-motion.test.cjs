const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const vm = require('node:vm');
const exported = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/carouselMotion.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: exported });

test('looping retains the visible card phase across either end and long native swipes', () => {
  const width = 1234.5;
  for (const position of [-3000, -0.5, 0, 750.25, width, width * 2, width * 7 + 0.75]) {
    const wrapped = exported.wrapRailPosition(position, width);
    assert.ok(wrapped >= width && wrapped < width * 2);
    const setsMoved = (wrapped - position) / width;
    assert.ok(Math.abs(setsMoved - Math.round(setsMoved)) < 1e-9);
  }
});
test('the loop seam keeps subpixel motion and waits for a measured width', () => {
  assert.equal(exported.wrapRailPosition(1999.75, 1000), 1999.75);
  assert.equal(exported.wrapRailPosition(2000.25, 1000), 1000.25);
  assert.equal(exported.wrapRailPosition(42.5, 0), 42.5);
});
