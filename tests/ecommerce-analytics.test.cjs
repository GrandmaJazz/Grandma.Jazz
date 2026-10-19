const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');

const productId = '6aaa3a0faf0110889be25f00';
const orderId = '6aaa3a0faf0110889be25f01';
const verification = { success: true, isPaid: true, order: { _id: orderId } };
const product = { _id: productId, name: 'Coffee beans', category: 'Coffee', price: 17 };
const order = { _id: orderId, isPaid: true, currency: 'USD', totalAmount: 37, shippingCost: 5,
  orderItems: [{ product: productId, name: 'Coffee beans', price: 17, quantity: 2 }],
  user: { email: 'private@example.invalid', name: 'Private Customer' }, contactPhone: 'private-phone', shippingAddress: 'Private address', discountCode: 'PRIVATE-CODE' };

function setup(options = {}) {
  const events = [];
  const storage = options.storage || new Map();
  const window = { ...(options.noConsent ? {} : { gjPrivacyChoice: { version: 1, analytics: true, marketing: false, savedAt: Date.now() } }), navigator: { doNotTrack: options.doNotTrack || null, globalPrivacyControl: options.gpc || false },
    localStorage: options.storageBlocked ? { getItem() { throw Error('Blocked'); }, setItem() { throw Error('Blocked'); } } : {
      getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value),
    },
    ...(options.queue ? {} : { gtag: (...args) => { if (options.tagThrows) throw Error('Blocked tag'); events.push(args); } }),
  };
  function load(name) {
    const filename = path.join(__dirname, '../src/lib', `${name}.ts`);
    const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
    const module = { exports: {} };
    vm.runInNewContext(source, { module, exports: module.exports, window, process: { env: { NEXT_PUBLIC_GA_MEASUREMENT_ID: options.disabled ? '' : 'G-TEST' } }, require: value => load(value.replace('./', '')) }, { filename });
    return module.exports;
  }
  return { api: load('ecommerceAnalytics'), events, storage, window };
}

test('item views and cart increments use USD and only public item fields', () => {
  const { api, events } = setup();
  assert.equal(api.trackViewItem({ ...product, email: 'private@example.invalid' }), true);
  assert.equal(api.trackAddToCart(product, 2), true);
  assert.equal(events[0][1], 'view_item');
  assert.equal(events[0][2].currency, 'USD');
  assert.equal(events[0][2].value, 17);
  assert.equal(events[1][2].value, 34);
  assert.equal(events[1][2].items[0].quantity, 2);
  assert.ok(!JSON.stringify(events).includes('private@example.invalid'));
  assert.equal(api.trackAddToCart(product, -1), false);
  assert.equal(api.trackAddToCart({ productId }, 1), true);
  assert.equal(events[2][2].value, undefined, 'Unknown first-add price must not invent revenue');
});

test('checkout uses the reviewed server quote and deduplicates the same attempt', () => {
  const { api, events } = setup();
  const quote = { quoteId: 'private-signed-quote', currency: 'USD', subtotalCents: 3400, discountCents: 200, orderItems: [{ product: productId, name: product.name, quantity: 2, price: 17 }], destinationCountry: 'Private country', contactPhone: 'Private phone' };
  assert.equal(api.trackBeginCheckout(quote), true);
  assert.equal(api.trackBeginCheckout(quote), false);
  assert.equal(events[0][2].value, 32);
  assert.ok(!JSON.stringify(events).includes('private-signed-quote'));
  assert.ok(!JSON.stringify(events).includes('Private'));
  assert.equal(api.trackBeginCheckout({ ...quote, quoteId: 'wrong', currency: 'THB' }), false);
});

test('purchase requires both verified paid status and the matching authoritative paid order', () => {
  const { api, events } = setup();
  for (const result of [null, { success: true, isPaid: false, order: { _id: orderId } }, { success: false, isPaid: true, order: { _id: orderId } }]) assert.equal(api.trackVerifiedPurchase(result, order), false);
  for (const invalid of [{ ...order, isPaid: false }, { ...order, _id: productId }, { ...order, totalAmount: NaN }, { ...order, currency: 'THB' }, { ...order, orderItems: [{ product: productId, price: 17 }] }]) assert.equal(api.trackVerifiedPurchase(verification, invalid), false);
  assert.equal(events.length, 0);
  assert.equal(api.trackVerifiedPurchase(verification, order), true);
  const payload = events[0][2];
  assert.equal(payload.transaction_id, orderId);
  assert.equal(payload.value, 32);
  assert.equal(payload.shipping, 5);
  assert.equal(payload.currency, 'USD');
  assert.ok(!JSON.stringify(events).includes('Private'));
  assert.ok(!JSON.stringify(events).includes('private@example.invalid'));
  assert.ok(!JSON.stringify(events).includes('PRIVATE-CODE'));
});

test('paid order IDs prevent repeat purchases across remounts and reloads', () => {
  const storage = new Map();
  const first = setup({ storage });
  assert.equal(first.api.trackVerifiedPurchase(verification, order), true);
  assert.equal(first.api.trackVerifiedPurchase(verification, order), false);
  const reload = setup({ storage });
  assert.equal(reload.api.trackVerifiedPurchase(verification, order), false);
  assert.equal(reload.events.length, 0);
});

test('blocked analytics never throws or prevents a later valid receipt event', () => {
  const blocked = setup({ tagThrows: true, storageBlocked: true });
  assert.equal(blocked.api.trackViewItem(product), false);
  assert.equal(blocked.api.trackVerifiedPurchase(verification, order), false);
  const noStorage = setup({ storageBlocked: true });
  assert.equal(noStorage.api.trackVerifiedPurchase(verification, order), true);
  assert.equal(noStorage.api.trackVerifiedPurchase(verification, order), false);
  const queued = setup({ queue: true });
  assert.equal(queued.api.trackViewItem(product), true);
  assert.equal(Array.from(queued.window.dataLayer[0])[1], 'view_item');
  assert.equal(setup({ doNotTrack: '1' }).api.trackViewItem(product), false);
  assert.equal(setup({ disabled: true }).api.trackViewItem(product), false);
});


test('optional commerce measurement requires an active choice, including receipt storage', () => {
  const disabled = setup({ noConsent: true });
  assert.equal(disabled.api.trackViewItem(product), false);
  assert.equal(disabled.api.trackVerifiedPurchase(verification, order), false);
  assert.equal(disabled.events.length, 0);
  assert.equal(disabled.storage.size, 0);
  const expired = setup();
  expired.window.gjPrivacyChoice.savedAt = Date.now() - 181 * 86400000;
  assert.equal(expired.api.trackViewItem(product), false);
  const withdrawn = setup();
  withdrawn.window.gjPrivacyChoice.analytics = false;
  assert.equal(withdrawn.api.trackVerifiedPurchase(verification, order), false);
  assert.equal(setup({ gpc: true }).api.trackViewItem(product), false);
});
