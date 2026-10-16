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
import { ArrowRight } from 'lucide-react';
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
                className="gj-cta select-none"
              >
                {category.name}
              </button>
            ))}
            <a
              href="/garments/"
              aria-label="Garments magazine"
              className="group gj-shop-publication-link inline-flex items-center justify-center gap-3 py-3 px-6 sm:py-4 sm:px-8 rounded-control border-[1.5px] border-[#B49B73]/70 text-[#B49B73] hover:bg-[#B49B73] hover:text-[#0A0A0A] hover:border-[#B49B73] transition-[background-color,border-color,color,transform] duration-200 ease-out hover:-translate-y-px active:translate-y-0 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B49B73]"
            >
              <Image src="/images/garments.png" alt="Garments" width={1031} height={218} className="h-4 w-auto transition-[filter] duration-200 group-hover:brightness-0" />
              <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.5} />
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
