import type { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import ProductDetail from '@/components/ProductDetail';
import { ProductGrid } from '@/components/ProductGrid';
import { getProduct, getRelatedProducts } from '@/lib/productCatalog';
import { productSchema, type SeoProduct } from '@/lib/productSeo';
import { SITE_URL, serializeJsonLd } from '@/lib/structuredData';

// The catalogue can be briefly cached; checkout still reloads authoritative
// prices and stock before accepting an order.
export const revalidate = 300;

export function generateStaticParams() { return []; }

async function RelatedProducts({ product }: { product: SeoProduct }) {
  const related = await getRelatedProducts(product);
  return related.length > 0 ? <div className="mt-16"><ProductGrid products={related} title="You Might Also Like" /></div> : null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();
  const url = `${SITE_URL}/products/${product._id}/`;
  return {
    title: product.name, description: product.description,
    alternates: { canonical: url },
    openGraph: {
      title: product.name, description: product.description, url,
      images: product.images.map(url => ({ url, alt: product.name })),
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();
  const schema = productSchema(product);
  const breadcrumbs = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Shop', item: `${SITE_URL}/products/` },
      { '@type': 'ListItem', position: 3, name: product.name, item: `${SITE_URL}/products/${id}/` },
    ],
  };
  return <>
    {schema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(schema) }} />}
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbs) }} />
    <ProductDetail key={id} product={product} relatedProducts={[]} />
    <Suspense fallback={null}><RelatedProducts product={product} /></Suspense>
  </>;
}
