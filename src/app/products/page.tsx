//src/app/products/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { ProductGrid } from '@/components/ProductGrid';
import { ProductAPI } from '@/lib/api';
import { AnimatedSection } from '@/components/AnimatedSection';
import Image from 'next/image';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  const categories = [
    { id: 'all', name: 'All Products' },
    { id: 'vinyl', name: 'Vinyl Records' },
    { id: 'cds', name: 'CDs' },
    { id: 'merchandise', name: 'Merchandise' },
    { id: 'instruments', name: 'Instruments' }
  ];
  
  useEffect(() => {
    async function fetchProducts() {
      setIsLoading(true);
      try {
        const category = selectedCategory === 'all' ? undefined : selectedCategory;
        const data = await ProductAPI.getAll(category);
        setProducts(data.products);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchProducts();
    
    // Add animation keyframes
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeInSlow {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes moveUp {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, [selectedCategory]);
  
  return (
    <div className="min-h-screen pt-28 pb-16 bg-[#0A0A0A] relative overflow-hidden">
      {/* Ambient background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-40 mix-blend-soft-light">
        <div className="absolute top-0 left-0 w-1/3 h-1/2 rounded-full bg-[#7c4d33]/10 blur-[150px] transform -translate-x-1/2"></div>
        <div className="absolute bottom-0 right-0 w-1/2 h-1/2 rounded-full bg-[#b88c41]/10 blur-[180px] transform translate-x-1/4"></div>
      </div>
      
      {/* Noise texture overlay */}
      <div 
        className="absolute inset-0 opacity-20 mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundSize: '150px',
          backgroundRepeat: 'repeat'
        }}
      />
      
      {/* Header Section */}
      <AnimatedSection animation="fadeIn" className="py-12 px-4 relative">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-editorial-ultralight text-[#F5F1E6] mb-6 leading-tight">
            Shop <span className="text-[#D4AF37]">All</span>
          </h1>
          <div className="h-0.5 bg-gradient-to-r from-transparent via-[#7c4d33] to-transparent w-48 mx-auto"></div>
        </div>
      </AnimatedSection>
      
      {/* Category Filter */}
      <AnimatedSection animation="fadeIn" className="py-4 px-4 mb-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-wrap justify-center gap-3 md:gap-4">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-5 py-2.5 text-sm font-suisse-intl-mono uppercase tracking-wider transition-all duration-300 rounded-full border ${
                  selectedCategory === category.id
                    ? 'bg-[#D4AF37] text-[#0A0A0A] border-[#D4AF37] shadow-lg shadow-[#D4AF37]/20'
                    : 'bg-[#0A0A0A] border-[#7c4d33]/40 text-[#F5F1E6] hover:border-[#D4AF37] hover:text-[#D4AF37]'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </AnimatedSection>
      
      {/* Products */}
      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center">
          <div className="w-14 h-14 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-[#e3dcd4] animate-pulse font-suisse-intl-mono text-sm tracking-wider uppercase">Loading products</p>
        </div>
      ) : (
        <ProductGrid 
          products={products}
          title={categories.find(c => c.id === selectedCategory)?.name || 'All Products'}
        />
      )}
    </div>
  );
}