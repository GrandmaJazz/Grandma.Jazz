import { cache } from 'react';
import type { SeoProduct } from './productSeo';

export const getProduct = cache(async (id: string): Promise<SeoProduct | null> => {
  if (!/^[a-f0-9]{24}$/i.test(id)) return null;
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products/${id}`, {
    cache: 'no-store', signal: AbortSignal.timeout(15000),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Product fetch failed: ${res.status}`);
  const data = await res.json();
  return data.product ?? null;
});

export async function getRelatedProducts(product: SeoProduct): Promise<SeoProduct[]> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products?category=${encodeURIComponent(product.category)}`, {
      cache: 'no-store', signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.products ?? []).filter((p: SeoProduct) => p._id !== product._id).slice(0, 4);
  } catch { return []; }
}
