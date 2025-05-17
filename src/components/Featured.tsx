'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { AnimatedSection } from '@/components/AnimatedSection';
import { ProductAPI } from '@/lib/api';
import { ProductCard } from '@/components/ProductCard';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

interface Product {
  _id: string;
  name: string;
  price: number;
  images: string[];
  description: string;
  isOutOfStock: boolean;
  isFeatured: boolean;
}

// Define a custom hook for responsive layout management
const useResponsiveGrid = (featuredProducts: Product[]) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const [layoutState, setLayoutState] = useState({
    needsScrolling: false,
    showLeftArrow: false,
    showRightArrow: false
  });
  
  // Check if scrolling is needed based on container width vs content width
  const checkLayout = useCallback(() => {
    if (!containerRef.current || featuredProducts.length === 0) return;
    
    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    
    // Calculate minimum card width and spacing
    const minCardWidth = 220;
    const gap = 16;
    
    // Calculate required width for all products
    const requiredWidth = (minCardWidth * featuredProducts.length) + (gap * (featuredProducts.length - 1));
    
    const needsScrolling = containerWidth < requiredWidth;
    
    setLayoutState(prev => ({
      ...prev,
      needsScrolling,
      showRightArrow: needsScrolling
    }));
  }, [featuredProducts]);
  
  // Check if arrows should be displayed based on scroll position
  const checkArrows = useCallback(() => {
    if (!scrollContainerRef.current || !layoutState.needsScrolling) return;
    
    const container = scrollContainerRef.current;
    
    // Show left arrow if not at start
    const showLeftArrow = container.scrollLeft > 0;
    
    // Show right arrow if more content to scroll
    const hasMoreToScroll = container.scrollWidth > container.clientWidth + container.scrollLeft;
    
    setLayoutState(prev => ({
      ...prev,
      showLeftArrow,
      showRightArrow: hasMoreToScroll
    }));
  }, [layoutState.needsScrolling]);
  
  // Scroll handler functions
  const scrollLeft = useCallback(() => {
    if (!scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    const cardWidth = container.querySelector('div')?.clientWidth || 300;
    const scrollAmount = cardWidth + 16;
    
    container.scrollBy({
      left: -scrollAmount,
      behavior: 'smooth'
    });
  }, []);
  
  const scrollRight = useCallback(() => {
    if (!scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    const cardWidth = container.querySelector('div')?.clientWidth || 300;
    const scrollAmount = cardWidth + 16;
    
    container.scrollBy({
      left: scrollAmount,
      behavior: 'smooth'
    });
  }, []);
  
  return {
    refs: { containerRef, scrollContainerRef },
    layout: layoutState,
    functions: { checkLayout, checkArrows, scrollLeft, scrollRight }
  };
};

export default function Featured() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Use our custom hook for responsive layout
  const { 
    refs: { containerRef, scrollContainerRef }, 
    layout: { needsScrolling, showLeftArrow, showRightArrow },
    functions: { checkLayout, checkArrows, scrollLeft, scrollRight }
  } = useResponsiveGrid(featuredProducts);
  
  // Fetch featured products once on component mount
  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      setIsLoading(true);
      try {
        const data = await ProductAPI.getAll(undefined, true);
        setFeaturedProducts(data.products.slice(0, 4));
      } catch (error) {
        console.error('Error fetching featured products:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeaturedProducts();
  }, []);

  // Setup responsive layout after products are loaded
  useEffect(() => {
    if (featuredProducts.length > 0) {
      checkLayout();
      
      // Add window resize listener with debounce
      let resizeTimer: NodeJS.Timeout;
      const handleResize = () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          checkLayout();
          checkArrows();
        }, 200);
      };
      
      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
        clearTimeout(resizeTimer);
      };
    }
  }, [featuredProducts, checkLayout, checkArrows]);

  // Setup scroll event listeners
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container && needsScrolling) {
      const handleScroll = () => {
        // Use requestAnimationFrame to optimize scroll performance
        requestAnimationFrame(checkArrows);
      };
      
      container.addEventListener('scroll', handleScroll, { passive: true });
      
      // Initial check after a brief delay to ensure correct measurements
      setTimeout(checkArrows, 100);
      
      return () => {
        container.removeEventListener('scroll', handleScroll);
      };
    }
  }, [needsScrolling, checkArrows]);

  // Memoize the product grid to avoid unnecessary re-renders
  const productGrid = useMemo(() => {
    if (isLoading) {
      return (
        <div className="py-16 flex flex-col items-center justify-center">
          <div className="w-14 h-14 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-[#e3dcd4] animate-pulse font-suisse-intl-mono text-sm tracking-wider uppercase">Loading featured products</p>
        </div>
      );
    }
    
    if (featuredProducts.length === 0) {
      return (
        <div className="py-12 text-center">
          <p className="text-2xl text-[#e3dcd4]">No featured products found</p>
        </div>
      );
    }
    
    if (needsScrolling) {
      // Scrollable horizontal layout
      return (
        <div 
          ref={scrollContainerRef} 
          className="overflow-x-auto pb-6 hide-scrollbar"
        >
          <div className="flex gap-4">
            {featuredProducts.map((product) => (
              <div 
                key={product._id} 
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
  }, [isLoading, featuredProducts, needsScrolling, scrollContainerRef]);

  return (
    <AnimatedSection animation="fadeIn" className="w-full py-16 bg-[#0A0A0A] text-[#F5F1E6] px-4 relative">
      {/* Ambient background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-40 mix-blend-soft-light">
        <div className="absolute top-0 left-0 w-1/3 h-1/2 rounded-full bg-[#7c4d33]/10 blur-[150px] transform -translate-x-1/2"></div>
        <div className="absolute bottom-0 right-0 w-1/2 h-1/2 rounded-full bg-[#b88c41]/10 blur-[180px] transform translate-x-1/4"></div>
      </div>
      
      {/* Section header with title and button side by side */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-wrap justify-between items-center">
          <h2 className="text-[#D4AF37] text-3xl md:text-4xl font-editorial-ultralight">
            Featured Products
          </h2>
          
          <Link href="/products">
            <Button 
              variant="outline" 
              size="md" 
              rounded="full"
              className="mt-2 sm:mt-0 px-6 py-2.5 text-base"
            >
              View All
            </Button>
          </Link>
        </div>
      </div>

      {/* Products container */}
      <div ref={containerRef} className="max-w-7xl mx-auto relative">
        {/* Left Arrow Control */}
        {needsScrolling && showLeftArrow && (
          <button 
            onClick={scrollLeft}
            className="absolute left-0 top-1/2 -translate-y-1/2 -ml-4 z-10 bg-[#0A0A0A] w-10 h-10 rounded-full flex items-center justify-center border border-[#7c4d33]/50 shadow-lg text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-all duration-300"
            aria-label="Scroll left"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
        )}
        
        {/* Right Arrow Control */}
        {needsScrolling && showRightArrow && (
          <button 
            onClick={scrollRight}
            className="absolute right-0 top-1/2 -translate-y-1/2 -mr-4 z-10 bg-[#0A0A0A] w-10 h-10 rounded-full flex items-center justify-center border border-[#7c4d33]/50 shadow-lg text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-all duration-300"
            aria-label="Scroll right"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        )}
        
        {/* Render the memoized product grid */}
        {productGrid}
      </div>
      
      {/* Footer accent */}
      <div className="mt-12 flex items-center justify-center w-full max-w-lg mx-auto">
        <div className="h-0.5 bg-gradient-to-r from-transparent via-[#7c4d33] to-transparent w-full"></div>
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