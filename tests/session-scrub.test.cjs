const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const vm = require('node:vm');

const code = ts.transpileModule(fs.readFileSync('src/lib/sessionScrub.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;

test('piano frames advance and rewind with scroll and clamp to the playable range', () => {
  const exports = {};
  vm.runInNewContext(code, { exports });
  const time = y => exports.sessionScrubTime(y, 800, 4);
  assert.equal(time(800), 0);
  assert.ok(time(520) < time(400));
  assert.ok(time(400) < time(280));
  assert.equal(time(-100), 95 / 24);
  assert.equal(time(0), time(-100));
  assert.equal(time(400) * 24 % 1, 0);
});

test('seeking uses the latest scroll position and stops offscreen or after cleanup', () => {
  const exports = {}, jobs = new Map();
  const window = Object.assign(new EventTarget(), { innerHeight: 800 });
  const document = Object.assign(new EventTarget(), { hidden: false });
  let jobId = 0, report;
  vm.runInNewContext(code, {
    exports, window, document,
    requestAnimationFrame: fn => { jobs.set(++jobId, fn); return jobId; },
    cancelAnimationFrame: id => jobs.delete(id),
    IntersectionObserver: class {
      constructor(fn) { report = visible => fn([{ isIntersecting: visible }]); }
      observe() {}
      disconnect() {}
    },
  });
  const flush = () => { const pending = [...jobs.values()]; jobs.clear(); pending.forEach(fn => fn()); };
  let top = 420;
  const frame = { getBoundingClientRect: () => ({ top, height: 300 }) };
  const player = Object.assign(new EventTarget(), { duration: 4, currentTime: 0, seeking: false });
  const stop = exports.attachSessionScrub(frame, player);
  report(true);
  flush();
  const first = player.currentTime;
  assert.ok(first > 0);
  top = 150;
  player.seeking = true;
  window.dispatchEvent(new Event('scroll'));
  flush();
  assert.equal(player.currentTime, first);
  top = 200;
  window.dispatchEvent(new Event('scroll'));
  player.seeking = false;
  player.dispatchEvent(new Event('seeked'));
  flush();
  assert.equal(player.currentTime, exports.sessionScrubTime(350, 800, 4));
  top = 420;
  window.dispatchEvent(new Event('scroll'));
  flush();
  assert.equal(player.currentTime, first, 'up reverses to the same frame');
  report(false);
  window.dispatchEvent(new Event('scroll'));
  assert.equal(jobs.size, 0);
  stop();
  window.dispatchEvent(new Event('resize'));
  assert.equal(jobs.size, 0);
});
