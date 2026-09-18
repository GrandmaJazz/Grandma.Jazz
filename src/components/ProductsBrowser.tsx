// src/components/ProductsBrowser.tsx
//
// The only interactive part of /products. The page itself is a server
// component that fetches every product and renders the grid into the HTML;
// this component just filters that list in memory.
//
// It used to be the whole page: 'use client' + a fetch per category change,
// which meant Google saw an empty shell (50 words) and visitors waited on a
// round trip every time they tapped a tab. Now both are instant.

'use client';

import { useMemo, useState } from 'react';
import { ProductGrid } from '@/components/ProductGrid';
import { AnimatedSection } from '@/components/AnimatedSection';
import Image from 'next/image';
import { PRODUCT_CATEGORIES } from '@/lib/productCategories';

export interface BrowsableProduct {
  _id: string;
  name: string;
  price: number;
  images: string[];
  description: string;
  isOutOfStock: boolean;
  isFeatured: boolean;
  category?: string;
}

const CATEGORIES = [{ id: 'all', name: 'All Products' }, ...PRODUCT_CATEGORIES.filter((category) => category.id !== 'garments')];

export function ProductsBrowser({ products }: { products: BrowsableProduct[] }) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const visible = useMemo(
    () =>
      selectedCategory === 'all'
        ? products
        : products.filter((p) => p.category === selectedCategory),
    [products, selectedCategory],
  );

  return (
    <>
      <AnimatedSection animation="fadeIn" className="py-4 px-4 mb-2">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-wrap justify-center gap-3 md:gap-4">
            {CATEGORIES.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setSelectedCategory(category.id)}
                aria-pressed={selectedCategory === category.id}
                className={`font-suisse-intl-mono normal-case tracking-tight text-sm py-2.5 px-4 rounded-control border-[1.5px] select-none will-change-transform transition-all duration-200 ease-out hover:-translate-y-px active:translate-y-0 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A] ${
                  selectedCategory === category.id
                    ? 'bg-[#B49B73] text-[#0A0A0A] border-[#B49B73]'
                    : 'bg-transparent border-[#B49B73]/40 text-[#B49B73] hover:bg-[#B49B73]/10 hover:border-[#B49B73]'
                }`}
              >
                {category.name}
              </button>
            ))}
            <a
              href="https://grandmajazz.store/garments/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Garments collection (opens in a new tab)"
              className="inline-flex items-center justify-center py-2.5 px-5 md:px-6 rounded-control border-[1.5px] border-[#B49B73]/60 text-[#B49B73] hover:bg-[#B49B73]/10 hover:border-[#B49B73] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B49B73]"
            >
              <Image src="/images/garments.png" alt="Garments" width={1031} height={218} sizes="(min-width: 768px) 190px, 152px" className="h-8 md:h-10 w-auto max-w-full" />
            </a>
          </div>
        </div>
      </AnimatedSection>

      <p className="text-center font-suisse-intl-mono text-xs tracking-widest uppercase text-[#e3dcd4]/50 mb-6 px-4">
        {visible.length} {visible.length === 1 ? 'item' : 'items'}
      </p>

      <ProductGrid products={visible} />
    </>
  );
}
