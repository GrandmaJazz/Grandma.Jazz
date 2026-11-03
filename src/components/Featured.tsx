'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { AnimatedSection } from '@/components/AnimatedSection';
import { ProductAPI } from '@/lib/api';
import { ProductCard } from '@/components/ProductCard';
import Link from 'next/link';
import { AUTO_SCROLL_PX_PER_SECOND, RESUME_AFTER_IDLE_MS, wrapRailPosition } from '@/lib/carouselMotion';

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

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const needsScrolling = featuredProducts.length > 1;

  const loopedProducts = useMemo(() => [0, 1, 2].flatMap(copy =>
    featuredProducts.map(product => ({ ...product, copy }))), [featuredProducts]);

  // Match the quotes: three identical sets and a seamless forward drift.
  // Native touch/wheel scrolling owns the position until the guest is idle.
  useEffect(() => {
    const rail = scrollContainerRef.current;
    const region = containerRef.current;
    if (!needsScrolling || !rail || !region) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0, previous = 0, idleUntil = 0, setWidth = 0;
    let position = rail.scrollLeft, visible = false, held = false, hovered = false;
    const pause = () => { idleUntil = performance.now() + RESUME_AFTER_IDLE_MS; position = rail.scrollLeft; };
    const onScroll = () => { if (Math.abs(rail.scrollLeft - position) > 1) pause(); };
    const down = () => { held = true; pause(); };
    const up = () => { held = false; pause(); };
    const enter = (event: PointerEvent) => { if (event.pointerType === 'mouse') hovered = true; };
    const leave = () => { hovered = false; pause(); };
    const tick = (now: number) => {
      const elapsed = previous ? Math.min(now - previous, 48) : 0;
      previous = now;
      const focused = region.contains(document.activeElement);
      if (!motion.matches && !document.hidden && visible && !held && !hovered && !focused && now > idleUntil) {
        if (setWidth) {
          position = wrapRailPosition(position + AUTO_SCROLL_PX_PER_SECOND * elapsed / 1000, setWidth);
          rail.scrollLeft = position;
        }
      } else position = rail.scrollLeft;
      if (visible && !document.hidden && !motion.matches) frame = requestAnimationFrame(tick);
    };
    const sync = () => {
      cancelAnimationFrame(frame); previous = 0;
      if (visible && !document.hidden && !motion.matches) frame = requestAnimationFrame(tick);
    };
    const measure = () => {
      const cards = rail.querySelectorAll<HTMLElement>('[data-featured-card]');
      if (!cards[featuredProducts.length]) return;
      const phase = setWidth ? (rail.scrollLeft - setWidth) / setWidth : 0;
      setWidth = cards[featuredProducts.length].offsetLeft - cards[0].offsetLeft;
      position = wrapRailPosition(setWidth * (1 + phase), setWidth);
      rail.scrollLeft = position;
      previous = 0;
    };
    measure();
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(rail);
    const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); });
    observer.observe(region);
    region.addEventListener('pointerdown', down, { passive: true });
    region.addEventListener('pointerenter', enter);
    region.addEventListener('pointerleave', leave);
    region.addEventListener('wheel', pause, { passive: true });
    region.addEventListener('focusin', pause);
    region.addEventListener('focusout', pause);
    rail.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pointerup', up, { passive: true });
    window.addEventListener('pointercancel', up, { passive: true });
    document.addEventListener('visibilitychange', sync);
    motion.addEventListener('change', sync);
    return () => {
      cancelAnimationFrame(frame); observer.disconnect(); resizeObserver.disconnect();
      region.removeEventListener('pointerdown', down);
      region.removeEventListener('pointerenter', enter);
      region.removeEventListener('pointerleave', leave);
      region.removeEventListener('wheel', pause);
      region.removeEventListener('focusin', pause);
      region.removeEventListener('focusout', pause);
      rail.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      document.removeEventListener('visibilitychange', sync);
      motion.removeEventListener('change', sync);
    };
  }, [needsScrolling, featuredProducts, containerRef, scrollContainerRef]);

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
          <div className="flex gap-6">
            {loopedProducts.map((product) => (
              <div
                key={`${product.copy}-${product._id}`}
                data-featured-card data-product-id={product._id} data-product-copy={product.copy}
                className="flex-shrink-0 w-[280px] sm:w-[300px] md:w-[320px] lg:w-[350px]"
              >
                <ProductCard {...product} />
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
              <ProductCard {...product} />
            </div>
          ))}
        </div>
      );
    }
  }, [isLoading, featuredProducts, loopedProducts, needsScrolling, scrollContainerRef]);

  return (
    <AnimatedSection animation="fadeIn" className="w-full py-16 sm:py-24 bg-[#0A0A0A] text-[#F5F1E6] px-6 relative">
      {/* Ambient background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-40 mix-blend-soft-light">
        <div className="absolute top-0 left-0 w-1/3 h-1/2 rounded-full bg-[#B49B73]/10 blur-[150px] transform -translate-x-1/2"></div>
        <div className="absolute bottom-0 right-0 w-1/2 h-1/2 rounded-full bg-[#B49B73]/10 blur-[180px] transform translate-x-1/4"></div>
      </div>

      {/* Section header with title and button side by side */}
      <div className="max-w-7xl mx-auto mb-10">
        <div className="flex flex-wrap justify-between items-center gap-y-6">
          <div className="w-full sm:w-auto">
            <p className="uppercase tracking-[0.25em] text-[#B49B73]/70 text-xs sm:text-sm font-label-mono mb-2">
              From The Counter
            </p>
            <h2 className="gj-display-title">
              Take a little home.
            </h2>
            <p className="gj-section-copy mt-4">
              Not a logo — a feeling.
            </p>
          </div>

          <Link href="/products/" className="gj-cta">
              View all <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>

      {/* Products container */}
      <div ref={containerRef} className="max-w-7xl mx-auto relative">
        {/* Render the memoized product grid */}
        {productGrid}
      </div>

      {/* Footer accent */}
      <div className="mt-12 flex items-center justify-center w-full max-w-lg mx-auto">
        <div className="gj-divider border-t w-full"></div>
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
