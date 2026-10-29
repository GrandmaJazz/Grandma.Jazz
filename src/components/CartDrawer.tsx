//src/components/CartDrawer.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import LogoLoadingSpinner from '@/components/LogoLoadingSpinner';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useUI } from '@/contexts/UIContext';
import { useRouter } from 'next/navigation';
import Image from '@/components/ResponsiveImage';
import { Button } from './ui/Button';
import { toast } from 'react-hot-toast';
import { formatPrice } from '@/utils/helpers';
import { getCartProduct } from '@/lib/cartProducts';
import { cartItemKey, productColours } from '@/lib/productOptions';

// ประเภทข้อมูลสินค้าที่ได้จาก API
interface ProductDetails {
  _id: string;
  name: string;
  price: number;
  images: string[];
  isOutOfStock: boolean;
}

export function CartDrawer() {
  const { items, totalItems, isCartOpen, setIsCartOpen, removeItem, updateQuantity, clearCart } = useCart();
  const { isAuthenticated, user } = useAuth();
  const { openLoginModal } = useUI();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const drawerRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  // เพิ่ม state สำหรับเก็บข้อมูลสินค้าและการคำนวณราคารวม
  const [cartProducts, setCartProducts] = useState<{[key: string]: ProductDetails}>({});
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const totalPrice = items.reduce((sum, item) => sum + (cartProducts[item.productId]?.price ?? item.price ?? 0) * item.quantity, 0);
  const hasCompleteProducts = items.every(item => !!cartProducts[item.productId]);

  // Handle click outside to close drawer - แก้ไขเพื่อให้คลิกได้เฉพาะ backdrop
  useEffect(() => {
    const handleBackdropClick = (event: MouseEvent) => {
      // ตรวจสอบว่าคลิกที่ backdrop จริงๆ (ไม่ใช่ภายใน drawer)
      if (
        backdropRef.current &&
        event.target === backdropRef.current &&
        drawerRef.current &&
        !drawerRef.current.contains(event.target as Node)
      ) {
        setIsCartOpen(false);
      }
    };

    const previousFocus = document.activeElement as HTMLElement | null;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsCartOpen(false);
      if (event.key !== 'Tab' || !drawerRef.current) return;
      const targets = [...drawerRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], select:not(:disabled), input:not(:disabled), [tabindex="0"]')];
      const first = targets[0], last = targets.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    if (isCartOpen) {
      document.addEventListener('keydown', onKey);
      drawerRef.current?.querySelector<HTMLElement>('button')?.focus();
      // ใช้ mousedown เพื่อให้ทำงานก่อนที่ปุ่มจะได้รับ click event
      document.addEventListener('mousedown', handleBackdropClick);
      // Prevent body scrolling when cart is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('mousedown', handleBackdropClick);
      document.removeEventListener('keydown', onKey);
      if (isCartOpen) previousFocus?.focus();
      document.body.style.overflow = '';
    };
  }, [isCartOpen, setIsCartOpen]);

  const [priceRevision, setPriceRevision] = useState(0);
  const productIds = [...new Set(items.map(item => item.productId))].sort().join(',');
  useEffect(() => {
    if (!isCartOpen || !productIds) return;
    let active = true;
    setIsLoadingProducts(true);
    Promise.all(productIds.split(',').map(async id => {
      try { const result = await getCartProduct(id); return result.product ? [id, result.product] as const : null; }
      catch { return null; }
    })).then(results => {
      if (!active) return;
      const loaded: Record<string, ProductDetails> = {};
      for (const result of results) if (result) loaded[result[0]] = result[1];
      setCartProducts(loaded);
      setIsLoadingProducts(false);
    });
    return () => { active = false; };
  }, [isCartOpen, productIds, priceRevision]);

  // ฟังก์ชันปิด drawer
  const closeDrawer = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCartOpen(false);
  };

  // แก้ไขฟังก์ชั่น handleCheckout เพื่อใช้ modal login แทน
  const handleCheckout = (e: React.MouseEvent) => {
    e.stopPropagation(); // ป้องกันการ bubble ของ event

    if (!isAuthenticated) {
      // ปิดตะกร้าและเปิด login modal พร้อมส่ง redirect url
      setIsCartOpen(false);
      openLoginModal('/checkout');
      return;
    }

    // Check if user has complete profile
    if (!user?.profileComplete) {
      setIsCartOpen(false);
      router.push('/profile?redirect=/checkout');
      toast.error('Please complete your profile before checking out');
      return;
    }

    // Proceed to checkout
    setIsCartOpen(false);
    router.push('/checkout');
  };

  // Helper function to get product details safely
  const getProductDetails = (productId: string) => {
    return cartProducts[productId] || null;
  };

  // ฟังก์ชันสำหรับลบสินค้า - ป้องกันการ bubble
  const handleRemoveItem = (e: React.MouseEvent, productId: string, colour?: string) => {
    e.stopPropagation();
    removeItem(productId, colour);
  };

  // ฟังก์ชันสำหรับอัปเดตจำนวน - แบบมีการอัปเดตตัวเลขแบบเฉพาะที่เพื่อลดการกระพริบ
  const handleUpdateQuantity = (e: React.MouseEvent, productId: string, quantity: number, colour?: string) => {
    e.stopPropagation();
    updateQuantity(productId, quantity, colour);
  };

  // ฟังก์ชันสำหรับล้างตะกร้า - ป้องกันการ bubble
  const handleClearCart = (e: React.MouseEvent) => {
    e.stopPropagation(); // ป้องกันการ bubble ของ event
    clearCart();
  };

  // ฟังก์ชันสำหรับไปที่หน้าสินค้า - ป้องกันการ bubble
  const handleGoToProducts = (e: React.MouseEvent) => {
    e.stopPropagation(); // ป้องกันการ bubble ของ event
    setIsCartOpen(false);
    router.push('/products/');
  };

  return (
    <AnimatePresence>{isCartOpen && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduceMotion ? 0 : 0.18 }}
      ref={backdropRef}
      className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm z-[100] overflow-hidden"
      // เพิ่ม onClick ที่ backdrop เพื่อปิด drawer เมื่อคลิกนอกพื้นที่
      onClick={(e) => {
        // ตรวจสอบว่าคลิกที่ backdrop จริงๆ (target เป็น element ที่มี ref)
        if (e.target === backdropRef.current) {
          setIsCartOpen(false);
        }
      }}
    >
      <motion.div initial={{ x: reduceMotion ? 0 : '100%' }} animate={{ x: 0 }} exit={{ x: reduceMotion ? 0 : '100%' }} transition={{ duration: reduceMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
        ref={drawerRef}
        role="dialog" aria-modal="true" aria-label="Shopping cart"
        className="fixed right-0 top-0 h-full w-full sm:w-96 bg-[#181818] border-l border-[#7c4d33]/30 text-[#F5F1E6] shadow-xl "
        onClick={(e) => e.stopPropagation()} // ป้องกันการ bubble ของ event ทั้งหมดภายใน drawer
      >
        {/* Noise texture overlay */}
        <div
          className="absolute inset-0 opacity-10 mix-blend-overlay pointer-events-none"
          style={{
            backgroundImage: 'url(/images/grain.png)',
            backgroundSize: '150px',
            backgroundRepeat: 'repeat'
          }}
        />

        <div className="flex flex-col h-full relative">
          {/* Cart Header */}
          <div className="flex justify-between items-center p-4 border-b border-[#7c4d33]/30">
            <h2 className="text-xl font-suisse-intl-mono uppercase text-[#B49B73]">
              Your Cart ({totalItems})
            </h2>
            <button
              aria-label="Close shopping cart"
              onClick={closeDrawer}
              className="text-[#e3dcd4] hover:text-[#F5F1E6] transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {isLoadingProducts && items.length > 0 && !items.some(item => item.name) ? (
              <div className="h-full flex items-center justify-center py-8">
                <LogoLoadingSpinner width={160} />
              </div>
            ) : items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-[#7c4d33] mb-4">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <path d="M16 10a4 4 0 0 1-8 0"></path>
                </svg>
                <p className="text-[#e3dcd4] font-suisse-intl mb-4">Your cart is empty</p>
                <Button
                  onClick={handleGoToProducts}
                  variant="outline"
                  rounded="default"
                >
                  Continue Shopping
                </Button>
              </div>
            ) : (
              <>
                {items.map((item) => {
                  // ดึงข้อมูลสินค้าจาก cartProducts
                  const product = getProductDetails(item.productId) || (item.name && typeof item.price === 'number' ? { _id: item.productId, name: item.name, price: item.price, images: [item.image || ''], isOutOfStock: false } : null);

                  // ถ้าไม่พบข้อมูลสินค้า แสดง placeholder
                  if (!product) {
                    return (
                      <div key={cartItemKey(item)} className="flex border-b border-[#7c4d33]/30 pb-4">
                        <div className="w-20 h-20 relative flex-shrink-0 bg-[#181818] flex items-center justify-center rounded-box">
                          <span className="text-[#e3dcd4] text-xs">Loading...</span>
                        </div>
                        <div className="ml-4 flex-1">
                          <div className="flex justify-between mb-1">
                            <div className="h-4 w-32 bg-[#181818] rounded animate-pulse"></div>
                            <button
                              aria-label={`Remove ${item.name || 'item'}${item.colour ? ` ${item.colour}` : ''}`}
                              onClick={(e) => handleRemoveItem(e, item.productId, item.colour)}
                              className="text-[#e3dcd4] hover:text-[#E67373] transition-colors"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                              </svg>
                            </button>
                          </div>
                          <div className="h-4 w-16 bg-[#181818] rounded animate-pulse mt-2"></div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={cartItemKey(item)} className="flex border-b border-[#7c4d33]/30 pb-4">
                      <div className="w-20 h-20 relative flex-shrink-0">
                        <Image
                          src={product.images[Math.max(0, productColours[item.productId]?.indexOf(item.colour || '') ?? 0)] || '/images/placeholder-product.jpg'}
                          alt={product.name}
                          fill
                          sizes="80px"
                          className="object-cover rounded-box"
                        />

                        {/* Show out of stock indicator if product is out of stock */}
                        {product.isOutOfStock && (
                          <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center rounded-box">
                            <span className="text-[#E67373] text-xs font-bold">OUT OF STOCK</span>
                          </div>
                        )}
                      </div>

                      <div className="ml-4 flex-1">
                        <div className="flex justify-between mb-1">
                          <h3 className="font-suisse-intl text-sm text-[#F5F1E6]">{product.name}{item.colour ? ` · ${item.colour}` : ''}</h3>
                          <button
                            aria-label={`Remove ${item.name || 'item'}${item.colour ? ` ${item.colour}` : ''}`}
                              onClick={(e) => handleRemoveItem(e, item.productId, item.colour)}
                            className="text-[#e3dcd4] hover:text-[#E67373] transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18"></line>
                              <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                          </button>
                        </div>

                        <p className="text-[#B49B73] text-sm font-suisse-intl-mono">
                          ${formatPrice(product.price)}
                        </p>

                        <div className="flex items-center mt-2">
                          <button
                            aria-label={`Decrease ${product.name} quantity`}
                            onClick={(e) => handleUpdateQuantity(e, item.productId, item.quantity - 1, item.colour)}
                            className="w-8 h-8 flex items-center justify-center border border-[#7c4d33]/50 text-[#e3dcd4] hover:border-[#B49B73] hover:text-[#B49B73] rounded-l-control transition-colors"
                            disabled={product.isOutOfStock}
                          >
                            -
                          </button>
                          <div className="w-10 h-8 flex items-center justify-center border-t border-b border-[#7c4d33]/50 text-[#F5F1E6] text-sm">
                            {item.quantity}
                          </div>
                          <button
                            aria-label={`Increase ${product.name} quantity`}
                            onClick={(e) => handleUpdateQuantity(e, item.productId, item.quantity + 1, item.colour)}
                            className="w-8 h-8 flex items-center justify-center border border-[#7c4d33]/50 text-[#e3dcd4] hover:border-[#B49B73] hover:text-[#B49B73] rounded-r-control transition-colors"
                            disabled={product.isOutOfStock}
                          >
                            +
                          </button>
                        </div>

                        {/* Show warning if product is out of stock */}
                        {product.isOutOfStock && (
                          <p className="text-[#E67373] text-xs mt-2">This product is no longer available</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>

          {/* Cart Footer */}
          {items.length > 0 && (
            <div className="p-4 pb-10 border-t border-[#7c4d33]/30">
              <div className="flex justify-between mb-4">
                <span className="font-suisse-intl text-[#F5F1E6]">Total</span>
                <span className="font-suisse-intl-mono text-[#B49B73]">
                  {hasCompleteProducts ? `$${formatPrice(totalPrice)} USD` : isLoadingProducts ? 'Loading prices…' : 'Prices unavailable'}
                </span>
              </div>
              {!hasCompleteProducts && !isLoadingProducts && <p role="alert" className="text-sm text-[#e3dcd4]/80 mb-4">
                We couldn&apos;t load every item&apos;s current price.{' '}
                <button type="button" className="text-[#B49B73] underline" onClick={() => setPriceRevision(value => value + 1)}>Retry prices</button>
              </p>}

              <div className="space-y-3">
                <Button
                  onClick={handleCheckout}
                  fullWidth
                  rounded="default"
                  disabled={!hasCompleteProducts || isLoadingProducts || items.some(item => {
                    const product = cartProducts[item.productId];
                    return product && product.isOutOfStock;
                  })}
                >
                  {isLoadingProducts && Object.keys(cartProducts).length === 0 ? 'Loading...' : 'Checkout'}
                </Button>

                <Button
                  onClick={handleGoToProducts}
                  variant="outline"
                  fullWidth
                  rounded="default"
                >
                  Continue Shopping
                </Button>

                <button
                  onClick={handleClearCart}
                  className="text-[#e3dcd4] hover:text-[#E67373] transition-colors text-xs font-suisse-intl-mono uppercase w-full text-center mt-4"
                >
                  Clear Cart
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>}</AnimatePresence>
  );
}
