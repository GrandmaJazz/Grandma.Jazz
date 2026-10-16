const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const THREE = require('three');

function load(path, imports) {
  const exports = {};
  const source = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, { exports, require: name => imports[name] });
  return exports;
}

test('all current albums resolve their own ink colour without an artwork request', () => {
  const { getAlbumAccentColor } = load('src/lib/albumArtwork.ts', {
    '@/utils/fileHelper': { getOptimizedImageUrl: url => url },
  });
  const colours = ['4ccf343a498659', '62b22d7cd1e4e2', 'a8b97e29ae6f36',
    'e2f7c781c855de', 'ffbed2540eb424', '965f3b262e52c6'].map(id =>
    getAlbumAccentColor(`/images/records/${id}.webp`));
  assert.equal(new Set(colours).size, 6);
  assert.deepEqual(colours, ['#88bce8', '#cc0478', '#f2f2f2', '#0159fa', '#ec6601', '#019457']);
  assert.equal(getAlbumAccentColor(), '#B49B73');
});

test('needle and album label share live uniforms without replacing the vinyl or hardware maps', () => {
  const { applyRecordAccent } = load('src/lib/recordAccent.ts', { three: THREE });
  const accent = { value: new THREE.Color('#0159fa') };
  const artwork = { value: new THREE.Texture() };
  const materials = ['Bits', 'Tube010__0'].map(name => new THREE.MeshStandardMaterial({
    name, map: new THREE.Texture(), normalMap: new THREE.Texture(), roughness: 0.6, metalness: 0.3,
  }));
  const shaders = [];
  for (const material of materials) {
    const map = material.map, normal = material.normalMap;
    applyRecordAccent(material, accent, artwork);
    const version = material.version;
    const shader = { uniforms: {}, fragmentShader: '#include <map_fragment>' };
    material.onBeforeCompile(shader, {});
    shaders.push(shader);
    applyRecordAccent(material, accent, artwork);
    assert.equal(material.version, version, 'repeated setup must not trigger recompilation');
    assert.equal(material.map, map);
    assert.equal(material.normalMap, normal);
    assert.equal(material.roughness, 0.6);
    assert.equal(material.metalness, 0.3);
  }
  accent.value.set('#ec6601');
  const nextCover = new THREE.Texture();
  artwork.value = nextCover;
  for (const shader of shaders) {
    assert.equal(shader.uniforms.gjRecordAccent, accent);
    assert.equal(shader.uniforms.gjRecordAccent.value.getHexString(), 'ec6601');
  }
  assert.equal(shaders[1].uniforms.gjRecordArtwork, artwork);
  assert.equal(shaders[1].uniforms.gjRecordArtwork.value, nextCover);
  assert.equal(shaders[0].uniforms.gjRecordArtwork, undefined, 'needle needs no additional sampler');
  const deck = new THREE.MeshStandardMaterial({ name: 'Main' });
  const originalHook = deck.onBeforeCompile;
  applyRecordAccent(deck, accent, artwork);
  assert.equal(deck.onBeforeCompile, originalHook, 'deck and other hardware keep their original colour');
});

test('both needle-drop and spinning assets retain the recolourable material contract', () => {
  for (const filename of ['music_in_fix2_webp_v2_1.glb', 'modern_turntable_webp_1.glb']) {
    const glb = readFileSync(`public/models/${filename}`);
    const model = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString());
    for (const name of ['Bits', 'Tube010__0']) {
      const material = model.materials.find(item => item.name === name);
      assert.ok(material?.pbrMetallicRoughness?.baseColorTexture, `${filename}: ${name}`);
    }
  }
});
