// A successful API request is not necessarily a paid Stripe session.
// The shop API deliberately returns success:true with isPaid:false while unpaid.
export function confirmedOrderId(result: unknown): string | null {
  if (!result || typeof result !== 'object') return null;
  const response = result as { success?: unknown; isPaid?: unknown; order?: { _id?: unknown } };
  if (response.success !== true || response.isPaid !== true ||
      typeof response.order?._id !== 'string' || !/^[a-f\d]{24}$/i.test(response.order._id)) return null;
  return response.order._id;
}

interface BasketLine { productId: string; quantity: number; colour?: string }
const lineKey = (item: BasketLine) => `${item.productId}:${item.colour || ''}`;

// A customer can add more items in another tab during payment. Remove only the
// quantities in this checkout, and only when its verified order ID matches.
export function remainingCheckoutCart(current: BasketLine[], checkout: unknown, orderId: string): BasketLine[] {
  if (!checkout || typeof checkout !== 'object') return current;
  const pending = checkout as { orderId?: unknown; items?: unknown };
  if (pending.orderId !== orderId || !Array.isArray(pending.items)) return current;
  const purchased = new Map<string, number>();
  for (const item of pending.items) {
    if (!item || typeof item.productId !== 'string' || !/^[a-f\d]{24}$/i.test(item.productId) ||
        !Number.isSafeInteger(item.quantity) || item.quantity < 1) return current;
    purchased.set(lineKey(item), (purchased.get(lineKey(item)) || 0) + item.quantity);
  }
  return current.map(item => ({ ...item, quantity: Math.max(0, item.quantity - (purchased.get(lineKey(item)) || 0)) }))
    .filter(item => item.quantity > 0);
}
