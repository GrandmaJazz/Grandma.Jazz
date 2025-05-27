//src/components/ProductCard.tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/Button';
import { toast } from 'react-hot-toast';

interface ProductProps {
  _id: string;
  name: string;
  price: number;
  images: string[];
  description: string;
  isOutOfStock: boolean;
  isFeatured: boolean;
}

export function ProductCard({ _id, name, price, images, description, isOutOfStock, isFeatured }: ProductProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { addItem } = useCart();
  
  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isOutOfStock) {
      toast.error(`${name} is out of stock`);
      return;
    }
    
    // ใช้ addItem แบบใหม่ที่รับเฉพาะ productId และ quantity
    addItem(_id, 1);
  };

  // Check if there's a second image for crossfade effect
  const hasSecondImage = images.length > 1;
  
  return (
    <Link 
      href={`/products/${_id}`}
      className="group block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative overflow-hidden rounded-3xl bg-[#0A0A0A] border border-[#7c4d33]/30 transition-all duration-300 hover:shadow-lg hover:shadow-[#D4AF37]/10">
        {/* Product Image */}
        <div className="relative aspect-square overflow-hidden rounded-t-3xl">
          {/* First Image (Always visible, fades out on hover if second image exists) */}
          <Image
            src={images[0] || '/images/placeholder-product.jpg'}
            alt={name}
            fill
            className={`object-cover transition-opacity duration-500 ${
              hasSecondImage && isHovered ? 'opacity-0' : 'opacity-100'
            }`}
          />
          
          {/* Second Image (Only visible on hover if it exists) */}
          {hasSecondImage && (
            <Image
              src={images[1]}
              alt={`${name} - view 2`}
              fill
              className={`object-cover transition-opacity duration-500 ${
                isHovered ? 'opacity-100' : 'opacity-0'
              }`}
            />
          )}
          
          {/* Noise texture overlay */}
          <div 
            className="absolute inset-0 opacity-10 mix-blend-overlay pointer-events-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
              backgroundSize: '150px',
              backgroundRepeat: 'repeat'
            }}
          />
          
          {/* Out of stock overlay */}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-[#0A0A0A] bg-opacity-60 flex items-center justify-center z-20">
              <span className="bg-[#0A0A0A] px-4 py-2 text-[#E67373] uppercase text-sm font-suisse-intl-mono border border-[#E67373] rounded-full">
                Sold Out
              </span>
            </div>
          )}
          
          {/* Featured badge - positioned at top left */}
          {isFeatured && !isOutOfStock && (
            <div className="absolute top-3 left-3 z-10">
              <span className="bg-[#D4AF37] px-3 py-1 text-[#0A0A0A] text-xs font-bold uppercase font-suisse-intl-mono rounded-full">
                Featured
              </span>
            </div>
          )}

          {/* Image indicator dots (show only if multiple images) */}
          {hasSecondImage && (
            <div className="absolute top-3 right-3 z-10 flex space-x-1">
              <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
                !isHovered ? 'bg-[#D4AF37]' : 'bg-[#D4AF37]/40'
              }`} />
              <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
                isHovered ? 'bg-[#D4AF37]' : 'bg-[#D4AF37]/40'
              }`} />
            </div>
          )}
          
          {/* Quick add button */}
          <div 
            className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0A0A0A] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 ${
              isOutOfStock ? 'pointer-events-none' : ''
            }`}
          >
            <Button
              onClick={handleAddToCart}
              fullWidth
              size="sm"
              rounded="full"
              disabled={isOutOfStock}
            >
              {isOutOfStock ? 'Sold Out' : 'Add to Cart'}
            </Button>
          </div>
        </div>
        
        {/* Product Info */}
        <div className="p-4">
          <h3 className="font-suisse-intl font-medium text-[#F5F1E6] text-lg mb-1 line-clamp-1">{name}</h3>
          <p className="font-suisse-intl-mono text-[#D4AF37]">฿{price.toFixed(2)}</p>
        </div>
      </div>
    </Link>
  );
}