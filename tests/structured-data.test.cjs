const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');

const modules = new Map();
function load(name) {
  if (modules.has(name)) return modules.get(name);
  const filename = path.join(__dirname, '../src/lib', name + '.ts');
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(source, {
    module, exports: module.exports, URL, Date, Set, Number,
    require: value => load(value.replace('./', '')),
  }, { filename });
  modules.set(name, module.exports);
  return module.exports;
}
const { productSchema } = load('productSeo');
const { quizForDate, quizPath, quizSchema } = load('quizSeo');
const { serializeJsonLd } = load('structuredData');

test('product offers match actual price, currency and both stock states', () => {
  const product = { _id: '6aaa3a0faf0110889be25f00', name: 'Coffee beans', description: 'Coffee', price: 17, images: ['/coffee.jpg'], isOutOfStock: false };
  const schema = productSchema(product);
  assert.equal(schema.offers.price, 17);
  assert.equal(schema.offers.priceCurrency, 'USD');
  assert.equal(schema.offers.availability, 'https://schema.org/InStock');
  assert.equal(schema.offers.url, 'https://www.grandmajazz.com/products/6aaa3a0faf0110889be25f00/');
  assert.equal(productSchema({ ...product, isOutOfStock: true }).offers.availability, 'https://schema.org/OutOfStock');
  assert.equal(productSchema({ ...product, price: NaN }), null);
  assert.equal(productSchema({ ...product, images: [] }), null);
  assert.equal(productSchema({ ...product, _id: '6929665bbe2f425d5baed3f0' }), null);
});

test('quiz dates have distinct URLs, Bangkok dates, free admission and full address', () => {
  const first = quizForDate('2026-10-10');
  const second = quizForDate('2026-10-17');
  assert.ok(first && second);
  assert.notEqual(quizPath(first), quizPath(second));
  const schema = quizSchema(first);
  assert.equal(schema.startDate, '2026-10-10T16:20:00+07:00');
  assert.equal(schema.offers.price, 0);
  assert.equal(schema.offers.priceCurrency, 'THB');
  assert.equal(schema.location.address.streetAddress, '13/20 Moo 6');
  assert.equal(schema.url, schema.offers.url);
  for (const invalid of ['2026-10-11', '2026-02-30', 'not-a-date', '2026-13-01']) assert.equal(quizForDate(invalid), null);
});

test('database text cannot escape its JSON-LD script', () => {
  const value = { name: '</script><script>alert(1)</script>' };
  const json = serializeJsonLd(value);
  assert.ok(!json.includes('</script>'));
  assert.equal(JSON.parse(json).name, value.name);
});
