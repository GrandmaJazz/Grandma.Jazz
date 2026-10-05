import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ProductDetail from '@/components/ProductDetail';
import { getProduct, getRelatedProducts } from '@/lib/productCatalog';
import { productSchema } from '@/lib/productSeo';
import { SITE_URL, serializeJsonLd } from '@/lib/structuredData';

export const dynamic = 'force-dynamic';

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
    <ProductDetail key={id} product={product} relatedProducts={await getRelatedProducts(product)} />
  </>;
}
