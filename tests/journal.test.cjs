const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
function load(file){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:()=>({cache:fn=>fn}),process:{env:{NEXT_PUBLIC_API_URL:'https://example.test'}}});return exports;}
const {fetchPublishedBlogs}=load('src/lib/publicBlogs.ts');
const {parseContent,articleLayout}=load('src/lib/blogContent.ts');
test('public journal follows pagination, removes duplicates and refuses drafts',async()=>{
 const calls=[];const post=(id,published=true)=>({_id:id,slug:id,isPublished:published,publishedAt:'2026-11-01'});
 const posts=await fetchPublishedBlogs(async url=>{calls.push(url);return{ok:true,json:async()=>({success:true,totalPages:2,blogs:calls.length===1?[post('a'),post('private',false)]:[post('a'),post('b')]})}});
 assert.equal(posts.map(p=>p.slug).join(','),'a,b');assert.equal(calls.length,2);assert.match(calls[1],/page=2/);
});
test('an upstream outage cannot become a cached empty public journal',async()=>{await assert.rejects(fetchPublishedBlogs(async()=>({ok:false,status:503})),/503/)});
test('image positions survive hidden planning notes and added article hero',()=>{
 const raw='Opening\n\n[IMAGE 1 — counter]\n\n## A heading\n\n[NOTE — private]\n\n[IMAGE 2]\n\nClosing';
 const parsed=parseContent(raw);assert.equal(parsed.some(b=>b.text?.includes('private')),false);
 const result=articleLayout(raw,3);assert.equal(result.hero,false);assert.equal(result.blocks.filter(b=>b.kind==='image').map(b=>b.index).join(','),'0,1,2');
 const top=articleLayout('[IMAGE 1]\n\nOpening\n\n[IMAGE 2]',2);assert.equal(top.hero,true);assert.equal(top.blocks.filter(b=>b.kind==='image').map(b=>b.index).join(','),'1');
 const automatic=articleLayout('Opening\n\nMiddle\n\nEnd',3);assert.equal(automatic.hero,true);assert.equal(automatic.blocks.filter(b=>b.kind==='image').map(b=>b.index).join(','),'1,2');
});
