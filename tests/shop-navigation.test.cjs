const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const source = ts.transpileModule(fs.readFileSync(require('node:path').join(__dirname, '../src/lib/shopNavigation.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const moduleValue = { exports: {} };
vm.runInNewContext(source, { module: moduleValue, exports: moduleValue.exports, URL });
const { shopReturnPath, profileReturnPath, isShopPhone } = moduleValue.exports;

test('checkout survives sign-in and profile completion, including a payment return', () => {
  assert.equal(shopReturnPath('/checkout/'), '/checkout/');
  const path = '/checkout/success/?session_id=cs_test_example';
  assert.equal(shopReturnPath(path), path);
  assert.equal(new URL(profileReturnPath(path), 'https://www.grandmajazz.com').searchParams.get('redirect'), path);
});

test('return paths reject external redirects and sign-in loops', () => {
  for (const value of ['https://example.com', '//example.com', '/\\example.com', '/\nexample.com', '/login/', null]) {
    assert.equal(shopReturnPath(value), '/');
  }
});

test('international phone formats work without accepting letters or unreasonable lengths', () => {
  for (const value of ['+66 94 860 5652', '+44 7700 900123', '+1 (202) 555-0123', '094-860-5652', '+61 412 345 678']) assert.equal(isShopPhone(value), true, value);
  for (const value of ['', '123', '+1234567890123456', 'hello1234567', '123+4567890']) assert.equal(isShopPhone(value), false, value);
});
