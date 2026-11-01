const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
const path = require('node:path');
const file = path.resolve('src/lib/instagramSync.ts');
const mod = new Module(file, module);
mod.filename = file; mod.paths = module.paths;
mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'), { compilerOptions:{ module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true }}).outputText,file);

test('cron authorization rejects missing, partial and wrong bearer values', () => {
  for (const [header, secret] of [[null,'secret'],['Bearer undefined',undefined],['secret','secret'],['Bearer secre','secret'],['Bearer wrong!','secret']]) {
    assert.equal(mod.exports.authorized(header,secret),false);
  }
  assert.equal(mod.exports.authorized('Bearer secret','secret'),true);
});

test('image downloader rejects untrusted hosts, credentials and non-HTTPS URLs before networking', async () => {
  for (const source of ['http://cdninstagram.com/x','https://localhost/x','https://cdninstagram.com.attacker.test/x','https://user:pass@cdninstagram.com/x','https://cdninstagram.com:444/x','https://127.0.0.1/x']) {
    await assert.rejects(mod.exports.downloadImage(source), /image_download/);
  }
});
