'use client';

import { useEffect, useState, useRef } from 'react';
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

export default function Featured() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [needsScrolling, setNeedsScrolling] = useState(false);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchFeaturedProducts() {
      setIsLoading(true);
      try {
        const data = await ProductAPI.getAll(undefined, true);
        setFeaturedProducts(data.products.slice(0, 4)); // แสดงสูงสุด 4 รายการ
      } catch (error) {
        console.error('Error fetching featured products:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchFeaturedProducts();
  }, []);

  // ตรวจสอบว่าจำเป็นต้องมีการสไลด์หรือไม่
  useEffect(() => {
    function checkNeedsScrolling() {
      if (!containerRef.current || featuredProducts.length === 0) return;
      
      const container = containerRef.current;
      const containerWidth = container.clientWidth;
      
      // กำหนดขนาดการ์ดขั้นต่ำที่เหมาะสม
      const minCardWidth = 220; // ขนาดการ์ดที่เล็กที่สุดที่ยังสวยงาม
      const gap = 16; // ระยะห่างระหว่างการ์ด
      
      // คำนวณความกว้างที่ต้องการสำหรับ 4 การ์ด
      const requiredWidth = (minCardWidth * 4) + (gap * 3);
      
      // ถ้าความกว้างของคอนเทนเนอร์น้อยกว่าความกว้างที่ต้องการ ให้ใช้การสไลด์
      setNeedsScrolling(containerWidth < requiredWidth);
      
      // ถ้าจำเป็นต้องสไลด์ ให้ตรวจสอบว่าควรแสดงลูกศรขวาหรือไม่
      if (containerWidth < requiredWidth) {
        setShowRightArrow(true);
      }
    }
    
    checkNeedsScrolling();
    window.addEventListener('resize', checkNeedsScrolling);
    
    return () => {
      window.removeEventListener('resize', checkNeedsScrolling);
    };
  }, [featuredProducts]);

  // ตรวจสอบว่าควรแสดงลูกศรหรือไม่
  const checkArrows = () => {
    if (!scrollContainerRef.current || !needsScrolling) return;
    
    const container = scrollContainerRef.current;
    
    // ตรวจสอบว่าสามารถเลื่อนไปทางซ้ายได้หรือไม่
    setShowLeftArrow(container.scrollLeft > 0);
    
    // ตรวจสอบว่าสามารถเลื่อนไปทางขวาได้หรือไม่
    const hasMoreToScroll = container.scrollWidth > container.clientWidth + container.scrollLeft;
    setShowRightArrow(hasMoreToScroll);
  };

  // เพิ่ม event listener สำหรับตรวจสอบการเลื่อน
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container && needsScrolling) {
      container.addEventListener('scroll', checkArrows);
      setTimeout(checkArrows, 100);
    }
    
    return () => {
      if (container) {
        container.removeEventListener('scroll', checkArrows);
      }
    };
  }, [needsScrolling, featuredProducts]);

  // ฟังก์ชันสำหรับเลื่อนไปทางซ้าย
  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const cardWidth = container.querySelector('div')?.clientWidth || 300;
      const scrollAmount = cardWidth + 16; // ความกว้างการ์ด + gap
      
      container.scrollBy({
        left: -scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // ฟังก์ชันสำหรับเลื่อนไปทางขวา
  const scrollRight = () => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const cardWidth = container.querySelector('div')?.clientWidth || 300;
      const scrollAmount = cardWidth + 16; // ความกว้างการ์ด + gap
      
      container.scrollBy({
        left: scrollAmount,
        behavior: 'smooth'
      });
    }
  };

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
      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center">
          <div className="w-14 h-14 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-[#e3dcd4] animate-pulse font-suisse-intl-mono text-sm tracking-wider uppercase">Loading featured products</p>
        </div>
      ) : featuredProducts.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-2xl text-[#e3dcd4]">No featured products found</p>
        </div>
      ) : (
        <div ref={containerRef} className="max-w-7xl mx-auto relative">
          {/* Arrow Controls - แสดงเฉพาะเมื่อจำเป็นต้องสไลด์ */}
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
          
          {needsScrolling ? (
            // แสดงแบบสไลด์ได้เมื่อจำเป็น
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
          ) : (
            // แสดงแบบ grid เต็มจอเมื่อหน้าจอกว้างพอ
            <div className="grid grid-cols-4 gap-4 md:gap-6 pb-6">
              {featuredProducts.map((product) => (
                <div key={product._id}>
                  <ProductCard {...product} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Footer accent */}
      <div className="mt-12 flex items-center justify-center w-full max-w-lg mx-auto">
        <div className="h-0.5 bg-gradient-to-r from-transparent via-[#7c4d33] to-transparent w-full"></div>
      </div>

      {/* CSS ซ่อน scrollbar */}
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