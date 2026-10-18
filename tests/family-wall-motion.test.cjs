const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');

// Exercise the shipped event handlers and animation clock, without a browser,
// database or customer records. Each row has a real independent event owner.
function wallHarness() {
  let now=100, nextFrame=0;
  const frames=new Map();
  class Target {
    listeners=new Map();
    addEventListener(type,fn){if(!this.listeners.has(type))this.listeners.set(type,new Set());this.listeners.get(type).add(fn);}
    removeEventListener(type,fn){this.listeners.get(type)?.delete(fn);}
    emit(type,values={}){const event={type,target:this,cancelable:true,preventDefault(){},...values};for(const fn of [...(this.listeners.get(type)||[])])fn(event);}
  }
  class Element extends Target {
    children=[];parentElement=null;style={};dataset={};attrs={};className='';scrollLeft=0;clientWidth=390;captures=new Set();animations=[];
    get firstElementChild(){return this.children[0];}get lastElementChild(){return this.children.at(-1);}
    get classList(){return {toggle:(name,on)=>{const set=new Set(this.className.split(' '));if(on)set.add(name);else set.delete(name);this.className=[...set].join(' ');}};}
    detach(node){if(node.parentElement)node.parentElement.children.splice(node.parentElement.children.indexOf(node),1);node.parentElement=this;}
    append(...nodes){for(const node of nodes){this.detach(node);this.children.push(node);}}
    prepend(node){this.detach(node);this.children.unshift(node);}
    replaceChildren(...nodes){for(const node of this.children)node.parentElement=null;this.children=[];this.append(...nodes);}
    setAttribute(name,value){this.attrs[name]=value;}getAttribute(name){return this.attrs[name]??null;}
    closest(){for(let node=this;node;node=node.parentElement)if(node.className.includes('family-wall-brick'))return node;return null;}
    contains(node){for(;node;node=node.parentElement)if(node===this)return true;return false;}
    setPointerCapture(id){this.captures.add(id);}hasPointerCapture(id){return this.captures.has(id);}releasePointerCapture(id){this.captures.delete(id);}
    getBoundingClientRect(){return {left:0,top:0,right:this.clientWidth,bottom:80,width:this.clientWidth,height:80};}
    animate(keys,options){
      const animation={startTime:now,active:true,get currentTime(){return now-this.startTime;},cancel(){this.active=false;},keys,options};
      this.animations.push(animation);return animation;
    }
    offset(){
      const x=text=>Number(text.match(/translate3d\(([-\d.e]+)/)[1]);
      const a=this.animations.findLast(a=>a.active);
      return a?x(a.keys[0].transform)+(x(a.keys[1].transform)-x(a.keys[0].transform))*Math.min(1,a.currentTime/a.options.duration):x(this.style.transform);
    }
  }
  const document=Object.assign(new Target(),{hidden:false,createElement:()=>new Element()});
  const window=Object.assign(new Target(),{innerWidth:390});
  const exports={};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('apps/grandmajazz-platform/client/src/family-original/components/wallMotion.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{
    exports,window,document,Element,performance:{now:()=>now},
    requestAnimationFrame:fn=>{frames.set(++nextFrame,fn);return nextFrame;},cancelAnimationFrame:id=>frames.delete(id),
  });
  const advance=(duration,interval=16)=>{const end=now+duration;while(now<end){now=Math.min(end,now+interval);const batch=[...frames.values()];frames.clear();for(const fn of batch)fn(now);}};
  const makeRow=(direction='left')=>{
    const row=new Element(),space=new Element(),track=new Element(),controls={browsable:true,paused:false,reducedMotion:false},flips=[];
    row.append(space);space.append(track);
    const destroy=exports.createWallWindow(track,Array.from({length:100},(_,i)=>({id:String(i),title:'Cousin',name:'Fixture '+i})),{
      direction,pixelsPerSecond:18,controls:()=>controls,artwork:m=>m.name,turn:(node,member)=>({flip:()=>flips.push(member.id),destroy(){}}),
    });
    const phase=()=>((Number(track.children[0].dataset.memberId)*272-track.offset())%27200+27200)%27200;
    const distance=(before)=>{let d=phase()-before;if(d>13600)d-=27200;if(d< -13600)d+=27200;return d;};
    return {row,track,controls,flips,destroy,phase,distance};
  };
  const down=(r,id,x=300)=>r.row.emit('pointerdown',{pointerType:'mouse',pointerId:id,button:0,clientX:x,clientY:40,target:r.track.children[1]});
  const move=(r,id,x)=>r.row.emit('pointermove',{pointerType:'mouse',pointerId:id,clientX:x});
  const up=(r,id,type='pointerup')=>r.row.emit(type,{pointerType:'mouse',pointerId:id});
  const flick=(r,id=1,sign=1)=>{down(r,id);advance(16);move(r,id,300-sign*24);advance(16);move(r,id,300-sign*48);advance(16);up(r,id);};
  advance(16);
  return {advance,makeRow,down,move,up,flick,window,document,frames};
}

