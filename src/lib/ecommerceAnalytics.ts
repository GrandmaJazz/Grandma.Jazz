import type { CheckoutQuote } from './checkout';
import { confirmedOrderId } from './paymentConfirmation';
import { permitsAnalytics } from './privacyChoices';

type AnalyticsItem = { item_id: string; item_name?: string; item_category?: string; price?: number; quantity: number };
type Parameters = { currency: 'USD'; items: AnalyticsItem[]; value?: number; shipping?: number; transaction_id?: string };
type Product = { _id?: string; productId?: string; name?: string; category?: string; price?: number };
type AnalyticsWindow = Window & { gtag?: (...args: unknown[]) => void; dataLayer?: unknown[] };

const purchases = new Set<string>();
const checkouts = new Set<string>();
const purchaseStorageKey = 'gj-analytics-paid-orders-v1';
const money = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const rounded = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

function item(product: Product, quantity = 1): AnalyticsItem | null {
  if (!product || typeof product !== 'object') return null;
  const id = product._id || product.productId;
  if (!id || !/^[a-f\d]{24}$/i.test(id) || !Number.isSafeInteger(quantity) || quantity < 1) return null;
  return {
    item_id: id, quantity,
    ...(typeof product.name === 'string' ? { item_name: product.name.slice(0, 160) } : {}),
    ...(typeof product.category === 'string' ? { item_category: product.category.slice(0, 80) } : {}),
    ...(money(product.price) ? { price: rounded(product.price) } : {}),
  };
}

// Only these commerce fields cross the analytics boundary. Do not spread an
// order/quote/customer object here: it contains email, address and phone data.
function emit(event: 'view_item' | 'add_to_cart' | 'begin_checkout' | 'purchase', parameters: Parameters): boolean {
  try {
    if (typeof window === 'undefined' || !process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || !permitsAnalytics()) return false;
    if (window.navigator.doNotTrack === '1' || (window.navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl) return false;
    const target = window as AnalyticsWindow;
    if (typeof target.gtag === 'function') target.gtag('event', event, parameters);
    else {
      // Match Google's gtag argument queue when hydration beats afterInteractive.
      const layer = target.dataLayer = target.dataLayer || [];
      function enqueue(_command: string, _event: string, _parameters: Parameters) { layer.push(arguments); }
      enqueue('event', event, parameters);
    }
    return true;
  } catch { return false; } // Blocked storage/tags must never interrupt shopping.
}

export function trackViewItem(product: Product) {
  const entry = item(product);
  return !!entry && emit('view_item', { currency: 'USD', items: [entry], ...(money(product.price) ? { value: rounded(product.price) } : {}) });
}

export function trackAddToCart(product: Product, quantity: number) {
  const entry = item(product, quantity);
  return !!entry && emit('add_to_cart', { currency: 'USD', items: [entry], ...(money(product.price) ? { value: rounded(product.price * quantity) } : {}) });
}

export function trackBeginCheckout(quote: CheckoutQuote) {
  if (!quote || quote.currency !== 'USD' || typeof quote.quoteId !== 'string' || !quote.quoteId || checkouts.has(quote.quoteId) ||
      !Number.isSafeInteger(quote.subtotalCents) || !Number.isSafeInteger(quote.discountCents) || quote.discountCents < 0 || quote.subtotalCents < quote.discountCents || !Array.isArray(quote.orderItems)) return false;
  const entries = quote.orderItems.map(line => line && typeof line === 'object' ? item({ ...line, productId: line.product }, line.quantity) : null);
  if (!entries.length || entries.some(entry => !entry || !money(entry.price))) return false;
  const sent = emit('begin_checkout', { currency: 'USD', value: (quote.subtotalCents - quote.discountCents) / 100, items: entries as AnalyticsItem[] });
  if (sent) { checkouts.add(quote.quoteId); if (checkouts.size > 200) checkouts.delete(checkouts.values().next().value!); }
  return sent;
}

export function trackVerifiedPurchase(verification: unknown, authoritativeOrder: unknown) {
  const id = confirmedOrderId(verification);
  if (!id || !authoritativeOrder || typeof authoritativeOrder !== 'object') return false;
  const order = authoritativeOrder as { _id?: unknown; isPaid?: unknown; currency?: unknown; totalAmount?: unknown; shippingCost?: unknown; orderItems?: unknown };
  if (order._id !== id || order.isPaid !== true || (order.currency !== undefined && order.currency !== 'USD') ||
      !money(order.totalAmount) || !money(order.shippingCost) || order.totalAmount < order.shippingCost || !Array.isArray(order.orderItems)) return false;
  const entries = order.orderItems.map(line => {
    if (!line || typeof line !== 'object') return null;
    const value = line as { product?: string | { _id?: string }; name?: string; price?: number; quantity?: number };
    if (!Number.isSafeInteger(value.quantity) || !value.quantity || value.quantity < 1) return null;
    return item({ productId: typeof value.product === 'string' ? value.product : value.product?._id, name: value.name, price: value.price }, value.quantity);
  });
  if (!entries.length || entries.some(entry => !entry || !money(entry.price))) return false;
  try {
    if (typeof window === 'undefined' || !permitsAnalytics()) return false;
    let stored: string[] = [];
    try {
      const value = JSON.parse(window.localStorage.getItem(purchaseStorageKey) || '[]');
      if (Array.isArray(value)) stored = value.filter(entry => typeof entry === 'string' && /^[a-f\d]{24}$/i.test(entry));
    } catch { /* Memory and GA's transaction_id deduplication still apply. */ }
    if (purchases.has(id) || stored.includes(id)) return false;
    const sent = emit('purchase', {
      currency: 'USD', transaction_id: id, value: rounded(order.totalAmount - order.shippingCost),
      shipping: rounded(order.shippingCost), items: entries as AnalyticsItem[],
    });
    if (sent) {
      purchases.add(id);
      try { window.localStorage.setItem(purchaseStorageKey, JSON.stringify([...stored, id].slice(-100))); } catch { /* Optional analytics persistence. */ }
    }
    return sent;
  } catch { return false; }
}
