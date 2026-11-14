const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),THREE=require('three');
const api={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/recordCameraFlight.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:api,require:()=>THREE});
const {FLIGHT_DURATION,HOME_REVEAL_START,NEEDLE_START,NEEDLE_DURATION}=api;
const center=new THREE.Vector3(2.022063614,.68396471,2.042454648),size=new THREE.Vector3(2.498590764,.733253339,1.706636572);
test('camera flight is continuous, stays above the record during its low pass, and ends at the approved shot',()=>{
 for(const [w,h]of [[320,740],[390,844],[1050,900],[1440,900]]){
  const sample=api.createRecordCameraFlight(w,h,center,size);let previous=sample(0);
  for(let t=.01;t<=FLIGHT_DURATION;t+=.01){const p=sample(t);assert.ok(p.position.distanceTo(previous.position)<.035);assert.ok(p.target.distanceTo(previous.target)<.035);assert.ok(p.position.distanceTo(p.target)>.1);assert.ok(p.fov>10&&p.fov<90);if(p.position.y<.68)assert.ok(Math.hypot(p.position.x-1.6501203,p.position.z-2.0307182)>.82,'never pass through the platter');previous=p;}
  const end=sample(FLIGHT_DURATION),phone=w<640,offset=new THREE.Vector3(phone?.13:.05,phone?-1.8:w<1440?-.5:-.2,0);
  assert.ok(end.position.clone().add(offset).distanceTo(center.clone().add(new THREE.Vector3(0,size.y*(phone?3.3:2.5),size.z*2.5)))<1e-9);
  assert.equal(end.logoOpacity,1);assert.equal(end.needleTime,3.75);assert.equal(end.spinTime,FLIGHT_DURATION-NEEDLE_START-NEEDLE_DURATION);
  assert.equal(sample(0).logoOpacity,0);assert.equal(sample(0).spinTime,0);
 }
});
test('seeking backward is deterministic and the record starts only at needle touchdown',()=>{
 const sample=api.createRecordCameraFlight(1440,900,center,size),a=sample(3);
 sample(FLIGHT_DURATION);const b=sample(3);assert.deepEqual(a.position.toArray(),b.position.toArray());assert.equal(a.needleTime,b.needleTime);
 assert.equal(sample(4).spinTime,0);assert.ok(sample(4.1).spinTime>0);
 assert.deepEqual(sample(-1).position.toArray(),sample(0).position.toArray());
});

test('the reveal follows one outward line without reversing direction',()=>{
 for(const [w,h] of [[320,740],[390,844],[1050,900],[1440,900]]){
  const sample=api.createRecordCameraFlight(w,h,center,size);
  const start=sample(0).position, end=sample(FLIGHT_DURATION).position, axis=end.clone().sub(start).normalize();
  let lastDistance=0;
  for(let t=.01;t<=FLIGHT_DURATION;t+=.01){
   const delta=sample(t).position.clone().sub(start),distance=delta.dot(axis);
   assert.ok(distance>=lastDistance,'camera never moves back inward');
   assert.ok(delta.clone().cross(axis).length()<1e-9,'no sideways camera detour');lastDistance=distance;
  }
 }
});

test('the opening stays close to the grooves and drifts out gently',()=>{
 const sample=api.createRecordCameraFlight(390,760,center,size);
 const first=sample(0),next=sample(.1);
 assert.ok(first.position.y>.663+.04,'near plane remains clear of the vinyl');
 assert.ok(first.position.z<2.8,'begin near the record instead of outside the deck');
 assert.ok(next.position.distanceTo(first.position)>0,'the camera starts drifting without a hard cut');
 assert.ok(sample(1).position.distanceTo(first.position)<sample(FLIGHT_DURATION).position.distanceTo(first.position)*.002);
 assert.equal(next.spinTime,0,'the moving camera does not start the music or record early');
});

test('the portrait finish reveals both sides and leaves room for the left gold controls',()=>{
 for(const [w,h] of [[320,740],[390,844],[430,800],[430,940]]){
  const state=api.createRecordCameraFlight(w,h,center,size)(FLIGHT_DURATION);
  const camera=new THREE.PerspectiveCamera(state.fov,w/h,.04,30);
  camera.position.copy(state.position);camera.lookAt(state.target);
  camera.setViewOffset(w,h,0,h*state.viewOffset,w,h);camera.updateMatrixWorld(true);
  for(const x of [.772768,2.986362]){
   const corner=new THREE.Vector3(x,.550329,2.895773).project(camera);
   assert.ok(Math.abs(corner.x)<.98, `housing corners fit ${w}×${h}: ${corner.x}`);
  }
  for(const x of [.80,.96]){
   const goldControl=new THREE.Vector3(x,.7047,2.5545).project(camera);
   assert.ok(Math.abs(goldControl.x)<.95, 'left control has its full outline');
  }
 }
});

