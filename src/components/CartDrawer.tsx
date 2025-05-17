//src/components/CartDrawer.tsx
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useUI } from '@/contexts/UIContext';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from './ui/Button';
import { toast } from 'react-hot-toast';
import { ProductAPI } from '@/lib/api';

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
  const drawerRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  
  // เพิ่ม state สำหรับเก็บข้อมูลสินค้าและการคำนวณราคารวม
  const [cartProducts, setCartProducts] = useState<{[key: string]: ProductDetails}>({});
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [totalPrice, setTotalPrice] = useState(0);
  
  // สร้าง ref เพื่อเก็บค่า items ล่าสุดที่ได้ทำการดึงข้อมูลแล้ว
  const fetchedItemsRef = useRef<string>('');
  
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
    
    if (isCartOpen) {
      // ใช้ mousedown เพื่อให้ทำงานก่อนที่ปุ่มจะได้รับ click event
      document.addEventListener('mousedown', handleBackdropClick);
      // Prevent body scrolling when cart is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    
    return () => {
      document.removeEventListener('mousedown', handleBackdropClick);
      document.body.style.overflow = 'auto';
    };
  }, [isCartOpen, setIsCartOpen]);
  
  // ฟังก์ชั่นสำหรับดึงข้อมูลสินค้าในตะกร้า - ปรับปรุงใหม่
  const fetchCartProducts = useCallback(async () => {
    if (items.length === 0) {
      setCartProducts({});
      setTotalPrice(0);
      fetchedItemsRef.current = '';
      return;
    }
    
    // สร้าง string เพื่อเปรียบเทียบว่า items ได้เปลี่ยนแปลงจากการดึงข้อมูลครั้งล่าสุดหรือไม่
    const itemsString = JSON.stringify(items.map(item => ({ id: item.productId, qty: item.quantity })));
    
    // เพิ่ม debug log
    console.log("Items in cart:", items);
    console.log("Current products in state:", Object.keys(cartProducts));
    console.log("Items string:", itemsString);
    console.log("Last fetched items:", fetchedItemsRef.current);
    
    // ถ้า items ที่มีอยู่ตรงกับข้อมูลที่ดึงมาครั้งล่าสุดแล้ว ให้คำนวณราคารวมใหม่เท่านั้น ไม่ต้องดึงข้อมูลอีก
    if (itemsString === fetchedItemsRef.current) {
      console.log("No changes in cart items, skipping fetch");
      const newTotal = items.reduce((sum, item) => {
        const product = cartProducts[item.productId];
        return sum + (product ? product.price * item.quantity : 0);
      }, 0);
      
      setTotalPrice(newTotal);
      return;
    }
    
    // ตรวจสอบว่ามีสินค้าใหม่ที่ยังไม่มีข้อมูลหรือไม่
    const newProductIds = items.filter(item => !cartProducts[item.productId]).map(item => item.productId);
    console.log("New product IDs to fetch:", newProductIds);
    
    // แก้ไขเงื่อนไขการตรวจสอบ - ถ้าไม่มีสินค้าใหม่และมีข้อมูลครบแล้ว
    if (newProductIds.length === 0 && Object.keys(cartProducts).length > 0) {
      console.log("No new products to fetch, updating price only");
      fetchedItemsRef.current = itemsString;
      const newTotal = items.reduce((sum, item) => {
        const product = cartProducts[item.productId];
        return sum + (product ? product.price * item.quantity : 0);
      }, 0);
      
      setTotalPrice(newTotal);
      return;
    }
    
    // ดึงข้อมูลเฉพาะสินค้าใหม่ที่ยังไม่มีข้อมูล
    setIsLoadingProducts(true);
    try {
      console.log("Fetching product details for:", newProductIds);
      
      // ใช้ Promise.all เพื่อดึงข้อมูลพร้อมกัน แต่แก้ไขเพื่อดักจับข้อผิดพลาดได้ดีกว่า
      const productResults = await Promise.all(
        newProductIds.map(productId => 
          ProductAPI.getById(productId)
            .then(result => {
              console.log(`Fetched product ${productId}:`, result);
              if (result && result.product) {
                return { id: productId, data: result.product };
              } else {
                console.error(`Invalid response for product ${productId}:`, result);
                return null;
              }
            })
            .catch(error => {
              console.error(`Error fetching product ${productId}:`, error);
              return null;
            })
        )
      );
      
      // กรองเอาเฉพาะผลลัพธ์ที่ไม่ใช่ null
      const newProducts = productResults.filter(item => item !== null);
      console.log("Successfully fetched products:", newProducts);
      
      // อัปเดต cartProducts ด้วยข้อมูลสินค้าใหม่
      const newProductsMap = { ...cartProducts };
      newProducts.forEach(product => {
        if (product) {
          newProductsMap[product.id] = product.data;
        }
      });
      
      console.log("Updated product map:", newProductsMap);
      setCartProducts(newProductsMap);
      fetchedItemsRef.current = itemsString;
      
      // คำนวณราคารวมใหม่แยกเป็นขั้นตอน
      const newTotal = items.reduce((sum, item) => {
        const product = newProductsMap[item.productId];
        const itemTotal = product ? product.price * item.quantity : 0;
        console.log(`Item ${item.productId} total: ${itemTotal}`);
        return sum + itemTotal;
      }, 0);
      
      console.log("New total price:", newTotal);
      setTotalPrice(newTotal);
    } catch (error) {
      console.error('Error in fetchCartProducts:', error);
      toast.error('Could not load cart products');
    } finally {
      setIsLoadingProducts(false);
    }
  }, [items, cartProducts]);
  
  // ดึงข้อมูลสินค้าเมื่อเปิดตะกร้าเท่านั้น และเมื่อ items เปลี่ยน
  useEffect(() => {
    if (isCartOpen && items.length > 0) {
      console.log("Cart opened, fetching products...");
      fetchCartProducts();
    }
  }, [isCartOpen, items.length, fetchCartProducts]); // ลด dependency เหลือแค่สิ่งจำเป็น
  
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
      router.push('/profile?redirect=checkout');
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
  const handleRemoveItem = (e: React.MouseEvent, productId: string) => {
    e.stopPropagation(); // ป้องกันการ bubble ของ event
    removeItem(productId);
  };
  
  // ฟังก์ชันสำหรับอัปเดตจำนวน - แบบมีการอัปเดตตัวเลขแบบเฉพาะที่เพื่อลดการกระพริบ
  const handleUpdateQuantity = (e: React.MouseEvent, productId: string, quantity: number) => {
    e.stopPropagation(); // ป้องกันการ bubble ของ event
    
    // ตรวจสอบว่าจำนวนต้องมากกว่า 0
    if (quantity <= 0) {
      // ถ้าจำนวนเป็น 0 หรือน้อยกว่า ให้ลบรายการ
      removeItem(productId);
      return;
    }
    
    // อัปเดตจำนวนในระบบ
    updateQuantity(productId, quantity);
    
    // คำนวณราคารวมใหม่ทันทีแบบเฉพาะที่ (ลดการกระพริบ)
    const product = cartProducts[productId];
    if (product) {
      const currentItemTotal = items.reduce((sum, item) => {
        if (item.productId === productId) {
          // ใช้จำนวนเดิมก่อนจะอัปเดต
          return sum + (product.price * item.quantity);
        }
        const itemProduct = cartProducts[item.productId];
        return sum + (itemProduct ? itemProduct.price * item.quantity : 0);
      }, 0);
      
      // ค้นหารายการสินค้าปัจจุบันและจำนวนสินค้า
      const existingItem = items.find(item => item.productId === productId);
      const currentQuantity = existingItem ? existingItem.quantity : 0;
      
      // คำนวณความแตกต่างของราคา
      const priceDifference = product.price * (quantity - currentQuantity);
      
      // อัปเดตราคารวม
      setTotalPrice(currentItemTotal + priceDifference);
    }
  };
  
  // ฟังก์ชันสำหรับล้างตะกร้า - ป้องกันการ bubble
  const handleClearCart = (e: React.MouseEvent) => {
    e.stopPropagation(); // ป้องกันการ bubble ของ event
    clearCart();
    setTotalPrice(0);
  };
  
  // ฟังก์ชันสำหรับไปที่หน้าสินค้า - ป้องกันการ bubble
  const handleGoToProducts = (e: React.MouseEvent) => {
    e.stopPropagation(); // ป้องกันการ bubble ของ event
    setIsCartOpen(false);
    router.push('/products');
  };
  
  if (!isCartOpen) return null;
  
  return (
    <div 
      ref={backdropRef}
      className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm z-50 overflow-hidden"
      // เพิ่ม onClick ที่ backdrop เพื่อปิด drawer เมื่อคลิกนอกพื้นที่
      onClick={(e) => {
        // ตรวจสอบว่าคลิกที่ backdrop จริงๆ (target เป็น element ที่มี ref)
        if (e.target === backdropRef.current) {
          setIsCartOpen(false);
        }
      }}
    >
      <div 
        ref={drawerRef}
        className="fixed right-0 top-0 h-full w-full sm:w-96 bg-[#0A0A0A] border-l border-[#7c4d33]/30 text-[#F5F1E6] shadow-xl transform transition-transform duration-300 ease-in-out"
        onClick={(e) => e.stopPropagation()} // ป้องกันการ bubble ของ event ทั้งหมดภายใน drawer
      >
        {/* Noise texture overlay */}
        <div 
          className="absolute inset-0 opacity-10 mix-blend-overlay pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            backgroundSize: '150px',
            backgroundRepeat: 'repeat'
          }}
        />
        
        <div className="flex flex-col h-full relative">
          {/* Cart Header */}
          <div className="flex justify-between items-center p-4 border-b border-[#7c4d33]/30">
            <h2 className="text-xl font-suisse-intl-mono uppercase text-[#D4AF37]">
              Your Cart ({totalItems})
            </h2>
            <button 
              onClick={closeDrawer}
              className="text-[#e3dcd4] hover:text-[#F5F1E6] transition-colors"
              aria-label="Close cart"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          
          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {isLoadingProducts && items.length > 0 && Object.keys(cartProducts).length === 0 ? (
              <div className="h-full flex items-center justify-center py-8">
                <div className="w-10 h-10 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
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
                  rounded="full"
                >
                  Continue Shopping
                </Button>
              </div>
            ) : (
              <>
                {items.map((item) => {
                  // ดึงข้อมูลสินค้าจาก cartProducts
                  const product = getProductDetails(item.productId);
                  
                  // ถ้าไม่พบข้อมูลสินค้า แสดง placeholder
                  if (!product) {
                    return (
                      <div key={item.productId} className="flex border-b border-[#7c4d33]/30 pb-4">
                        <div className="w-20 h-20 relative flex-shrink-0 bg-[#1a1a1a] flex items-center justify-center rounded-xl">
                          <span className="text-[#e3dcd4] text-xs">Loading...</span>
                        </div>
                        <div className="ml-4 flex-1">
                          <div className="flex justify-between mb-1">
                            <div className="h-4 w-32 bg-[#1a1a1a] rounded animate-pulse"></div>
                            <button 
                              onClick={(e) => handleRemoveItem(e, item.productId)}
                              className="text-[#e3dcd4] hover:text-[#E67373] transition-colors"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                              </svg>
                            </button>
                          </div>
                          <div className="h-4 w-16 bg-[#1a1a1a] rounded animate-pulse mt-2"></div>
                        </div>
                      </div>
                    );
                  }
                  
                  return (
                    <div key={item.productId} className="flex border-b border-[#7c4d33]/30 pb-4">
                      <div className="w-20 h-20 relative flex-shrink-0">
                        <Image
                          src={product.images[0] || '/images/placeholder-product.jpg'}
                          alt={product.name}
                          fill
                          className="object-cover rounded-xl"
                        />
                        
                        {/* Show out of stock indicator if product is out of stock */}
                        {product.isOutOfStock && (
                          <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center rounded-xl">
                            <span className="text-[#E67373] text-xs font-bold">OUT OF STOCK</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="ml-4 flex-1">
                        <div className="flex justify-between mb-1">
                          <h3 className="font-suisse-intl text-sm text-[#F5F1E6]">{product.name}</h3>
                          <button 
                            onClick={(e) => handleRemoveItem(e, item.productId)}
                            className="text-[#e3dcd4] hover:text-[#E67373] transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18"></line>
                              <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                          </button>
                        </div>
                        
                        <p className="text-[#D4AF37] text-sm font-suisse-intl-mono">
                          ฿{product.price.toFixed(2)}
                        </p>
                        
                        <div className="flex items-center mt-2">
                          <button 
                            onClick={(e) => handleUpdateQuantity(e, item.productId, item.quantity - 1)}
                            className="w-8 h-8 flex items-center justify-center border border-[#7c4d33]/50 text-[#e3dcd4] hover:border-[#D4AF37] hover:text-[#D4AF37] rounded-l-lg transition-colors"
                            disabled={product.isOutOfStock}
                          >
                            -
                          </button>
                          <div className="w-10 h-8 flex items-center justify-center border-t border-b border-[#7c4d33]/50 text-[#F5F1E6] text-sm">
                            {item.quantity}
                          </div>
                          <button 
                            onClick={(e) => handleUpdateQuantity(e, item.productId, item.quantity + 1)}
                            className="w-8 h-8 flex items-center justify-center border border-[#7c4d33]/50 text-[#e3dcd4] hover:border-[#D4AF37] hover:text-[#D4AF37] rounded-r-lg transition-colors"
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
            <div className="p-4 border-t border-[#7c4d33]/30">
              <div className="flex justify-between mb-4">
                <span className="font-suisse-intl text-[#F5F1E6]">Total</span>
                <span className="font-suisse-intl-mono text-[#D4AF37]">
                  ฿{isLoadingProducts && Object.keys(cartProducts).length === 0 ? '...' : totalPrice.toFixed(2)}
                </span>
              </div>
              
              <div className="space-y-3">
                <Button 
                  onClick={handleCheckout}
                  fullWidth
                  rounded="full"
                  disabled={isLoadingProducts || items.some(item => {
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
                  rounded="full"
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
      </div>
    </div>
  );
}