test('a flick coasts across multiple bricks, then immediately resumes automatic scrolling',()=>{
  const h=wallHarness(),r=h.makeRow();h.advance(1000);h.flick(r);
  const released=r.phase();h.advance(1000);assert.ok(r.distance(released)>600,'release momentum must remain noticeable after one second');
  h.advance(1800);const finished=r.phase();h.advance(160);
  assert.ok(r.distance(finished)>2,'no 900ms dead pause after the coast');
  h.advance(600);const drifting=r.phase();h.advance(1000);assert.ok(Math.abs(r.distance(drifting)-18)<.2,'resume the original drift speed');r.destroy();
});

test('coast distance is consistent at 60 Hz, 120 Hz and a missed frame',()=>{
  const measure=interval=>{const h=wallHarness(),r=h.makeRow();h.advance(1000);h.flick(r);const start=r.phase();h.advance(1500,interval);const d=r.distance(start);r.destroy();return d;};
  const sixty=measure(1000/60);assert.ok(Math.abs(sixty-measure(1000/120))<.001);assert.ok(Math.abs(sixty-measure(48))<.001);
});

test('two touch identifiers flick separate rows independently and may overlap',()=>{
  const h=wallHarness(),a=h.makeRow('left'),b=h.makeRow('right');h.advance(1000);
  const touch=(r,type,id,x)=>{const value={identifier:id,clientX:x,clientY:40};(type==='touchstart'?r.row:h.window).emit(type,{changedTouches:[value],target:r.track.children[1]});};
  touch(a,'touchstart',11,300);touch(b,'touchstart',22,100);h.advance(16);
  touch(a,'touchmove',11,270);touch(b,'touchmove',22,130);h.advance(16);
  touch(a,'touchmove',11,240);touch(b,'touchmove',22,160);h.advance(16);touch(a,'touchend',11,240);
  const pa=a.phase(),pb=b.phase();h.advance(100);assert.ok(a.distance(pa)>100);assert.ok(Math.abs(b.distance(pb))<.001,'second finger still owns its stationary row');
  touch(b,'touchmove',22,200);h.advance(16);touch(b,'touchend',22,200);const both=[a.phase(),b.phase()];h.advance(500);
  assert.ok(a.distance(both[0])>100);assert.ok(b.distance(both[1])< -100);a.destroy();b.destroy();
});

test('a new drag can catch and reverse a moving row without a positional jump',()=>{
  const h=wallHarness(),r=h.makeRow();h.advance(1000);h.flick(r);h.advance(400);
  const caught=r.phase();h.down(r,2,100);assert.ok(Math.abs(r.distance(caught))<.001);h.advance(16);h.move(r,2,130);h.advance(16);h.move(r,2,160);h.advance(16);h.up(r,2);
  const reversed=r.phase();h.advance(500);assert.ok(r.distance(reversed)< -300);
  h.advance(3500);const returned=r.phase();h.advance(200);assert.ok(r.distance(returned)>2,'after an opposite flick, ease back into the original automatic direction');r.destroy();
});

test('tapping bricks retains their readable pause and independent turn handlers',()=>{
  const h=wallHarness(),r=h.makeRow();h.advance(1000);h.down(r,1);h.advance(16);h.up(r,1);
  const paused=r.phase();assert.equal(r.flips.length,1);h.advance(3000);assert.ok(Math.abs(r.distance(paused))<.001);
  r.row.emit('click',{detail:0,target:r.track.children[2],clientX:0,clientY:0});assert.equal(r.flips.length,2);
  const second=r.phase();h.advance(3500);assert.ok(Math.abs(r.distance(second))<.001);h.advance(1000);assert.ok(r.distance(second)>3);r.destroy();
});

test('trackpad momentum is consumed once, followed promptly by drift',()=>{
  const h=wallHarness(),r=h.makeRow();h.advance(1000);
  for(const deltaX of [90,45,20,8,2]){r.row.emit('wheel',{deltaX,deltaY:0,deltaMode:0});h.advance(16);}
  const released=r.phase();h.advance(80);assert.ok(Math.abs(r.distance(released))<.001,'do not add synthetic inertia to native wheel events');
  h.advance(240);assert.ok(r.distance(released)>1,'resume when the wheel stream goes quiet');r.destroy();
});

test('cancelled or reduced-motion gestures do not launch a coast, and cleanup stops every frame',()=>{
  const h=wallHarness(),r=h.makeRow();h.advance(1000);h.down(r,1);h.advance(16);h.move(r,1,250);h.advance(16);h.up(r,1,'pointercancel');
  const cancelled=r.phase();h.advance(500);assert.ok(r.distance(cancelled)<10,'a cancelled touch must not fling');
  r.controls.reducedMotion=true;h.flick(r,2);const reduced=r.phase();h.advance(1500);assert.ok(Math.abs(r.distance(reduced))<.001);
  r.controls.reducedMotion=false;h.flick(r,3);h.advance(100);r.controls.paused=true;h.advance(16);const paused=r.phase();h.advance(1000);assert.ok(Math.abs(r.distance(paused))<.001);
  r.destroy();assert.equal(h.frames.size,0);assert.equal(r.track.children.length,0);assert.equal(h.window.listeners.get('touchmove').size,0);
});
