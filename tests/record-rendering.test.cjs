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

// Parse the shipped geometry/animation buffers without browser image APIs.
async function loadGeometry(phase) {
 const {GLTFLoader}=await import('three/examples/jsm/loaders/GLTFLoader.js');
 const b=fs.readFileSync(`public/models/record-quality-v1/${phase}.glb`),jsonLength=b.readUInt32LE(12);
 const json=JSON.parse(b.subarray(20,20+jsonLength)),bin=b.subarray(28+jsonLength);
 for(const material of json.materials){
  for(const key of Object.keys(material))if(key.endsWith('Texture'))delete material[key];
  for(const key of Object.keys(material.pbrMetallicRoughness||{}))if(key.endsWith('Texture'))delete material.pbrMetallicRoughness[key];
 }
 delete json.images;delete json.textures;delete json.samplers;
 const text=Buffer.from(JSON.stringify(json)),padded=Buffer.alloc(Math.ceil(text.length/4)*4,32);text.copy(padded);
 const out=Buffer.alloc(28+padded.length+bin.length);out.writeUInt32LE(0x46546c67);out.writeUInt32LE(2,4);out.writeUInt32LE(out.length,8);out.writeUInt32LE(padded.length,12);out.writeUInt32LE(0x4e4f534a,16);padded.copy(out,20);out.writeUInt32LE(bin.length,20+padded.length);out.writeUInt32LE(0x004e4942,24+padded.length);bin.copy(out,28+padded.length);
 return new GLTFLoader().parseAsync(out.buffer.slice(out.byteOffset,out.byteOffset+out.byteLength),'');
}

test('actual needle-to-spin handoff keeps every surface, tangent basis and final arm pose',async()=>{
 const three=await import('three'),{assembleRecordScene}=helpers(three);
 const [needle,spin]=await Promise.all([loadGeometry('needle'),loadGeometry('spin')]);
 const arm=needle.scene.children.filter(n=>!n.name.startsWith('Sketchfab_model'));
 const deck=spin.scene.getObjectByName('EXPORT_Main_0');
 const deckGeometry=deck.geometry,deckMaterial=deck.material,deckTangents=deck.geometry.getAttribute('tangent');
 // The actual normal-mapped arm gets its tangent basis prepared before display.
 needle.scene.traverse(n=>{if(n.isMesh&&n.material.name==='Bits')n.material.normalMap=new three.Texture();});
 const root=assembleRecordScene(needle.scene,spin.scene);
 assert.equal(root,needle.scene);assert.equal(root.getObjectByName('EXPORT_Main_0'),deck);
 assert.equal(root.getObjectByName('Object036'),undefined,'the second, fixed arm must not remain over the moving arm');
 arm.forEach(n=>assert.equal(n.parent,root));
 for(const n of arm)if(n.isMesh){
  assert.ok(n.geometry.hasAttribute('tangent'));
  const normal=n.geometry.attributes.normal,tangent=n.geometry.attributes.tangent;
  for(let i=0;i<tangent.count;i++)assert.ok(Math.abs(normal.getX(i)*tangent.getX(i)+normal.getY(i)*tangent.getY(i)+normal.getZ(i)*tangent.getZ(i))<1e-5);
 }
 const drop=new three.AnimationMixer(root),dropAction=drop.clipAction(needle.animations[0]);
 dropAction.setLoop(three.LoopOnce,1);dropAction.clampWhenFinished=true;dropAction.play();drop.update(3.75);
 root.updateMatrixWorld(true);
 const surfaces=[];root.traverse(n=>{if(n.isMesh)surfaces.push({node:n,geometry:n.geometry,material:n.material,matrix:n.matrixWorld.clone(),tangent:n.geometry.getAttribute('tangent')});});
 const rotation=new three.AnimationMixer(root),rotationAction=rotation.clipAction(spin.animations[0]);
 rotationAction.play();rotationAction.paused=true;rotation.update(0);
 const before=surfaces.map(s=>s.node.matrixWorld.clone());
 dropAction.paused=true;rotationAction.paused=false;rotationAction.play();rotation.update(0);root.updateMatrixWorld(true);
 surfaces.forEach((s,i)=>{
  assert.equal(s.node.geometry,s.geometry);assert.equal(s.node.material,s.material);assert.equal(s.node.geometry.getAttribute('tangent'),s.tangent);
  assert.deepEqual(s.node.matrixWorld.elements,before[i].elements,`${s.node.name}: no one-frame pose/geometry jump`);
 });
 rotation.update(0.2);root.updateMatrixWorld(true);
 surfaces.filter(s=>s.node.name.startsWith('Tube010')||s.node.name.startsWith('Object035')).forEach(s=>assert.notDeepEqual(s.node.matrixWorld.elements,s.matrix.elements,`${s.node.name}: the prepared platter and record must actually rotate`));
 surfaces.filter(s=>!s.node.name.startsWith('Tube010')&&!s.node.name.startsWith('Object035')).forEach(s=>assert.deepEqual(s.node.matrixWorld.elements,s.matrix.elements,`${s.node.name}: stationary hardware and settled arm stay fixed`));
 assert.equal(deck.geometry,deckGeometry);assert.equal(deck.material,deckMaterial);assert.equal(deck.geometry.getAttribute('tangent'),deckTangents);
});

