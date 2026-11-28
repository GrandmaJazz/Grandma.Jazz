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

test('Family save offers a real PNG to native sharing and keeps the download fallback', () => {
  const home = fs.readFileSync('apps/grandmajazz-platform/client/src/family-original/pages/home.tsx','utf8');
  const welcome = fs.readFileSync('apps/grandmajazz-platform/client/src/family-original/components/WelcomeBrick.tsx','utf8');
  assert.match(home, /new File\(\[blob\],name,\{type:"image\/png"\}\)/);
  assert.match(home, /navigator\.canShare\(payload\)/);
  assert.match(home, /navigator\.share\(payload\)/);
  assert.match(home, /navigator\.userActivation/);
  assert.match(home, /link\.download = file\.name/);
  assert.match(home, /error\.name === "AbortError"/);
  assert.match(home, /!arrivalActive && !integrationPlayed\.current && !savingBrick/);
  assert.match(welcome, /bindFamilyIdleArrival\(document,window,start,5000,interrupt\)/);
  assert.match(welcome, /rest\(0\);onAutoIntegrate\(\)/);
  assert.match(welcome, /gj-cta--icon welcome-instagram/);
  assert.match(welcome, /aria-label="Grandma Jazz on Instagram"/);
});

test('Family arrival retains its real welcome face through isolation and measures its projected bounds before flight',()=>{
  const root='apps/grandmajazz-platform/client/src/family-original/';
  const home=fs.readFileSync(root+'pages/home.tsx','utf8');
  const css=fs.readFileSync(root+'family-theme.css','utf8');
  const welcome=fs.readFileSync(root+'components/WelcomeBrick.tsx','utf8');
  const fly=home.slice(home.indexOf('const fly = () =>'),home.indexOf('const skip = () =>'));
  assert.ok(fly.indexOf('face?.getBoundingClientRect()') < fly.indexOf('setShowWallOnly(true)'));
  assert.match(fly,/setFlightSource\(source\)/);
  assert.match(fly,/setArrivalMember\(arrival.member\)/);
  assert.match(home,/flightSource && arrivalPhase!=="isolate"/);
  assert.doesNotMatch(css,/\[data-arrival-phase="isolate"\] \.welcome-brick-host \{ visibility:hidden/);
  assert.match(css,/family-arrival-ui-out 800ms/);
  assert.match(welcome,/isolating\?:boolean/);
  const finish=home.slice(home.indexOf('const finish = () =>'),home.indexOf('const reveal = () =>'));
  assert.doesNotMatch(finish,/animation\?\.cancel\(\)/);
});
