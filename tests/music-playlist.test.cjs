const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const exportsObject = {};
vm.runInNewContext(ts.transpileModule(readFileSync('src/lib/musicPlaylist.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: exportsObject, require: () => ({ getAlbumTitle: (_image, title) => title }) });
const { musicPlaylist, restoreMusicSelection } = exportsObject;
const primary = { _id: 'v2', title: 'Saturday Sessions - Grandmas Hands - Revised Audition', filePath: 'approved-v2.mp3' };
const bonus = { _id: 'bonus', title: 'Saturday Sessions - Sax Solo (Bonus)', filePath: 'approved-sax.mp3' };
const album = { _id: 'saturday', title: 'Saturday Sessions', imagePath: 'cover.png', music: [bonus, primary] };

test('Saturday Sessions always opens with V2 and plays the sax bonus second', () => {
  for (let i = 0; i < 20; i++) assert.equal(musicPlaylist(album).map(track => track._id).join(','), 'v2,bonus');
  assert.equal(album.music[0], bonus, 'catalogue order is not mutated');
});

test('a returning visitor gets replacement tracks instead of a retired placeholder', () => {
  const restored = restoreMusicSelection([album], 'saturday', 'retired-placeholder');
  assert.equal(restored.trackIndex, 0);
  assert.equal(restored.playlist[0], primary);
  assert.equal(restored.card, album);
});

test('an existing bonus selection resolves by ID after catalogue order changes', () => {
  const restored = restoreMusicSelection([album], 'saturday', 'bonus');
  assert.equal(restored.playlist[restored.trackIndex], bonus);
});

test('removed or empty albums do not restore stale audio', () => {
  assert.equal(restoreMusicSelection([], 'saturday', 'v2'), null);
  assert.equal(restoreMusicSelection([{ ...album, music: [] }], 'saturday', 'v2'), null);
});
