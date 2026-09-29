const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function client(fetch) {
 const notices=[];const removed=[];const exports={};
 const source=ts.transpileModule(readFileSync('src/lib/api.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const storage={get:()=> 'test-token',remove:key=>removed.push(key)};
 vm.runInNewContext(source,{exports,process:{env:{NEXT_PUBLIC_API_URL:'https://example.test'}},fetch,FormData,AbortSignal,console:{error:()=>{}},
 require:name=>name==='react-hot-toast'?{toast:{error:(...args)=>notices.push(args)}}:{safeStorage:storage}});
 return {...exports,notices,removed};
}
test('checkout quote and order use authenticated backend routes with abort support',async()=>{
 const calls=[];const api=client(async(url,options)=>{calls.push({url,options});return new Response(JSON.stringify({quote:{totalCents:1234}}),{headers:{'content-type':'application/json'}});});
 const request={orderItems:[{product:'a'.repeat(24),quantity:2}],destinationCountry:'Thailand',discountCode:null};
 const controller=new AbortController();
 const result=await api.OrderAPI.quote(request,controller.signal);
 assert.equal(result.quote.totalCents,1234);
 assert.equal(calls[0].url,'https://example.test/api/orders/quote');
 assert.equal(calls[0].options.signal,controller.signal);
 assert.equal(calls[0].options.headers.Authorization,'Bearer test-token');
 assert.deepEqual(JSON.parse(calls[0].options.body),request);
 await api.OrderAPI.create({...request,shippingAddress:'Test address',quoteId:'server-fingerprint'});
 const payload=JSON.parse(calls[1].options.body);
 assert.equal(payload.quoteId,'server-fingerprint');
 assert.equal('shippingCost' in payload,false);assert.equal('price' in payload.orderItems[0],false);
});
test('session expiry surfaces an error without navigating away or losing form state',async()=>{
 const api=client(async()=>new Response('{}',{status:401,headers:{'content-type':'application/json'}}));
 await assert.rejects(api.OrderAPI.quote({}),/Session expired/);
 assert.deepEqual(api.removed,['token']);assert.equal(api.notices.length,1);
});
test('server quote failures remain actionable instead of silently becoming free shipping',async()=>{
 const api=client(async()=>new Response(JSON.stringify({message:'Packed order exceeds the 30 kg shipping limit.'}),{status:400,headers:{'content-type':'application/json'}}));
 await assert.rejects(api.OrderAPI.quote({}),/30 kg/);
});
