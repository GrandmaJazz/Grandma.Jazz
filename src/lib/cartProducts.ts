import { ProductAPI } from '@/lib/api';
// Share short-lived catalogue reads between drawer and checkout. Quotes remain server-authoritative.
const pending = new Map<string, ReturnType<typeof ProductAPI.getById>>();
export function getCartProduct(id: string) {
  const existing = pending.get(id);
  if (existing) return existing;
  const request = ProductAPI.getById(id);
  pending.set(id, request);
  request.then(() => setTimeout(() => { if (pending.get(id) === request) pending.delete(id); }, 30000), () => pending.delete(id));
  return request;
}
