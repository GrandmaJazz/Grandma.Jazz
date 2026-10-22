const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs'),vm=require('vm'),ts=require('typescript');
test('keyboard panning cannot feed back into Family iframe sizing',()=>{
 class Target {listeners=new Map();addEventListener(t,f){this.listeners.set(t,f)}removeEventListener(t){this.listeners.delete(t)}emit(t){this.listeners.get(t)?.()}}
 const viewport=Object.assign(new Target(),{height:720,offsetTop:0});const window=Object.assign(new Target(),{innerWidth:390,innerHeight:720,visualViewport:viewport});
 const props=new Map(),frames=new Map();let writes=0,id=0;
 const screen={style:{getPropertyValue:k=>props.get(k),setProperty:(k,v)=>{props.set(k,v);writes++}}};
 const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/family/familyViewport.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,window,document:{querySelector:selector=>selector==='.gj-header-bar'?{offsetHeight:80}:{}},ResizeObserver:class{observe(){}disconnect(){}},requestAnimationFrame:fn=>{frames.set(++id,fn);return id},cancelAnimationFrame:id=>frames.delete(id)});
 const dispose=exports.observeFamilyViewport(screen);assert.equal(props.get('--family-height'),'632px');
 viewport.height=380;viewport.emit('resize');viewport.emit('resize');assert.equal(frames.size,1);for(const fn of frames.values())fn();frames.clear();assert.equal(props.get('--family-height'),'292px');
 const previous=writes;for(let i=0;i<30;i++){viewport.offsetTop=i*8;viewport.emit('scroll');viewport.emit('resize');for(const fn of frames.values())fn();frames.clear()};assert.equal(writes,previous);
 viewport.height=720;viewport.offsetTop=0;viewport.emit('resize');for(const fn of frames.values())fn();frames.clear();assert.equal(props.get('--family-height'),'632px');dispose();assert.equal(viewport.listeners.size,0);assert.equal(window.listeners.size,0);
});
