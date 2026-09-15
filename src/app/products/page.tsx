// src/app/products/page.tsx
//
// Server-rendered, same pattern as /blogs. Every product name, price and
// /products/<id> link is in the HTML on first paint.
//
// Before this rebuild the page was 'use client' and fetched on mount, so the
// raw HTML Google received was ~50 words with zero internal links — the
// weakest indexed page on the site and the next Soft 404 waiting to happen.
// Category filtering now happens in memory in ProductsBrowser, so tapping a
// tab is instant instead of a round trip.

import Link from 'next/link';
import { ProductsBrowser, type BrowsableProduct } from '@/components/ProductsBrowser';
import { AnimatedSection } from '@/components/AnimatedSection';
import { MusicProtectedRoute } from '@/components/MusicProtectedRoute';
import Contact from '@/components/Contact';

export const revalidate = 300;

const SITE = 'https://www.grandmajazz.com';

async function getProducts(): Promise<BrowsableProduct[]> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.products ?? []) as BrowsableProduct[];
  } catch (error) {
    console.error('Products: could not fetch products', error);
    return [];
  }
}

const breadcrumbJsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: SITE },
    { '@type': 'ListItem', position: 2, name: 'Shop', item: `${SITE}/products` },
  ],
});

function itemListJsonLd(products: BrowsableProduct[]) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Grandma Jazz shop',
    numberOfItems: products.length,
    itemListElement: products.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Product',
        name: p.name,
        description: p.description,
        image: p.images?.[0],
        url: `${SITE}/products/${p._id}`,
        offers: {
          '@type': 'Offer',
          price: p.price,
          priceCurrency: 'THB',
          availability: p.isOutOfStock
            ? 'https://schema.org/OutOfStock'
            : 'https://schema.org/InStock',
        },
      },
    })),
  });
}

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <MusicProtectedRoute>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd }}
      />
      {products.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: itemListJsonLd(products) }}
        />
      )}

      <div className="min-h-screen pt-24 pb-16 bg-[#181818] relative overflow-hidden">
        {/* Ambient background elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-40 mix-blend-soft-light">
          <div className="absolute top-0 left-0 w-1/3 h-1/2 rounded-full bg-[#7c4d33]/10 blur-[150px] transform -translate-x-1/2"></div>
          <div className="absolute bottom-0 right-0 w-1/2 h-1/2 rounded-full bg-[#B49B73]/10 blur-[180px] transform translate-x-1/4"></div>
        </div>

        {/* Noise texture overlay */}
        <div
          className="absolute inset-0 opacity-20 mix-blend-overlay pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            backgroundSize: '150px',
            backgroundRepeat: 'repeat',
          }}
        />

        {/* Header */}
        <AnimatedSection animation="fadeIn" className="pt-2 pb-6 px-4 relative">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-editorial-ultralight text-[#F5F1E6] mb-4 leading-tight">
              Shop <span className="text-[#B49B73]">All</span>
            </h1>
            <div className="h-0.5 bg-gradient-to-r from-transparent via-[#7c4d33] to-transparent w-48 mx-auto"></div>
          </div>
        </AnimatedSection>

        {/* Intro copy — real words on the page, for people and for Google */}
        <AnimatedSection animation="fadeIn" className="px-4 relative">
          <div className="max-w-3xl mx-auto text-[#e3dcd4]/75 font-roboto-light space-y-4 leading-relaxed mb-4">
            <p>
              Everything here is made to be kept. Bamboo holders hand-carved by family in Thailand,
              grinders and trays that outlast the thing they replaced, Phuket-roasted coffee, loose-leaf
              teas, and upcycled garments given a second life. No plastic in the packaging — not a
              wrapper, not a window, not a bag.
            </p>
            <p>
              We ship across Thailand, and everything here is also on the shelf at the café in Kamala.
              If you&apos;d rather see it first, come up the hill — our{' '}
              <Link href="/blogs/visiting-grandma-jazz-a-guide-to-finding-us/" className="text-[#B49B73] underline underline-offset-4 hover:text-[#e3dcd4] transition-colors duration-200">
                guide to finding us
              </Link>{' '}
              has directions, and there&apos;s a{' '}
              <Link href="/events/" className="text-[#B49B73] underline underline-offset-4 hover:text-[#e3dcd4] transition-colors duration-200">
                quiz night every Saturday
              </Link>{' '}
              if you want an excuse. More on why we do it this way in the{' '}
              <Link href="/blogs/" className="text-[#B49B73] underline underline-offset-4 hover:text-[#e3dcd4] transition-colors duration-200">
                journal
              </Link>
              .
            </p>
          </div>
        </AnimatedSection>

        <ProductsBrowser products={products} />
      </div>
      <Contact />
    </MusicProtectedRoute>
  );
}
