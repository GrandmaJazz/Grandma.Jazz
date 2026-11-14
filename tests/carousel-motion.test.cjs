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

test('website swipe marker uses the exact supplied Family brick contour', () => {
  const canonical = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('shared/site/brickSilhouette.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: canonical });
  const original = fs.readFileSync('apps/grandmajazz-platform/shared/family-original/brickArtwork.ts', 'utf8');
  const frameLine = original.split('\n').find(line => line.startsWith('export const BRICK_FRAME = '));
  const frame = JSON.parse(frameLine.slice('export const BRICK_FRAME = '.length).replace(/;$/, ''));
  const outline = frame.match(/<g fill="#000"><path d="([^"]+)" transform="translate\(([^,]+),([^)]+)\)"/);
  assert.equal(canonical.BRICK_SILHOUETTE.path, outline[1]);
  assert.equal(canonical.BRICK_SILHOUETTE.translateX, Number(outline[2]));
  assert.equal(canonical.BRICK_SILHOUETTE.translateY, Number(outline[3]));
  assert.equal(canonical.BRICK_SILHOUETTE.width / canonical.BRICK_SILHOUETTE.height, 5000 / 1630);
});

test('held direction has a neutral centre and rises steadily to full speed', () => {
  const { railDrive } = exported;
  assert.equal(railDrive(0), 0);
  assert.equal(railDrive(0.05), 0);
  assert.equal(railDrive(1), 1);
  assert.equal(railDrive(-2), -1);
  assert.ok(railDrive(0.12) > 0 && railDrive(0.12) < railDrive(0.6));
  assert.equal(railDrive(-0.6), -railDrive(0.6));
});
