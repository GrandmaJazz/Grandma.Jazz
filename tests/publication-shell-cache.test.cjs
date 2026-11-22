const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(fetch) {
  const source = ts.transpileModule(fs.readFileSync('src/app/api/platform-page/[...path]/route.ts','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
  const module={exports:{}};
  vm.runInNewContext(source,{module,exports:module.exports,URL,Headers,Response,AbortSignal,fetch,process:{env:{EVENTS_PLATFORM_ORIGIN:'https://fixture.invalid'}}});
  return module.exports.GET;
}
test('only the anonymous public Garments shell shares its short-lived upstream cache', async()=>{
  const calls=[];
  const GET=load(async(url,options)=>{calls.push({url:String(url),options});return new Response('<script src="/assets/current.js"></script>',{headers:{'content-type':'text/html'}})});
  for(const path of [['garments'],['garments','edition-2']]) {
    const response=await GET(new Request('https://www.grandmajazz.com/'+path.join('/')+'?embedded=1',{headers:{cookie:'session=private'}}),{params:Promise.resolve({path})});
    const call=calls.at(-1);
    assert.equal(call.url,'https://fixture.invalid/garments');
    assert.equal(call.options.headers.has('cookie'),false);
    assert.equal(call.options.next.revalidate,30);
    assert.equal(response.headers.get('Cache-Control'),'private, no-store');
    assert.match(await response.text(),/data-cfasync="false"/);
  }
  for(const path of [['garments','manage'],['events','event-1']]) {
    await GET(new Request('https://www.grandmajazz.com/'+path.join('/')+'?embedded=1',{headers:{cookie:'session=private'}}),{params:Promise.resolve({path})});
    const call=calls.at(-1);
    assert.equal(call.options.headers.get('cookie'),'session=private');
    assert.equal(call.options.cache,'no-store');
    assert.equal(call.options.next,undefined);
  }
});
