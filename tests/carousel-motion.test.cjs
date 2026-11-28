const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const vm = require('node:vm');
const exported = {};
const windowEvents = new EventTarget();
let now = 0;
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/carouselMotion.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: exported, window: windowEvents, performance: { now: () => now } });

test('iPhone and desktop-mode iPad keep their rails on the native scroll layer', () => {
  const { usesNativeRailGlide } = exported;
  assert.equal(usesNativeRailGlide('Mozilla/5.0 (iPhone; CPU iPhone OS 18_4 like Mac OS X) CriOS', 'iPhone', 5), true);
  assert.equal(usesNativeRailGlide('Mozilla/5.0 (Macintosh; Intel Mac OS X)', 'MacIntel', 5), true);
  assert.equal(usesNativeRailGlide('Mozilla/5.0 (Macintosh; Intel Mac OS X)', 'MacIntel', 0), false);
  assert.equal(usesNativeRailGlide('Mozilla/5.0 (Linux; Android 15)', 'Linux armv8l', 5), false);
});

test('missing scrollend does not leave the rail stuck after a flick', () => {
  const rail = Object.assign(new EventTarget(), { scrollLeft: 1000, onscrollend: null });
  const handoff = exported.createRailHandoff(rail);
  try {
    now = 100;
    rail.scrollLeft = 945;
    rail.dispatchEvent(new Event('scroll'));
    assert.equal(handoff.ownsPosition(249), true);
    assert.equal(handoff.ownsPosition(260), false);
    assert.equal(handoff.takePosition(), 945);
  } finally { handoff.destroy(); }
});

test('native scrollend releases the rail on the next frame from its actual resting position', () => {
  const rail = Object.assign(new EventTarget(), { scrollLeft: 1000, onscrollend: null });
  const handoff = exported.createRailHandoff(rail);
  const send = (target, type, props) => target.dispatchEvent(Object.assign(new Event(type), props));
  try {
    now = 100;
    send(rail, 'touchstart');
    rail.scrollLeft = 960;
    send(rail, 'scroll');
    send(rail, 'scrollend');
    assert.equal(handoff.ownsPosition(160), true, 'a held touch still controls the rail');
    now = 164;
    send(rail, 'touchend', { targetTouches: [] });
    now = 200;
    rail.scrollLeft = 920;
    send(rail, 'scroll');
    assert.equal(handoff.ownsPosition(270), true, 'wait for the native momentum to finish');
    now = 271;
    rail.scrollLeft = 896;
    send(rail, 'scrollend');
    assert.equal(handoff.ownsPosition(272), false);
    assert.equal(handoff.takePosition(), 896, 'use the final position even before a frame has sampled it');
    assert.equal(handoff.takePosition(), undefined);
    handoff.write(897);
    send(rail, 'scroll');
    send(rail, 'scrollend');
    assert.equal(handoff.ownsPosition(285), false, 'auto-generated events do not restart the wait');
  } finally { handoff.destroy(); }
});

test('wheels and browsers without scrollend settle in a few frames, not a separate pause', () => {
  const rail = Object.assign(new EventTarget(), { scrollLeft: 1000 });
  const handoff = exported.createRailHandoff(rail);
  try {
    now = 100;
    rail.dispatchEvent(new Event('wheel'));
    for (now of [125, 150, 175]) {
      rail.scrollLeft += 6;
      assert.equal(handoff.ownsPosition(now), true);
    }
    assert.equal(handoff.ownsPosition(210), true);
    assert.equal(handoff.ownsPosition(223), false);
    assert.equal(handoff.takePosition(), 1018);
  } finally { handoff.destroy(); }
});

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

test('the takeover gains speed from zero and joins the loop at the same velocity', () => {
  const { railGlideDistance, RAIL_RAMP_MS: duration, AUTO_SCROLL_PX_PER_SECOND: speed } = exported;
  const steady = speed / 1000;
  assert.equal(railGlideDistance(0), 0);
  assert.ok(railGlideDistance(1) < steady / 100);
  assert.ok(Math.abs(railGlideDistance(duration) - steady * duration / 2) < 1e-9);
  for (const fraction of [.25, .5, .75]) {
    const t = duration * fraction;
    assert.ok(Math.abs(railGlideDistance(t + .5) - railGlideDistance(t - .5) - steady * fraction) < 1e-9);
  }
  assert.ok(Math.abs(railGlideDistance(duration) - railGlideDistance(duration - 1) - steady) < .001);
  assert.ok(Math.abs(railGlideDistance(duration + 1) - railGlideDistance(duration) - steady) < 1e-9);
  assert.equal(railGlideDistance(1000, 0), speed);
});

test('native glide preserves fractional motion without transforming the scroll layer', () => {
  const { nativeRailStep, railGlideDistance, RAIL_RAMP_MS: rampMs } = exported;
  for (const hz of [60, 90, 120]) {
    const dt = 1000 / hz;
    let previous = nativeRailStep(2400).precise;
    for (let frame = 1; frame <= hz * 2; frame++) {
      const t = frame * dt;
      const ideal = 2400 + railGlideDistance(t);
      const { left, precise } = nativeRailStep(ideal);
      assert.ok(Number.isInteger(left));
      assert.ok(Math.abs(left - precise) <= 0.5);
      assert.ok(Math.abs(precise - ideal) <= 1 / 128 + 1e-9);
      assert.ok(precise >= previous, `no backward step at ${hz}Hz`);
      if (frame > 1) assert.ok(precise > previous, `movement once the ramp exceeds layout precision at ${hz}Hz`);
      if (t - dt >= rampMs) {
        assert.ok(Math.abs(precise - previous - 62 / hz) < 1 / 64);
      }
      previous = precise;
    }
  }
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

test('image-heavy homepage rail can use pure native iOS scrolling and load images before entering view', () => {
  const featured = fs.readFileSync('src/components/Featured.tsx','utf8');
  const card = fs.readFileSync('src/components/ProductCard.tsx','utf8');
  const rail = fs.readFileSync('src/lib/carouselMotion.ts','utf8');
  assert.match(featured, /nativePaintSafe: true/);
  assert.match(rail, /mobileNative && !options.nativePaintSafe/);
  assert.match(featured, /rootMargin: '500px 0px'/);
  assert.match(featured, /eagerImage=\{mediaNearby\}/);
  assert.match(card, /loading=\{eagerImage \? 'eager' : undefined\}/);
  assert.match(card, /Image unavailable/);
  assert.match(card, /prefetch=\{deferLinkPrefetch \? false : undefined\}/);
});
