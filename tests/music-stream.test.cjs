const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(path, globals) {
  const exports = {};
  const source = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, { exports, URL, Headers, Response, ...globals });
  return exports;
}

const media = 'https://grandma-jazz-uploads.s3.ap-southeast-2.amazonaws.com/cards/test.mp3';
test('music proxy preserves partial streaming and never forwards session credentials', async () => {
  let call;
  const route = load('src/app/api/music-stream/route.ts', { fetch: async (url, options) => {
    call = { url, options };
    return new Response(new Uint8Array([1, 2, 3]), { status: 206, headers: {
      'Content-Range': 'bytes 0-2/100', 'Accept-Ranges': 'bytes', 'Content-Type': 'audio/mpeg',
    } });
  } });
  const response = await route.GET(new Request(`https://example.test/api/music-stream/?src=${encodeURIComponent(media)}`, {
    headers: { range: 'bytes=0-2', cookie: 'private-session', authorization: 'Bearer private-token' },
  }));
  assert.equal(response.status, 206);
  assert.equal(response.headers.get('content-range'), 'bytes 0-2/100');
  assert.deepEqual([...new Uint8Array(await response.arrayBuffer())], [1, 2, 3]);
  assert.equal(call.options.headers.get('range'), 'bytes=0-2');
  assert.equal(call.options.headers.has('cookie'), false);
  assert.equal(call.options.headers.has('authorization'), false);
  assert.equal(call.options.redirect, 'error');
});

test('music proxy rejects arbitrary hosts, credentials and non-audio objects', async () => {
  const route = load('src/app/api/music-stream/route.ts', { fetch: () => { throw new Error('must not fetch'); } });
  for (const src of ['http://127.0.0.1/private.mp3', media.replace('/test.mp3', '/test.png'),
    media.replace('https://', 'https://user:secret@'), media.replace('.amazonaws.com', '.amazonaws.com.evil.test')]) {
    assert.equal((await route.GET(new Request(`https://example.test/?src=${encodeURIComponent(src)}`))).status, 400);
  }
});

test('stream gain controls iOS audio independently of native volume and caps output at 80%', async () => {
  const calls = [];
  const audio = {
    paused: true, currentTime: 0, duration: 100, volume: 1,
    addEventListener() {}, removeEventListener() {}, load() {}, removeAttribute() {},
    play() { calls.push('play'); this.paused = false; return Promise.resolve(); },
    pause() { this.paused = true; },
  };
  const gain = { gain: { value: 0, cancelScheduledValues() {}, setTargetAtTime(value) { this.value = value; } },
    connect(node) { calls.push(['gain-output', node]); }, disconnect() { calls.push('gain-disconnected'); } };
  const destination = {};
  let sourceCount = 0;
  class Context {
    state = 'suspended'; currentTime = 0; destination = destination;
    resume() { calls.push('resume'); this.state = 'running'; return Promise.resolve(); }
    createMediaElementSource(element) {
      sourceCount++;
      assert.equal(element.crossOrigin, 'anonymous');
      assert.equal(element.src, undefined);
      return { connect(node) { assert.equal(node, gain); }, disconnect() { calls.push('source-disconnected'); } };
    }
    createGain() { return gain; }
  }
  const { StreamingMusic } = load('src/lib/streamingMusic.ts', { window: { AudioContext: Context }, Audio: function () { return audio; } });
  const noop = () => {};
  const sound = new StreamingMusic({ src: media, volume: 0.5, loop: true,
    onload: noop, onplay: noop, onpause: noop, onstop: noop, onend: noop, onerror: noop });
  sound.play();
  assert.deepEqual(calls.slice(-2), ['resume', 'play']);
  for (const [requested, expected] of [[0.05, 0.05], [0, 0], [0.8, 0.8], [1, 0.8], [NaN, 0]]) {
    sound.volume(requested);
    assert.equal(gain.gain.value, expected);
    assert.equal(audio.volume, 1);
  }
  sound.unload();
  assert.equal(audio.paused, true);
  assert.ok(calls.includes('gain-disconnected') && calls.includes('source-disconnected'));
  const replacement = new StreamingMusic({ src: media, volume: 1, loop: true,
    onload: noop, onplay: noop, onpause: noop, onstop: noop, onend: noop, onerror: noop });
  assert.equal(sourceCount, 1, 'reuse the unlocked media element without creating a second source node');
  assert.equal(gain.gain.value, 0.8);
  replacement.unload();
});