test('fine gold trim preserves the studded hardware maps and follows the animated arm',async()=>{
 const three=await import('three');const {assembleRecordScene}=helpers(three);
 const [needle,spin]=await Promise.all([loadGeometry('needle'),loadGeometry('spin')]);
 const root=assembleRecordScene(needle.scene,spin.scene);root.position.y=.2;
 const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/recordMetallic.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:()=>three});
 const deck=root.getObjectByName('EXPORT_Main_0'),deckMaterial=deck.material;
 const arm=root.getObjectByName('Object036_Bits_0001'),armMaterial=arm.material;
 const originals=new Map();root.traverse(n=>{if(n.isMesh){
  n.material.map ||= new three.Texture();n.material.normalMap ||= new three.Texture();
  originals.set(n,{map:n.material.map,normalMap:n.material.normalMap});
 }});
 exports.applyRecordMetallic(root);
 const selected=[];root.traverse(n=>{if(n.userData.gjMetallic)selected.push(n);});
 assert.equal(selected.length,3);
 assert.equal(deck.material,deckMaterial,'the deck stays untouched');
 assert.notEqual(arm.material,armMaterial,'animated arm material is isolated');
 for(const mesh of selected){
  const detail=mesh.geometry.getAttribute('gjDetailPosition');assert.equal(detail.count,mesh.geometry.getAttribute('position').count);
  assert.equal(mesh.material.map,originals.get(mesh).map,'original colour atlas is retained');
  assert.equal(mesh.material.normalMap,originals.get(mesh).normalMap,'original stud and knurl normals are retained');
  assert.ok(!mesh.geometry.getAttribute('gjMetalMask'),'broad vertex masks must not return');
  const material=mesh.material;exports.applyRecordMetallic(root);assert.equal(mesh.material,material);
  const shader={uniforms:{},vertexShader:'#include <begin_vertex>',fragmentShader:'#include <alphamap_fragment>\n#include <normal_fragment_maps>\n#include <roughnessmap_fragment>\n#include <metalnessmap_fragment>'};material.onBeforeCompile(shader,{});
  assert.equal(shader.uniforms.gjBrandMetal.value.getHexString(),'b49b73');
  assert.match(shader.fragmentShader,/nonPerturbedNormal/);
 }
 const mask=arm.geometry.getAttribute('gjDetailPosition');const values=Array.from(mask.array);
 const mixer=new three.AnimationMixer(root);for(const clip of needle.animations)mixer.clipAction(clip).play();mixer.update(1);
 assert.deepEqual(Array.from(mask.array),values,'the finish remains attached during needle movement');
});