test('the logo fades in and pulls forward through the final frame',()=>{
 const sample=api.createRecordCameraFlight(390,844,center,size);
 assert.equal(sample(0).logoOpacity,0);
 assert.equal(sample(1).logoOpacity,0);
 assert.equal(sample(2).logoOpacity,0);
 assert.ok(sample(2.25).logoOpacity>0 && sample(2.25).logoOpacity<.01);
 assert.equal(sample(0).logoScale,.76);
 for (let t=.25;t<=FLIGHT_DURATION;t+=.25) {
  if(t>2) assert.ok(sample(t).logoOpacity>sample(t-.25).logoOpacity);
  assert.ok(sample(t).logoScale>sample(t-.25).logoScale);
  assert.equal(sample(t).logoBottom,sample(0).logoBottom);
 }
 assert.equal(sample(FLIGHT_DURATION).logoOpacity,1);
 assert.equal(sample(FLIGHT_DURATION).logoScale,1);
});

test('the entire logo clears the viewport at full size on short and tall screens',()=>{
 for(const [w,h] of [[320,568],[390,844],[844,390],[1050,650],[1440,900],[2048,750],[2560,600]]){
  const state=api.createRecordCameraFlight(w,h,center,size)(FLIGHT_DURATION);
  assert.ok(state.logoBottom-state.logoWidth*652/2000>=11.99, `top clearance at ${w}×${h}`);
  assert.ok(state.logoBottom<=h-12, `bottom clearance at ${w}×${h}`);
  assert.ok(state.logoWidth<=w*.9, `side clearance at ${w}×${h}`);
  if(w===390) assert.equal(state.logoWidth,351);
 }
});

test('the vinyl keeps its speed through the homepage reveal',()=>{
 const sample=api.createRecordCameraFlight(1440,900,center,size);
 assert.equal(sample(8.5).spinTime,4.5);
 assert.equal(sample(9).spinTime,5);
 assert.ok(Math.abs(sample(HOME_REVEAL_START+.5).spinTime-(HOME_REVEAL_START+.5-4))<1e-9);
});

test('the original unhurried opening leads into a slower pullback and a complete stop',()=>{
 const previousEase=t=>t**3*(t*(6*t-15)+10);
 for(const [w,h] of [[320,568],[390,844],[844,390],[1050,750],[1440,900]]){
  const sample=api.createRecordCameraFlight(w,h,center,size);
  const total=sample(0).position.distanceTo(sample(FLIGHT_DURATION).position);
  const at=t=>sample(0).position.distanceTo(sample(t).position)/total;
  assert.ok(at(2)<previousEase(2/9)*.4,'stay intimate with the needle for longer');
  assert.ok(at(5)<previousEase(5/9)*.7,'take longer to open out');
  const distance=t=>sample(t).position.distanceTo(sample(t+.01).position)/total;
  let peak=0;
  for(let t=0;t<FLIGHT_DURATION-.01;t+=.01) peak=Math.max(peak,distance(t));
  assert.ok(peak<1.875/9*.01,'peak pullback speed is below the previous cut');
  assert.ok(distance(FLIGHT_DURATION-3)>distance(FLIGHT_DURATION-2));
  assert.ok(distance(FLIGHT_DURATION-2)>distance(FLIGHT_DURATION-1));
  assert.ok(distance(FLIGHT_DURATION-1)>distance(FLIGHT_DURATION-.5));
  assert.ok(distance(FLIGHT_DURATION-.01)<.000001);
  assert.equal(distance(FLIGHT_DURATION),0);
  for(const key of ['fov','viewOffset','logoScale','exposure']){
   const end=sample(FLIGHT_DURATION)[key];
   const range=Math.abs(end-sample(0)[key]);
   assert.ok(Math.abs(end-sample(FLIGHT_DURATION-.01)[key])<=range*.000001);
  }
 }
});

test('the homepage holds the final framing before the slide without retiming the vinyl',()=>{
 assert.ok(Math.abs(HOME_REVEAL_START-FLIGHT_DURATION-.7)<1e-9);
 for(const [w,h] of [[320,568],[390,844],[1050,750],[1440,900]]){
  const sample=api.createRecordCameraFlight(w,h,center,size);
  const settled=sample(FLIGHT_DURATION),lift=sample(HOME_REVEAL_START);
  assert.deepEqual(lift.position.toArray(),settled.position.toArray());
  assert.deepEqual(lift.target.toArray(),settled.target.toArray());
  for(const key of ['fov','viewOffset','logoScale','logoOpacity','exposure','needleTime']) assert.equal(lift[key],settled[key]);
  assert.ok(Math.abs(lift.spinTime-settled.spinTime-.7)<1e-9);
 }
});
