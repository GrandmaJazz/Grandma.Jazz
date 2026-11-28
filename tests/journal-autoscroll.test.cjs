const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function fixture() {
  class Hub {
    handlers = new Map();
    addEventListener(type, fn) { this.handlers.set(type, fn); }
    removeEventListener(type) { this.handlers.delete(type); }
    emit(type, event = {}) { this.handlers.get(type)?.(event); }
  }
  const window = new Hub(), document = new Hub(), media = new Hub();
  Object.assign(window, { scrollY: 0, innerHeight: 800, visualViewport: { scale: 1 }, matchMedia: () => media });
  Object.assign(document, { hidden: false, activeElement: null, body: {}, documentElement: { scrollHeight: 10000 }, querySelector: () => null });
  window.getSelection = () => '';
  window.scrollTo = ({ top }) => { window.scrollY = Math.round(top); };
  let now = 0, sequence = 0, enabled = true;
  const frames = new Map(), effects = [], exports = {};
  const react = { useState: () => [true, value => { enabled = typeof value === 'function' ? value(enabled) : value; }], useRef: () => ({ current: null }), useEffect: fn => effects.push(fn) };
  const code = ts.transpileModule(fs.readFileSync('src/components/blog/JournalAutoScroll.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(code, { exports, require: id => id === 'react' ? react : id === 'next/navigation' ? { usePathname: () => '/blogs/' } : { jsx: () => null, jsxs: () => null }, window, document, performance: { now: () => now }, getComputedStyle: () => ({ overflowY: 'visible' }), requestAnimationFrame: fn => { frames.set(++sequence, fn); return sequence; }, cancelAnimationFrame: id => frames.delete(id) });
  exports.default();
  const cleanup = effects[1]();
  const advance = (duration, fps = 60) => {
    const end = now + duration;
    while (now < end) {
      now = Math.min(end, now + 1000 / fps);
      const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(now));
    }
  };
  return { window, document, media, advance, cleanup, frames, enabled: () => enabled };
}
test('journal auto-scroll is refresh-rate independent and preserves fractional movement', () => {
  const slow = fixture(), fast = fixture(), low = fixture(); slow.advance(10000, 60); fast.advance(10000, 120); low.advance(10000, 30);
  assert.ok(slow.window.scrollY > 110); assert.ok(Math.abs(slow.window.scrollY - fast.window.scrollY) <= 2); assert.ok(Math.abs(slow.window.scrollY - low.window.scrollY) <= 2);
});
test('manual scrolling pauses, resumes from the new position and never snaps back', () => {
  const f = fixture(); f.advance(5000); f.window.emit('wheel'); f.window.scrollY = 700;
  f.advance(2500); assert.equal(f.window.scrollY, 700);
  f.advance(2000); assert.ok(f.window.scrollY > 700 && f.window.scrollY < 735);
});
test('a held touch, text editing, selection, hidden tab and zoom do not move the reader', () => {
  for (const reason of ['touch', 'focus', 'selection', 'hidden', 'zoom']) {
    const f = fixture(); f.advance(5000); const y = f.window.scrollY;
    if (reason === 'touch') f.window.emit('touchstart');
    if (reason === 'focus') f.document.activeElement = { matches: () => true };
    if (reason === 'selection') f.window.getSelection = () => 'selected passage';
    if (reason === 'hidden') f.document.hidden = true;
    if (reason === 'zoom') f.window.visualViewport.scale = 2;
    f.advance(5000); assert.equal(f.window.scrollY, y, reason);
    f.cleanup(); assert.equal(f.frames.size, 0);
    assert.equal(f.window.handlers.size, 0);
  }
});
test('end of content stops playback and a reduced-motion change disables it', () => {
  const f = fixture(); f.window.scrollY = 9200; f.advance(3000); assert.equal(f.enabled(), false); assert.equal(f.frames.size, 0);
  const reduced = fixture(); reduced.media.matches = true; reduced.media.emit('change'); assert.equal(reduced.enabled(), false);
});
