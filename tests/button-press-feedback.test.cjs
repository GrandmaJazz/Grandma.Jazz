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
    emit(type, values = {}) { this.handlers.get(type)?.({ pointerId: 1, pointerType: 'touch', isPrimary: true, clientX: 10, clientY: 20, ...values }); }
  }
  class Button {
    attributes = new Map();
    constructor(disabled = false) { this.disabled = disabled; }
    closest() { return this; }
    matches() { return this.disabled; }
    setAttribute(name, value) { this.attributes.set(name, value); }
    removeAttribute(name) { this.attributes.delete(name); }
  }
  const root = new Hub(); root.defaultView = new Hub();
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync('shared/site/buttonPressFeedback.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { exports, Element: Button });
  const cleanup = exports.bindButtonPressFeedback(root);
  const button = new Button();
  return { root, button, Button, cleanup, pressed: target => target.attributes.get('data-touch-pressed') === 'true' };
}

test('a touch press highlights its CTA and releases without retaining hover', () => {
  const f = fixture(); f.root.emit('pointerdown', { target: f.button });
  assert.equal(f.pressed(f.button), true);
  f.root.emit('pointerup'); assert.equal(f.pressed(f.button), false);
});

test('scrolling, cancellation and losing the window clear pressed feedback', () => {
  for (const end of ['move', 'cancel', 'blur']) {
    const f = fixture(); f.root.emit('pointerdown', { target: f.button });
    if (end === 'move') f.root.emit('pointermove', { clientY: 40 });
    if (end === 'cancel') f.root.emit('pointercancel');
    if (end === 'blur') f.root.defaultView.emit('blur');
    assert.equal(f.pressed(f.button), false, end);
  }
});

test('disabled CTAs and mouse hover do not gain synthetic touch feedback', () => {
  const f = fixture(), disabled = new f.Button(true);
  f.root.emit('pointerdown', { target: disabled }); assert.equal(f.pressed(disabled), false);
  f.root.emit('pointerdown', { target: f.button, pointerType: 'mouse' }); assert.equal(f.pressed(f.button), false);
});

test('another pointer cannot release the active press and cleanup removes feedback and listeners', () => {
  const f = fixture(); f.root.emit('pointerdown', { target: f.button });
  f.root.emit('pointerup', { pointerId: 2 }); assert.equal(f.pressed(f.button), true);
  f.cleanup(); assert.equal(f.pressed(f.button), false);
  assert.equal(f.root.handlers.size, 0); assert.equal(f.root.defaultView.handlers.size, 0);
});

test('branded button glow is shared by the website, Family and platform builds', () => {
  const read = path => fs.readFileSync(path, 'utf8');
  const css = read('shared/site/buttons.css');
  assert.match(css, /@keyframes gj-icon-breathe/);
  assert.match(css, /@keyframes gj-footer-brand-breathe/);
  assert.match(css, /@keyframes gj-footer-colour-breathe/);
  assert.match(css, /prefers-reduced-motion: no-preference/);
  assert.match(css, /data-touch-pressed="true"/);
  for (const entry of ['src/app/layout.tsx','apps/grandmajazz-platform/client/src/family-wall.tsx','apps/grandmajazz-platform/client/src/main.tsx']) {
    assert.match(read(entry), /shared\/site\/buttons\.css/, entry);
  }
  for (const file of ['shared/site/Footer.tsx','apps/grandmajazz-platform/client/src/family-original/components/WelcomeBrick.tsx','apps/grandmajazz-platform/client/src/garments/GarmentsPage.tsx','src/app/orders/[id]/page.tsx']) {
    assert.match(read(file), /<InstagramButtonLogo\b/, file);
  }
  assert.match(read('shared/site/InstagramButtonLogo.tsx'), /linearGradient/);
  assert.doesNotMatch(read('src/app/globals.css'), /@keyframes gj-icon-breathe/);
});
