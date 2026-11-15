const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const vm = require('node:vm');
const exportsUnderTest = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/pianoPreview.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, { exports: exportsUnderTest });

test('the piano preview clamps, holds and reverses across all four frame sheets', () => {
  const { pianoFrame } = exportsUnderTest;
  assert.equal(pianoFrame(-1).index, 0);
  assert.equal(pianoFrame(2).index, 79);
  assert.equal(pianoFrame(19 / 79).sheet, 0);
  const startOfSecond = pianoFrame(20 / 79);
  assert.equal(startOfSecond.sheet, 1);
  assert.equal(startOfSecond.x, 0);
  assert.equal(startOfSecond.y, 0);
  for (let i = 79; i >= 0; i--) {
    assert.equal(pianoFrame(i / 79).index, i);
  }
});
