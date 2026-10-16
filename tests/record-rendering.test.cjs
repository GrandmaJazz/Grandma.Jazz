const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const crypto=require('node:crypto');
const ts=require('typescript');
const THREE=require('three');
function helpers(three=THREE){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/recordRendering.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:()=>three});return exports;}

test('record rendering resolves Retina phones while bounding large-screen pixel work',()=>{
 const {recordPixelRatio}=helpers();
 assert.equal(recordPixelRatio(390,844,3),3);
 assert.equal(recordPixelRatio(390,844,2),2);
 assert.equal(recordPixelRatio(1440,900,2),2);
 for(const [width,height,dpr]of [[430,932,3],[768,1024,3],[2560,1440,3]]){
  const ratio=recordPixelRatio(width,height,dpr);
  assert.ok(width*height*ratio*ratio <= (width<640?3200000:6000000)+1);
 }
 assert.equal(recordPixelRatio(0,0,0),1);
});

test('every moving surface uses trilinear mipmaps and bounded anisotropic sampling',()=>{
 const {filterRecordTexture}=helpers();
 for(const capability of [1,4,16]){
  const texture=new THREE.Texture();filterRecordTexture(texture,capability);
  assert.equal(texture.generateMipmaps,true);
  assert.equal(texture.minFilter,THREE.LinearMipmapLinearFilter);
  assert.equal(texture.magFilter,THREE.LinearFilter);
  assert.equal(texture.anisotropy,Math.min(8,capability));
 }
});

test('needle and spin share one decode and one texture until the entire scene is disposed',async()=>{
 const calls=[];
 class Loader {load(url,onLoad,onProgress,onError){const texture=new THREE.Texture();calls.push({url,onLoad,onError,texture});return texture;}}
 const {SharedRecordTextureLoader}=helpers({...THREE,TextureLoader:Loader});
 const loader=new SharedRecordTextureLoader();const loaded=[];
 const needle=loader.load('/surface.webp',t=>loaded.push(t));
 const spin=loader.load('/surface.webp',t=>loaded.push(t));
 assert.equal(calls.length,1);assert.equal(needle,spin);assert.ok(loader.owns(spin));
 calls[0].onLoad(needle);await Promise.resolve();
 assert.equal(loaded.length,2);assert.equal(loaded[0],loaded[1]);
 let releases=0;needle.addEventListener('dispose',()=>releases++);
 assert.equal(releases,0,'handing the texture to the second stage must retain it');
 loader.dispose();loader.dispose();assert.equal(releases,1,'the scene owns one release');
});

test('a failed shared image can retry rather than retaining a poisoned promise',async()=>{
 const calls=[];
 class Loader {load(url,onLoad,onProgress,onError){const texture=new THREE.Texture();calls.push({onLoad,onError,texture});return texture;}}
 const {SharedRecordTextureLoader}=helpers({...THREE,TextureLoader:Loader});
 const loader=new SharedRecordTextureLoader();let error;
 loader.load('/surface.webp',undefined,undefined,e=>error=e);
 calls[0].onError(new Error('offline'));await Promise.resolve();assert.equal(error.message,'offline');
 loader.load('/surface.webp',()=>{});assert.equal(calls.length,2);calls[1].onLoad(calls[1].texture);await Promise.resolve();loader.dispose();
});

test('full-detail models preserve original mesh/animation counts and share the same original image bytes',()=>{
 const imageSets=[];
 for(const [phase,meshes,tracks]of [['needle',7,15],['spin',6,2]]){
  const b=fs.readFileSync(`public/models/record-quality-v1/${phase}.glb`);
  assert.equal(b.readUInt32LE(8),b.length);
  const j=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));
  assert.equal(j.meshes.length,meshes);assert.equal(j.animations[0].channels.length,tracks);
  for(const view of j.bufferViews)assert.ok((view.byteOffset||0)+view.byteLength<=j.buffers[0].byteLength);
  for(const a of j.accessors)if(a.bufferView!==undefined)assert.ok(j.bufferViews[a.bufferView]);
  for(const image of j.images){
   const bytes=fs.readFileSync(`public/models/record-quality-v1/${image.uri}`);
   assert.equal(image.uri,`surface-${crypto.createHash('sha256').update(bytes).digest('hex').slice(0,16)}.webp`);
  }
  imageSets.push(j.images.map(i=>i.uri).sort());
 }
 assert.deepEqual(imageSets[0],imageSets[1]);assert.equal(imageSets[0].length,10);
});


test('restoring the complete platter keeps the close deck framing',()=>{
 const {recordFramingBox}=helpers();
 const scene=new THREE.Group(),deck=new THREE.Mesh(new THREE.BoxGeometry(2,1,2)),lip=new THREE.Mesh(new THREE.BoxGeometry(3,1,3));
 deck.name='EXPORT_Main_0';lip.name='Object035_Main_0_001';scene.add(deck,lip);
 assert.equal(recordFramingBox(scene).getSize(new THREE.Vector3()).x,2);
 assert.equal(new THREE.Box3().setFromObject(scene).getSize(new THREE.Vector3()).x,3);
 assert.ok(scene.children.includes(lip),'framing must not remove the restored geometry');
});
