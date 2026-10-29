const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),THREE=require('three');
const api={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/recordCameraFlight.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:api,require:()=>THREE});
const center=new THREE.Vector3(2.022063614,.68396471,2.042454648),size=new THREE.Vector3(2.498590764,.733253339,1.706636572);
test('camera flight is continuous, stays above the record during its low pass, and ends at the approved shot',()=>{
 for(const [w,h]of [[320,740],[390,844],[1050,900],[1440,900]]){
  const sample=api.createRecordCameraFlight(w,h,center,size);let previous=sample(0);
  for(let t=.01;t<=9;t+=.01){const p=sample(t);assert.ok(p.position.distanceTo(previous.position)<.035);assert.ok(p.target.distanceTo(previous.target)<.035);assert.ok(p.position.distanceTo(p.target)>.1);assert.ok(p.fov>10&&p.fov<90);if(p.position.y<.68)assert.ok(Math.hypot(p.position.x-1.6501203,p.position.z-2.0307182)>.82,'never pass through the platter');previous=p;}
  const end=sample(9),phone=w<640,offset=new THREE.Vector3(.05,phone?-1.8:w<1440?-.5:-.2,0);
  assert.ok(end.position.clone().add(offset).distanceTo(center.clone().add(new THREE.Vector3(0,size.y*(phone?3.3:2.5),size.z*2.5)))<1e-9);
  assert.equal(end.logoOpacity,1);assert.equal(end.needleTime,3.75);assert.equal(end.spinTime,5);
  assert.equal(sample(0).logoOpacity,0);assert.equal(sample(0).spinTime,0);
 }
});
test('seeking backward is deterministic and the record starts only at needle touchdown',()=>{
 const sample=api.createRecordCameraFlight(1440,900,center,size),a=sample(3);
 sample(9);const b=sample(3);assert.deepEqual(a.position.toArray(),b.position.toArray());assert.equal(a.needleTime,b.needleTime);
 assert.equal(sample(4).spinTime,0);assert.ok(sample(4.1).spinTime>0);
 assert.deepEqual(sample(-1).position.toArray(),sample(0).position.toArray());
});

test('the reveal follows one outward line without reversing direction',()=>{
 for(const [w,h] of [[320,740],[390,844],[1050,900],[1440,900]]){
  const sample=api.createRecordCameraFlight(w,h,center,size);
  const start=sample(0).position, end=sample(9).position, axis=end.clone().sub(start).normalize();
  let lastDistance=0;
  for(let t=.01;t<=9;t+=.01){
   const delta=sample(t).position.clone().sub(start),distance=delta.dot(axis);
   assert.ok(distance>=lastDistance,'camera never moves back inward');
   assert.ok(delta.clone().cross(axis).length()<1e-9,'no sideways camera detour');lastDistance=distance;
  }
 }
});

test('the close groove opening moves immediately and keeps a safe surface clearance',()=>{
 const sample=api.createRecordCameraFlight(390,760,center,size);
 const first=sample(0),next=sample(.1);
 assert.ok(first.position.y>.663+.04,'near plane remains clear of the vinyl');
 assert.ok(first.position.z<2.8,'begin near the record instead of outside the deck');
 assert.ok(next.position.distanceTo(first.position)>.005,'visible motion begins in the first tenth second');
 assert.equal(next.spinTime,0,'the moving camera does not start the music or record early');
});
