//src/app/products/[id]/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ProductAPI } from '@/lib/api';
import { useCart } from '@/contexts/CartContext';
import { AnimatedSection } from '@/components/AnimatedSection';
import { Button } from '@/components/ui/Button';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import { ProductGrid } from '@/components/ProductGrid';
import Link from 'next/link';

interface Product {
  _id: string;
  name: string;
  price: number;
  description: string;
  category: string;
  images: string[];
  isOutOfStock: boolean;
  isFeatured: boolean;
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { addItem } = useCart();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  
  useEffect(() => {
    async function fetchProduct() {
      setIsLoading(true);
      try {
        const data = await ProductAPI.getById(params.id as string);
        setProduct(data.product);
        
        // Fetch related products
        const relatedData = await ProductAPI.getAll(data.product.category);
        setRelatedProducts(
          relatedData.products.filter((p: Product) => p._id !== data.product._id).slice(0, 4)
        );
      } catch (error) {
        console.error('Error fetching product:', error);
        toast.error('Product not found');
        router.push('/products');
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchProduct();
  }, [params.id, router]);
  
  const handleAddToCart = () => {
    if (!product) return;
    
    if (product.isOutOfStock) {
      toast.error('Sorry, this product is out of stock');
      return;
    }
    
    // เรียกใช้ addItem แบบใหม่ที่รับเฉพาะ productId และ quantity
    addItem(product._id, quantity);
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen pt-28 pb-16 bg-[#0A0A0A] flex justify-center items-center">
        <div className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  if (!product) {
    return (
      <div className="min-h-screen pt-28 pb-16 bg-[#0A0A0A] flex flex-col items-center justify-center">
        <h1 className="text-[#F5F1E6] text-4xl mb-6">Product Not Found</h1>
        <Button onClick={() => router.push('/products')} rounded="full">Back to Products</Button>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen pt-28 pb-16 bg-[#0A0A0A]">
      <AnimatedSection animation="fadeIn" className="max-w-6xl mx-auto px-4">
        {/* Breadcrumb */}
        <div className="mb-6 text-[#e3dcd4] text-sm">
          <Link href="/products" className="hover:text-[#D4AF37] transition-colors">
            Products
          </Link>
          <span className="mx-2">/</span>
          <span className="text-[#7c4d33]">{product.name}</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          {/* Product Images */}
          <div className="space-y-4">
            <div className="aspect-square relative rounded-3xl overflow-hidden bg-[#0A0A0A] border border-[#7c4d33]/30">
              <Image
                src={product.images[selectedImage] || '/images/placeholder-product.jpg'}
                alt={product.name}
                fill
                className="object-cover"
                priority
              />
              
              {/* Noise texture overlay */}
              <div 
                className="absolute inset-0 opacity-10 mix-blend-overlay pointer-events-none"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                  backgroundSize: '150px',
                  backgroundRepeat: 'repeat'
                }}
              />
              
              {product.isOutOfStock && (
                <div className="absolute inset-0 bg-[#0A0A0A] bg-opacity-60 flex items-center justify-center">
                  <span className="bg-[#0A0A0A] px-6 py-2 text-[#E67373] uppercase text-lg font-suisse-intl-mono border border-[#E67373] rounded-full">
                    Sold Out
                  </span>
                </div>
              )}
              
              {/* Featured badge - positioned at top left */}
              {product.isFeatured && !product.isOutOfStock && (
                <div className="absolute top-4 left-4 z-10">
                  <span className="bg-[#D4AF37] px-4 py-1 text-[#0A0A0A] text-sm font-bold uppercase font-suisse-intl-mono rounded-full">
                    Featured
                  </span>
                </div>
              )}
            </div>
            
            {/* Thumbnail Images */}
            {product.images.length > 1 && (
              <div className="flex space-x-3 overflow-x-auto pb-2">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`w-20 h-20 relative rounded-xl overflow-hidden flex-shrink-0 transition-all duration-300 ${
                      selectedImage === index 
                        ? 'ring-2 ring-[#D4AF37] opacity-100 scale-105' 
                        : 'opacity-70 hover:opacity-90'
                    }`}
                  >
                    <Image
                      src={image || '/images/placeholder-product.jpg'}
                      alt={`${product.name} thumbnail ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Product Info */}
          <div className="text-[#F5F1E6]">
            <h1 className="text-3xl md:text-4xl font-editorial-ultralight mb-2">{product.name}</h1>
            <div className="text-2xl font-suisse-intl-mono text-[#D4AF37] mb-6">฿{product.price.toFixed(2)}</div>
            
            {/* Category badge */}
            <div className="mb-6">
              <span className="inline-block bg-[#7c4d33]/20 text-[#e3dcd4] px-3 py-1 rounded-full text-sm font-suisse-intl-mono">
                {product.category}
              </span>
            </div>
            
            <div className="prose prose-invert max-w-none mb-8 font-suisse-intl text-[#e3dcd4]">
              <p>{product.description}</p>
            </div>
            
            {/* Stock status */}
            <div className="mb-6">
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-suisse-intl-mono ${
                product.isOutOfStock 
                  ? 'bg-[#E67373]/20 text-[#E67373]' 
                  : 'bg-[#7EB47E]/20 text-[#7EB47E]'
              }`}>
                {product.isOutOfStock ? 'Out of Stock' : 'In Stock'}
              </span>
            </div>
            
            {/* Quantity Selector */}
            <div className="mb-6">
              <label className="block text-sm font-suisse-intl-mono uppercase mb-2 text-[#e3dcd4]">Quantity</label>
              <div className="flex">
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={product.isOutOfStock}
                  className="w-10 h-10 flex items-center justify-center border border-[#7c4d33]/50 text-[#e3dcd4] hover:border-[#D4AF37] hover:text-[#D4AF37] rounded-l-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  -
                </button>
                <div className="w-14 h-10 flex items-center justify-center border-t border-b border-[#7c4d33]/50 text-[#F5F1E6]">
                  {quantity}
                </div>
                <button 
                  onClick={() => setQuantity(quantity + 1)}
                  disabled={product.isOutOfStock}
                  className="w-10 h-10 flex items-center justify-center border border-[#7c4d33]/50 text-[#e3dcd4] hover:border-[#D4AF37] hover:text-[#D4AF37] rounded-r-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  +
                </button>
              </div>
            </div>
            
            {/* Add to Cart Button */}
            <div className="space-y-3">
              <Button
                onClick={handleAddToCart}
                fullWidth
                rounded="full"
                disabled={product.isOutOfStock}
                className="mb-4"
              >
                {product.isOutOfStock ? 'Sold Out' : 'Add to Cart'}
              </Button>
              
              <Button
                onClick={() => router.push('/products')}
                variant="outline"
                fullWidth
                rounded="full"
              >
                Continue Shopping
              </Button>
            </div>
            
            {/* Additional Info */}
            <div className="mt-8 space-y-4 border-t border-[#7c4d33]/30 pt-6">
              <div>
                <h3 className="text-sm font-suisse-intl-mono uppercase text-[#e3dcd4] mb-1">
                  Shipping Information
                </h3>
                <p className="text-[#F5F1E6] font-suisse-intl">
                  Free standard shipping on all orders over ฿100
                </p>
              </div>
              
              <div>
                <h3 className="text-sm font-suisse-intl-mono uppercase text-[#e3dcd4] mb-1">
                  Returns & Refunds
                </h3>
                <p className="text-[#F5F1E6] font-suisse-intl">
                  Easy returns within 30 days of purchase
                </p>
              </div>
            </div>
          </div>
        </div>
      </AnimatedSection>
      
      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div className="mt-16">
          <ProductGrid 
            products={relatedProducts}
            title="You Might Also Like"
          />
        </div>
      )}
    </div>
  );
}