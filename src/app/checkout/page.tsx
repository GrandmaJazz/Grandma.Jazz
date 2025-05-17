//src/app/checkout/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { OrderAPI } from '@/lib/api';
import { AnimatedSection } from '@/components/AnimatedSection';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

export default function CheckoutPage() {
  const { user, isAuthenticated, isAuthLoading } = useAuth();
  const { items, totalItems, totalPrice, clearCart, loadCartDetails } = useCart();
  const router = useRouter();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingCart, setIsLoadingCart] = useState(true);
  const [shippingAddress, setShippingAddress] = useState('');
  const [addressError, setAddressError] = useState('');
  
  // โหลดรายละเอียดสินค้า
  useEffect(() => {
    let isMounted = true;
    
    const loadDetails = async () => {
      if (!isMounted) return;
      
      setIsLoadingCart(true);
      try {
        await loadCartDetails();
      } catch (error) {
        if (isMounted) {
          console.error('Error loading cart details:', error);
        }
      } finally {
        if (isMounted) {
          setIsLoadingCart(false);
        }
      }
    };
    
    if (items.length > 0 && isAuthenticated) {
      loadDetails();
    } else {
      setIsLoadingCart(false);
    }
    
    return () => {
      isMounted = false;
    };
  }, []);
  
  // Add animation keyframes
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeInSlide {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  
  // Redirect if not logged in or cart is empty
  useEffect(() => {
    if (!isAuthLoading) {
      if (!isAuthenticated) {
        router.push('/login?redirect=checkout');
      } else if (items.length === 0) {
        router.push('/products');
        toast.error('Your cart is empty');
      }
    }
  }, [isAuthenticated, isAuthLoading, items.length, router]);
  
  // Set initial shipping address from user profile
  useEffect(() => {
    if (user?.address) {
      setShippingAddress(user.address);
    }
  }, [user]);
  
  // Validate form
  const validateForm = () => {
    let isValid = true;
    
    if (!shippingAddress.trim()) {
      setAddressError('Shipping address is required');
      isValid = false;
    } else {
      setAddressError('');
    }
    
    if (!user?.profileComplete) {
      toast.error('Please complete your profile before checkout');
      router.push('/profile?redirect=checkout');
      isValid = false;
    }
    
    return isValid;
  };
  
  // Handle checkout
  const handleCheckout = async () => {
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const orderItems = items.map(item => ({
        product: item.productId,
        name: item.name || 'Unknown product',
        quantity: item.quantity,
        price: item.price || 0,
        image: item.image || '/images/placeholder-product.jpg'
      }));
      
      const result = await OrderAPI.create({
        orderItems,
        shippingAddress
      });
      
      if (result.sessionUrl) {
        sessionStorage.setItem('latestOrderId', result.order._id);
        clearCart();
        window.location.href = result.sessionUrl;
      } else {
        toast.error('Failed to create checkout session');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('An error occurred during checkout');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isAuthLoading || !isAuthenticated || items.length === 0 || isLoadingCart) {
    return (
      <div className="min-h-screen pt-28 pb-16 bg-[#0A0A0A] flex justify-center items-center">
        <div className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen pt-28 pb-16 bg-[#0A0A0A]">
      {/* Noise texture overlay */}
      <div 
        className="fixed inset-0 opacity-15 mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundSize: '150px',
          backgroundRepeat: 'repeat',
          zIndex: -1
        }}
      />
      
      <AnimatedSection animation="fadeIn" className="max-w-4xl mx-auto px-6">
        <div className="flex items-center mb-8">
          <div className="h-0.5 w-6 bg-[#D4AF37]/30 mr-4"></div>
          <h1 
            className="text-4xl text-[#D4AF37] font-editorial-ultralight"
            style={{ 
              textShadow: '0 0 10px rgba(212, 175, 55, 0.3)'
            }}
          >
            Checkout
          </h1>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left column - Order summary */}
          <div 
            className="bg-[#1a1a1a]/70 backdrop-blur-sm p-8 rounded-3xl shadow-lg border border-[#7c4d33]/20 relative overflow-hidden"
            style={{ animation: 'fadeInSlide 0.5s ease-out forwards' }}
          >
            {/* Subtle glow effect at top */}
            <div 
              className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl overflow-hidden"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.2), transparent)',
                animation: 'pulse 3s infinite'
              }}
            ></div>
            
            <h2 className="text-2xl font-suisse-intl-mono text-[#F5F1E6] tracking-tight mb-6 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#D4AF37] mr-2">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <path d="M16 10a4 4 0 0 1-8 0"></path>
              </svg>
              Order Summary ({totalItems} {totalItems === 1 ? 'item' : 'items'})
            </h2>
            
            <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 mb-6 hide-scrollbar">
              {items.map((item, index) => (
                <div 
                  key={item.productId} 
                  className="flex border-b border-[#7c4d33]/20 pb-6 last:border-0"
                  style={{ animation: `fadeInSlide ${0.5 + index * 0.1}s ease-out forwards` }}
                >
                  <div className="w-20 h-20 relative flex-shrink-0">
                    <Image
                      src={item.image || '/images/placeholder-product.jpg'}
                      alt={item.name || 'Product'}
                      fill
                      className="object-cover rounded-xl"
                    />
                  </div>
                  
                  <div className="ml-4 flex-1">
                    <div className="flex justify-between mb-1">
                      <h3 className="font-suisse-intl text-[#F5F1E6]">{item.name || 'Product'}</h3>
                      <span className="text-[#D4AF37] font-suisse-intl-mono">
                        ฿{((item.price || 0) * item.quantity).toFixed(2)}
                      </span>
                    </div>
                    
                    <div className="text-[#e3dcd4]/80 font-suisse-intl">
                      ฿{(item.price || 0).toFixed(2)} × {item.quantity}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="border-t border-[#7c4d33]/30 pt-6 space-y-3">
              <div className="flex justify-between text-[#e3dcd4]/80 font-suisse-intl">
                <span>Subtotal</span>
                <span>฿{totalPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#e3dcd4]/80 font-suisse-intl">
                <span>Shipping</span>
                <span>Free</span>
              </div>
              <div className="flex justify-between text-[#F5F1E6] font-suisse-intl-mono text-lg pt-3 border-t border-[#7c4d33]/20">
                <span>Total</span>
                <span className="text-[#D4AF37]">฿{totalPrice.toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          {/* Right column - Shipping and payment */}
          <div 
            className="bg-[#1a1a1a]/70 backdrop-blur-sm p-8 rounded-3xl shadow-lg border border-[#7c4d33]/20 relative overflow-hidden"
            style={{ animation: 'fadeInSlide 0.6s ease-out forwards' }}
          >
            {/* Subtle glow effect at top */}
            <div 
              className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl overflow-hidden"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.2), transparent)',
                animation: 'pulse 3s infinite'
              }}
            ></div>
            
            <h2 className="text-2xl font-suisse-intl-mono text-[#F5F1E6] tracking-tight mb-6 flex items-center">
              Payment Details
            </h2>
            
            {/* Customer info (read-only) */}
            <div className="space-y-4 mb-6">
              <div>
                <div className="text-[#D4AF37] text-sm font-suisse-intl-mono mb-2 uppercase tracking-wider">Customer</div>
                <div className="text-[#F5F1E6] font-suisse-intl bg-[#0A0A0A]/50 p-3 rounded-xl">
                  {`${user?.name || ''} ${user?.surname || ''}`}
                </div>
              </div>
              
              <div>
                <div className="text-[#D4AF37] text-sm font-suisse-intl-mono mb-2 uppercase tracking-wider">Email</div>
                <div className="text-[#F5F1E6] font-suisse-intl bg-[#0A0A0A]/50 p-3 rounded-xl">
                  {user?.email || ''}
                </div>
              </div>
              
              <div>
                <div className="text-[#D4AF37] text-sm font-suisse-intl-mono mb-2 uppercase tracking-wider">Phone</div>
                <div className="text-[#F5F1E6] font-suisse-intl bg-[#0A0A0A]/50 p-3 rounded-xl">
                  {user?.phone || ''}
                </div>
              </div>
            </div>
            
            {/* Shipping address */}
            <div className="mb-6">
              <div className="text-[#D4AF37] text-sm font-suisse-intl-mono mb-2 uppercase tracking-wider">Shipping Address</div>
              <textarea
                id="shipping-address"
                name="shipping-address"
                value={shippingAddress}
                onChange={(e) => {
                  setShippingAddress(e.target.value);
                  if (addressError) setAddressError('');
                }}
                className={`bg-[#0A0A0A]/50 border text-[#F5F1E6] rounded-xl px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-[#D4AF37] transition duration-200 font-suisse-intl text-sm min-h-[100px] ${
                  addressError ? 'border-[#E67373]' : 'border-[#7c4d33]/50'
                }`}
              ></textarea>
              {addressError && (
                <p className="mt-1 text-[#E67373] text-xs font-suisse-intl">
                  {addressError}
                </p>
              )}
            </div>
            
            {/* Buttons */}
            <div className="space-y-3 mt-8">
              <Button
                onClick={handleCheckout}
                loading={isSubmitting}
                fullWidth
                rounded="full"
                className="border-[#D4AF37]/50 hover:bg-[#D4AF37]/10 shadow-lg"
              >
                Proceed to Payment
              </Button>
              
              <Button
                variant="outline"
                onClick={() => router.push('/products')}
                fullWidth
                rounded="full"
                className="border-[#7c4d33]/50 hover:bg-[#7c4d33]/10 hover:border-[#7c4d33]"
              >
                Continue Shopping
              </Button>
            </div>
            
            {/* Payment info */}
            <div className="mt-6 text-center text-[#e3dcd4]/60 text-xs font-suisse-intl">
              <p>Secure payment processing by Stripe</p>
              <p className="mt-2">
                By proceeding, you agree to our Terms of Service and Privacy Policy.
              </p>
            </div>
          </div>
        </div>
      </AnimatedSection>
      
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
    </div>
  );
}