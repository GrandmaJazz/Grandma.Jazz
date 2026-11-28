'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { AnimatedSection } from '@/components/AnimatedSection';
import { ProductAPI } from '@/lib/api';
import { ProductCard } from '@/components/ProductCard';
import Link from 'next/link';
import { attachRailGlide } from '@/lib/carouselMotion';

interface Product {
  _id: string;
  name: string;
  price: number;
  images: string[];
  description: string;
  isOutOfStock: boolean;
  isFeatured: boolean;
}

export default function Featured() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mediaNearby, setMediaNearby] = useState(false);
  const mediaRegion = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = mediaRegion.current;
    if (!el || mediaNearby) return;
    if (typeof IntersectionObserver === 'undefined') { setMediaNearby(true); return; }
    // WebKit may never schedule lazy images inside a looping horizontal rail.
    // Warm the catalogue only as the visitor approaches this section.
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setMediaNearby(true); observer.disconnect(); }
    }, { rootMargin: '500px 0px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [mediaNearby]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const needsScrolling = featuredProducts.length > 1;

  // A sparse catalogue needs extra runway so a wide viewport never sees the seam.
  const loopedProducts = useMemo(() => Array.from({ length: featuredProducts.length < 4 ? 4 : 3 }, (_, copy) => copy).flatMap(copy =>
    featuredProducts.map(product => ({ ...product, copy }))), [featuredProducts]);

  useEffect(() => {
    if (!isLoading && needsScrolling && scrollContainerRef.current && trackRef.current) {
      return attachRailGlide(scrollContainerRef.current, trackRef.current, featuredProducts.length, { nativePaintSafe: true });
    }
  }, [isLoading, needsScrolling, featuredProducts.length]);

  // Load the full published product catalogue for the counter rail.
  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      setIsLoading(true);
      try {
        const data = await ProductAPI.getAll();
        setFeaturedProducts(data.products);
      } catch (error) {
        console.error('Error fetching featured products:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeaturedProducts();
  }, []);

  // Memoize the product grid to avoid unnecessary re-renders
  const productGrid = useMemo(() => {
    if (isLoading) {
      return (
        <div className="py-12 text-center bg-[#0A0A0A]" role="status">
          <p className="text-[#e3dcd4]/70 font-label-mono text-sm tracking-wide">Finding pieces from the counter…</p>
        </div>
      );
    }

    if (featuredProducts.length === 0) {
      return (
        <div className="py-12 text-center">
          <p className="text-2xl text-[#e3dcd4]">No products found</p>
        </div>
      );
    }

    if (needsScrolling) {
      // Scrollable horizontal layout
      return (
        <div
          ref={scrollContainerRef}
          className="overflow-x-auto pt-2 pb-6 hide-scrollbar focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#B49B73]"
          role="region" aria-label="Products from the counter" tabIndex={0}
        >
          <div ref={trackRef} className="flex w-max gap-6">
            {loopedProducts.map((product) => (
              <div
                key={`${product.copy}-${product._id}`}
                data-featured-card data-product-id={product._id} data-product-copy={product.copy}
                className="flex-shrink-0 w-[280px] sm:w-[300px] md:w-[320px] lg:w-[350px]"
              >
                <ProductCard {...product} eagerImage={mediaNearby} deferLinkPrefetch />
              </div>
            ))}
          </div>
        </div>
      );
    } else {
      // Grid layout for larger screens
      return (
        <div className="grid grid-cols-4 gap-4 md:gap-6 pb-6">
          {featuredProducts.map((product) => (
            <div key={product._id}>
              <ProductCard {...product} eagerImage={mediaNearby} deferLinkPrefetch />
            </div>
          ))}
        </div>
      );
    }
  }, [isLoading, featuredProducts, loopedProducts, needsScrolling, scrollContainerRef, mediaNearby]);

  return (
    <AnimatedSection animation="fadeIn" className="w-full pt-16 pb-6 sm:pt-24 sm:pb-8 bg-[#0A0A0A] text-[#F5F1E6] px-6 relative">
      {/* Ambient background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-40 mix-blend-soft-light">
        <div className="absolute top-0 left-0 w-1/3 h-1/2 rounded-full bg-[#B49B73]/10 blur-[150px] transform -translate-x-1/2"></div>
        <div className="absolute bottom-0 right-0 w-1/2 h-1/2 rounded-full bg-[#B49B73]/10 blur-[180px] transform translate-x-1/4"></div>
      </div>

      {/* Section header with title and button side by side */}
      <div className="max-w-7xl mx-auto mb-10">
        <div className="flex flex-wrap justify-between items-center gap-y-6">
          <div className="w-full sm:w-auto sm:max-w-2xl">
            <p className="uppercase tracking-[0.25em] text-[#B49B73]/70 text-xs sm:text-sm font-label-mono mb-2">
              From The Counter
            </p>
            <h2 className="gj-display-title">
              Take <span className="gj-title-accent">a</span> little home.
            </h2>
            <p className="gj-section-copy mt-4">
              Bamboo holders carved by family, Phuket-roasted coffee, things made to last and clothes worth wearing again.
            </p>
            <p className="gj-section-copy mt-4">
              <strong className="gj-copy-highlight">Little reminders of a place you found along the way.</strong>
            </p>
          </div>

          <Link href="/products/" className="gj-cta">
              Shop the collection <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>

      {/* Products container */}
      <div ref={mediaRegion} className="max-w-7xl mx-auto relative">
        {/* Render the memoized product grid */}
        {productGrid}
      </div>

      {/* CSS for scrollbar hiding */}
      <style jsx global>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </AnimatedSection>
  );
}
