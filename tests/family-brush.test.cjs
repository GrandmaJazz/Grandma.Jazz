const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');const ts=require('typescript');
const exportsForTest={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('apps/grandmajazz-platform/client/src/family-original/components/brick-experience/brickBrush.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:exportsForTest});
test('a swipe lights each crossed brick without selecting it, then clears on release',()=>{
 const handlers={};let finish;let activations=0;let stage='choosing';
 const brick=(left)=>{const attrs={};return{attrs,getBoundingClientRect:()=>({left,right:left+90,top:0,bottom:45}),setAttribute:(k,v)=>attrs[k]=v,removeAttribute:k=>delete attrs[k],click:()=>activations++}};
 const a=brick(0),b=brick(100);const container={ownerDocument:{defaultView:{clearTimeout:()=>{finish=undefined},setTimeout:fn=>{finish=fn;return 1}}},closest:()=>({getAttribute:()=>stage}),querySelectorAll:()=>[a,b],addEventListener:(k,fn)=>handlers[k]=fn,removeEventListener:k=>delete handlers[k]};
 const cleanup=exportsForTest.attachBrickBrush(container);
 const point=x=>({pointerType:'touch',buttons:1,clientX:x,clientY:20});
 handlers.pointerdown(point(20));assert.equal(a.attrs['data-brush'],'true');
 handlers.pointermove(point(120));assert.equal(a.attrs['data-brush'],undefined);assert.equal(b.attrs['data-brush'],'true');assert.equal(activations,0);
 handlers.pointerup();finish();assert.equal(b.attrs['data-brush'],undefined);
 stage='editing';handlers.pointermove(point(20));assert.equal(a.attrs['data-brush'],undefined);
 stage='choosing';handlers.pointermove(point(20));handlers.pointercancel();assert.equal(a.attrs['data-brush'],undefined);
 cleanup();assert.equal(Object.keys(handlers).length,0);
});
test('member-wall brushing stays disabled behind the form and clears when browsing ends',()=>{
 const handlers={};const attrs={};let browsing=false;
 const brick={getBoundingClientRect:()=>({left:0,right:240,top:0,bottom:80}),setAttribute:(k,v)=>attrs[k]=v,removeAttribute:k=>delete attrs[k]};
 const row={ownerDocument:{defaultView:{clearTimeout(){},setTimeout(){return 1}}},querySelectorAll:selector=>{assert.equal(selector,'.family-wall-brick');return[brick]},addEventListener:(k,fn)=>handlers[k]=fn,removeEventListener:k=>delete handlers[k]};
 const cleanup=exportsForTest.attachBrickBrush(row,{selector:'.family-wall-brick',enabled:()=>browsing});
 const event={pointerType:'touch',buttons:1,clientX:100,clientY:40};
 handlers.pointermove(event);assert.equal(attrs['data-brush'],undefined);
 browsing=true;handlers.pointermove(event);assert.equal(attrs['data-brush'],'true');
 browsing=false;handlers.pointermove(event);assert.equal(attrs['data-brush'],undefined);
 cleanup();
});
