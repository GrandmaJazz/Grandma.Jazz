//src/app/checkout/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { OrderAPI, DiscountAPI } from '@/lib/api';
import { AnimatedSection } from '@/components/AnimatedSection';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { COUNTRIES, calculateShipping, getShippingErrorMessage } from '@/lib/shippingCalculator';
import { formatPrice } from '@/utils/helpers';

export default function CheckoutPage() {
  const { user, isAuthenticated, isAuthLoading } = useAuth();
  const { items, totalItems, totalPrice, clearCart, loadCartDetails } = useCart();
  const router = useRouter();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingCart, setIsLoadingCart] = useState(true);
  const [shippingAddress, setShippingAddress] = useState('');
  const [addressError, setAddressError] = useState('');
  const [destinationCountry, setDestinationCountry] = useState('Thailand');
  const [shippingCost, setShippingCost] = useState(50); // Default Thailand
  const [totalWeight, setTotalWeight] = useState(0);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; discountAmount: number; finalAmount: number } | null>(null);
  const [isValidatingDiscount, setIsValidatingDiscount] = useState(false);
  
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
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes scaleIn {
        from { opacity: 0; transform: scale(0.95); }
        to { opacity: 1; transform: scale(1); }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
      document.body.style.overflow = 'auto';
    };
  }, []);
  
  // Redirect if not logged in or cart is empty
  useEffect(() => {
    if (!isAuthLoading) {
      if (!isAuthenticated) {
        router.push('/login?redirect=/checkout');
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
  
  // Calculate shipping cost when country or items change
  useEffect(() => {
    if (items.length === 0) {
      setTotalWeight(0);
      setShippingCost(0);
      return;
    }
    
    // คำนวณน้ำหนักรวม
    const weight = items.reduce((sum, item) => {
      const itemWeight = (item as any).weight || 0;
      return sum + (itemWeight * item.quantity);
    }, 0);
    
    setTotalWeight(weight);
    
    // คำนวณค่าส่ง
    const cost = calculateShipping(destinationCountry, weight);
    
    if (cost === null) {
      const errorMsg = getShippingErrorMessage(destinationCountry, weight);
      toast.error(errorMsg || 'Unable to calculate shipping cost');
      setShippingCost(0);
    } else {
      setShippingCost(cost);
    }
  }, [items, destinationCountry]);
  
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
      router.push('/profile?redirect=/checkout');
      isValid = false;
    }
    
    return isValid;
  };
  
  // เปิด confirmation modal
  const handleProceedToPayment = () => {
    if (!validateForm()) {
      return;
    }
    
    // Validate shipping
    if (shippingCost === 0 && destinationCountry !== 'Thailand') {
      const errorMsg = getShippingErrorMessage(destinationCountry, totalWeight);
      toast.error(errorMsg || 'Unable to calculate shipping cost');
      return;
    }
    
    // แสดง confirmation modal
    setShowConfirmModal(true);
    document.body.style.overflow = 'hidden';
  };
  
  // ปิด modal
  const closeConfirmModal = () => {
    setShowConfirmModal(false);
    document.body.style.overflow = 'auto';
  };
  
  // Validate and apply discount
  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) {
      toast.error('Please enter a discount code');
      return;
    }

    setIsValidatingDiscount(true);
    try {
      const subtotal = totalPrice;
      
      // Discount is applied to subtotal only (not including shipping)
      const result = await DiscountAPI.validate(discountCode, subtotal);
      
      if (result.success && result.discount) {
        setAppliedDiscount({
          code: result.discount.code,
          discountAmount: result.discount.discountAmount,
          finalAmount: result.discount.finalAmount
        });
        toast.success('Discount code applied successfully!');
      }
    } catch (error: any) {
      console.error('Discount validation error:', error);
      toast.error(error.message || 'Invalid discount code');
      setAppliedDiscount(null);
    } finally {
      setIsValidatingDiscount(false);
    }
  };

  // Remove discount
  const handleRemoveDiscount = () => {
    setDiscountCode('');
    setAppliedDiscount(null);
  };

  // Handle checkout หลังจากยืนยันแล้ว
  const confirmCheckout = async () => {
    setIsSubmitting(true);
    
    try {
      const orderItems = items.map(item => ({
        product: item.productId,
        name: item.name || 'Unknown product',
        quantity: item.quantity,
        price: item.price || 0,
        image: item.image || '/images/placeholder-product.jpg',
        weight: (item as any).weight || 0
      }));
      
      const result = await OrderAPI.create({
        orderItems,
        shippingAddress,
        destinationCountry,
        shippingCost,
        discountCode: appliedDiscount?.code || null
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
      setIsSubmitting(false);
      closeConfirmModal();
    }
  };
  
  if (isAuthLoading || !isAuthenticated || items.length === 0 || isLoadingCart) {
    return (
      <div className="min-h-screen pt-28 pb-16 bg-[#181818] flex justify-center items-center">
        <div className="w-12 h-12 border-4 border-[#B49B73] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen pt-28 pb-16 bg-[#181818]">
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
          <div className="h-0.5 w-6 bg-[#B49B73]/30 mr-4"></div>
          <h1 
            className="text-4xl text-[#B49B73] font-editorial-ultralight"
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
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#B49B73] mr-2">
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
                      <span className="text-[#B49B73] font-suisse-intl-mono">
                        ${formatPrice((item.price || 0) * item.quantity)}
                      </span>
                    </div>
                    
                    <div className="text-[#e3dcd4]/80 font-suisse-intl">
                      ${formatPrice(item.price || 0)} × {item.quantity}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="border-t border-[#7c4d33]/30 pt-6 space-y-3">
              <div className="flex justify-between text-[#e3dcd4]/80 font-suisse-intl">
                <span>Subtotal</span>
                <span>${formatPrice(totalPrice)}</span>
              </div>
              <div className="flex justify-between text-[#e3dcd4]/80 font-suisse-intl">
                <span>Shipping to {destinationCountry}</span>
                <span>${formatPrice(shippingCost)}</span>
              </div>
              {appliedDiscount && (
                <div className="flex justify-between text-green-400 font-suisse-intl">
                  <span>Discount ({appliedDiscount.code})</span>
                  <span>-${formatPrice(appliedDiscount.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-[#F5F1E6] font-suisse-intl-mono text-lg pt-3 border-t border-[#7c4d33]/20">
                <span>Total</span>
                <span className="text-[#B49B73]">
                  ${formatPrice(appliedDiscount ? appliedDiscount.finalAmount + shippingCost : totalPrice + shippingCost)}
                </span>
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
                <div className="text-[#B49B73] text-sm font-suisse-intl-mono mb-2 uppercase tracking-wider">Customer</div>
                <div className="text-[#F5F1E6] font-suisse-intl bg-[#181818]/50 p-3 rounded-xl">
                  {`${user?.name || ''} ${user?.surname || ''}`}
                </div>
              </div>
              
              <div>
                <div className="text-[#B49B73] text-sm font-suisse-intl-mono mb-2 uppercase tracking-wider">Email</div>
                <div className="text-[#F5F1E6] font-suisse-intl bg-[#181818]/50 p-3 rounded-xl">
                  {user?.email || ''}
                </div>
              </div>
              
              <div>
                <div className="text-[#B49B73] text-sm font-suisse-intl-mono mb-2 uppercase tracking-wider">Phone</div>
                <div className="text-[#F5F1E6] font-suisse-intl bg-[#181818]/50 p-3 rounded-xl">
                  {user?.phone || ''}
                </div>
              </div>
            </div>
            
            {/* Discount Code */}
            <div className="mb-6">
              <div className="text-[#B49B73] text-sm font-suisse-intl-mono mb-2 uppercase tracking-wider">Discount Code</div>
              {!appliedDiscount ? (
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                    placeholder="Enter discount code"
                    className="bg-[#181818]/50 border border-[#7c4d33]/50 text-[#F5F1E6] rounded-xl px-4 py-2.5 flex-1 focus:outline-none focus:ring-2 focus:ring-[#B49B73] transition duration-200 font-suisse-intl text-sm"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleApplyDiscount();
                      }
                    }}
                  />
                  <Button
                    onClick={handleApplyDiscount}
                    disabled={isValidatingDiscount || !discountCode.trim()}
                    className="bg-[#B49B73] hover:bg-[#B49B73]/90 text-[#0A0A0A] font-suisse-intl-mono whitespace-nowrap"
                  >
                    {isValidatingDiscount ? 'Applying...' : 'Apply'}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400">
                      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                      <line x1="7" y1="7" x2="7.01" y2="7"></line>
                    </svg>
                    <span className="text-green-400 font-suisse-intl-mono">{appliedDiscount.code}</span>
                    <span className="text-green-400/80 font-suisse-intl text-sm">
                      -${formatPrice(appliedDiscount.discountAmount)} discount applied
                    </span>
                  </div>
                  <button
                    onClick={handleRemoveDiscount}
                    className="text-red-400 hover:text-red-300 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
              )}
            </div>
            
            {/* Destination Country */}
            <div className="mb-6">
              <div className="text-[#B49B73] text-sm font-suisse-intl-mono mb-2 uppercase tracking-wider">Destination Country</div>
              <select
                value={destinationCountry}
                onChange={(e) => setDestinationCountry(e.target.value)}
                className="bg-[#181818]/50 border border-[#7c4d33]/50 text-[#F5F1E6] rounded-xl px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-[#B49B73] transition duration-200 font-suisse-intl text-sm"
              >
                {COUNTRIES.map(country => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
              {destinationCountry === 'Thailand' && (
                <p className="mt-1 text-[#B49B73] text-xs font-suisse-intl">
                </p>
              )}
            </div>
            
            {/* Shipping address */}
            <div className="mb-6">
              <div className="text-[#B49B73] text-sm font-suisse-intl-mono mb-2 uppercase tracking-wider">Shipping Address</div>
              <textarea
                id="shipping-address"
                name="shipping-address"
                value={shippingAddress}
                onChange={(e) => {
                  setShippingAddress(e.target.value);
                  if (addressError) setAddressError('');
                }}
                className={`bg-[#181818]/50 border text-[#F5F1E6] rounded-xl px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-[#B49B73] transition duration-200 font-suisse-intl text-sm min-h-[100px] ${
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
                onClick={handleProceedToPayment}
                fullWidth
                rounded="default"
                className="bg-[#B49B73] hover:bg-[#B49B73]/90 text-[#0A0A0A] font-suisse-intl-mono shadow-lg"
              >
                Proceed to Payment
              </Button>
              
              <Button
                variant="outline"
                onClick={() => router.push('/products')}
                fullWidth
                rounded="default"
                className="border-[#B49B73]/50 hover:bg-[#B49B73]/10 hover:border-[#B49B73]"
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
      
      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          style={{ animation: 'fadeIn 0.2s ease-out forwards' }}
          onClick={closeConfirmModal}
        >
          <div 
            className="bg-[#1a1a1a] border border-[#B49B73]/30 rounded-3xl p-8 max-w-lg w-full shadow-2xl"
            style={{ animation: 'scaleIn 0.3s ease-out forwards' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Grandma Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-[#B49B73]/10 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#B49B73]">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
            </div>

            {/* Title */}
            <h3 className="text-2xl font-editorial-ultralight text-[#B49B73] text-center mb-2">
              Grandma Says
            </h3>
            
            {/* Message */}
            <p className="text-[#F5F1E6] text-center font-suisse-intl mb-8 leading-relaxed">
              Check your goodies before buying—no returns, no refunds after purchase.
            </p>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                fullWidth
                rounded="default"
                onClick={confirmCheckout}
                loading={isSubmitting}
                className="bg-[#B49B73] hover:bg-[#B49B73]/90 text-[#0A0A0A] font-suisse-intl-mono"
              >
                {isSubmitting ? 'Processing...' : 'OK, I Understand'}
              </Button>
              
              <Button
                fullWidth
                variant="outline"
                rounded="default"
                onClick={closeConfirmModal}
                disabled={isSubmitting}
                className="border-[#7c4d33]/50 hover:bg-[#7c4d33]/10 text-[#e3dcd4]"
              >
                Let Me Check Again
              </Button>
            </div>
          </div>
        </div>
      )}

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