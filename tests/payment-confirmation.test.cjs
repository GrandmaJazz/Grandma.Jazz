const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const exportsUnderTest = {};
const source = ts.transpileModule(readFileSync('src/lib/paymentConfirmation.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInNewContext(source, { exports: exportsUnderTest });
const { confirmedOrderId, remainingCheckoutCart } = exportsUnderTest;
const orderId = 'a'.repeat(24);
const product = 'b'.repeat(24);
const otherProduct = 'c'.repeat(24);

test('an unpaid response is not a purchase even when the API request succeeded', () => {
  assert.equal(confirmedOrderId({ success: true, isPaid: false }), null);
  assert.equal(confirmedOrderId({ success: true, isPaid: false, order: { _id: orderId } }), null);
  assert.equal(confirmedOrderId({ success: true, order: { _id: orderId } }), null);
});

test('confirmation requires an explicit paid flag and valid server order', () => {
  assert.equal(confirmedOrderId({ success: true, isPaid: true, order: { _id: orderId } }), orderId);
  for (const response of [null, {}, { success: false, isPaid: true, order: { _id: orderId } },
    { success: true, isPaid: 'true', order: { _id: orderId } },
    { success: true, isPaid: true }, { success: true, isPaid: true, order: { _id: '../other' } }]) {
    assert.equal(confirmedOrderId(response), null);
  }
});

test('cancelled or unrelated checkouts cannot empty a saved basket', () => {
  const basket = [{ productId: product, quantity: 2 }];
  assert.equal(remainingCheckoutCart(basket, null, orderId), basket);
  assert.equal(remainingCheckoutCart(basket, { orderId: 'd'.repeat(24), items: basket }, orderId), basket);
  assert.equal(remainingCheckoutCart(basket, { orderId, items: [{ productId: product, quantity: -1 }] }, orderId), basket);
});

test('paid checkout removes its quantities while preserving later additions', () => {
  const basket = [{ productId: product, quantity: 3 }, { productId: otherProduct, quantity: 1 }];
  const remaining = remainingCheckoutCart(basket, { orderId, items: [{ productId: product, quantity: 2 }] }, orderId);
  assert.equal(JSON.stringify(remaining), JSON.stringify([{ productId: product, quantity: 1 }, { productId: otherProduct, quantity: 1 }]));
  assert.equal(basket[0].quantity, 3);
  assert.equal(remainingCheckoutCart([{ productId: product, quantity: 2 }], { orderId, items: [{ productId: product, quantity: 2 }] }, orderId).length, 0);
});


test('a paid colour variant preserves another colour and later additions of the same variant', () => {
  const basket = [{ productId: product, colour: 'White', quantity: 3 }, { productId: product, colour: 'Black', quantity: 2 }];
  const result = remainingCheckoutCart(basket, { orderId, items: [{ productId: product, colour: 'White', quantity: 2 }] }, orderId);
  assert.equal(JSON.stringify(result), JSON.stringify([{ productId: product, colour: 'White', quantity: 1 }, { productId: product, colour: 'Black', quantity: 2 }]));
});
