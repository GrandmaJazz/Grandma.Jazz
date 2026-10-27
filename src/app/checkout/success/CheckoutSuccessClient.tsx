//src/app/checkout/success/CheckoutSuccessClient.tsx
'use client';
import { cartItemKey } from '@/lib/productOptions';

import { useEffect, useRef, useState } from 'react';
import LogoLoadingSpinner from '@/components/LogoLoadingSpinner';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { OrderAPI } from '@/lib/api';
import { AnimatedSection } from '@/components/AnimatedSection';
import { Button } from '@/components/ui/Button';
import { useCart } from '@/contexts/CartContext';
import { confirmedOrderId, remainingCheckoutCart } from '@/lib/paymentConfirmation';
import { trackVerifiedPurchase } from '@/lib/ecommerceAnalytics';
import { toast } from 'react-hot-toast';

export default function CheckoutContent({ sessionId: providedSessionId }: { sessionId?: string | null } = {}) {
  const { isAuthenticated, isAuthLoading } = useAuth();
  const cart = useCart();
  const cartRef = useRef(cart);
  cartRef.current = cart;
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = providedSessionId === undefined ? searchParams?.get('session_id') : providedSessionId;
  const verification = useRef<{ sessionId: string; request: Promise<unknown> } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  
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
  
  // Only a verified paid session can show confirmation or settle the basket.
  useEffect(() => {
    if (isAuthLoading || !isAuthenticated) return;
    let active = true;
    setIsLoading(true);
    setOrderConfirmed(false);
    setOrderId(null);

    if (!sessionId) {
      setIsLoading(false);
      return;
    }

    // React may replay an effect in development. Reuse the request rather than
    // repeating an endpoint which also reconciles payment on the server.
    if (verification.current?.sessionId !== sessionId) {
      verification.current = { sessionId, request: OrderAPI.verifyPayment(sessionId) };
    }
    verification.current.request.then(result => {
      if (!active) return;
      const verifiedOrderId = confirmedOrderId(result);
      if (!verifiedOrderId) return;
      setOrderId(verifiedOrderId);
      setOrderConfirmed(true);
      // Fetch only the verified order's authoritative amounts for measurement.
      // Analytics failure cannot delay the receipt or alter payment state.
      void OrderAPI.getById(verifiedOrderId)
        .then(response => trackVerifiedPurchase(result, response.order))
        .catch(() => {});

      try {
        const pending = JSON.parse(sessionStorage.getItem('pendingCheckout') || 'null');
        const current = cartRef.current;
        const remaining = remainingCheckoutCart(current.items, pending, verifiedOrderId);
        if (remaining !== current.items) {
          for (const item of current.items) {
            const quantity = remaining.find(line => cartItemKey(line) === cartItemKey(item))?.quantity || 0;
            if (quantity !== item.quantity) current.updateQuantity(item.productId, quantity, item.colour);
          }
          sessionStorage.removeItem('pendingCheckout');
        }
        if (sessionStorage.getItem('latestOrderId') === verifiedOrderId) sessionStorage.removeItem('latestOrderId');
      } catch { /* Optional recovery storage must not hide a verified payment. */ }
    }).catch(error => {
      if (!active) return;
      console.error('Payment verification error:', error);
      toast.error('Unable to confirm payment. Check My Orders before trying again.');
    }).finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [isAuthenticated, isAuthLoading, sessionId]);

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      const returnPath = sessionId ? `/checkout/success/?session_id=${encodeURIComponent(sessionId)}` : '/checkout/success/';
      router.push(`/login/?redirect=${encodeURIComponent(returnPath)}`);
    }
  }, [isAuthenticated, isAuthLoading, router, sessionId]);

  if (isAuthLoading || isLoading) {
    return (
      <div className="min-h-screen pt-28 pb-16 bg-[#181818] flex justify-center items-center">
        <LogoLoadingSpinner width={160} />
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
      
      <AnimatedSection animation="fadeIn" className="max-w-2xl mx-auto px-6">
        {orderConfirmed ? (
          <div 
            className="bg-[#181818]/70 backdrop-blur-sm p-8 rounded-box shadow-lg border border-[#7c4d33]/20 relative overflow-hidden text-center"
            style={{ animation: 'fadeInSlide 0.5s ease-out forwards' }}
          >
            {/* Subtle glow effect at top */}
            <div 
              className="absolute top-0 left-0 right-0 h-1 rounded-t-box overflow-hidden"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(180, 155, 115, 0.2), transparent)',
                animation: 'pulse 3s infinite'
              }}
            ></div>
            
            <div className="relative w-28 h-28 mx-auto mb-6">
              <div className="absolute inset-0 bg-[#B49B73]/10 rounded-full"></div>
              <div className="absolute inset-2 bg-[#B49B73]/20 rounded-full"></div>
              <div className="flex items-center justify-center h-full">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 text-[#B49B73]">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
            </div>
            
            <h1 
              className="text-4xl text-[#B49B73] font-editorial-ultralight mb-4"
              style={{ 
                textShadow: '0 0 10px rgba(180, 155, 115, 0.3)'
              }}
            >
              Order Confirmed!
            </h1>
            
            <p className="text-[#e3dcd4]/80 font-suisse-intl mb-8">
              Thank you for your purchase. Your order has been successfully processed.
            </p>
            
            {orderId && (
              <div 
                className="bg-[#181818]/50 p-4 rounded-box mb-8 inline-block border border-[#7c4d33]/30"
                style={{ animation: 'fadeInSlide 0.7s ease-out forwards' }}
              >
                <p className="text-[#B49B73] text-sm font-suisse-intl-mono mb-1 uppercase tracking-wider">
                  ORDER ID
                </p>
                <p className="text-[#F5F1E6] font-suisse-intl-mono">
                  {orderId}
                </p>
              </div>
            )}
            
            <div className="space-y-3 mt-8">
              <Button 
                onClick={() => router.push(`/orders/${orderId}`)} 
                rounded="full"
                className="border-[#B49B73]/50 hover:bg-[#B49B73]/10 shadow-lg"
              >
                View Order Details
              </Button>
              
              <div className="flex space-x-3 mt-4">
                <Button 
                  variant="outline" 
                  onClick={() => router.push('/orders')} 
                  fullWidth
                  rounded="full"
                  className="border-[#7c4d33]/50 hover:bg-[#7c4d33]/10 hover:border-[#7c4d33]"
                >
                  My Orders
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
            </div>
          </div>
        ) : (
          <div 
            className="bg-[#181818]/70 backdrop-blur-sm p-8 rounded-box shadow-lg border border-[#7c4d33]/20 relative overflow-hidden text-center"
            style={{ animation: 'fadeInSlide 0.5s ease-out forwards' }}
          >
            {/* Subtle glow effect at top */}
            <div 
              className="absolute top-0 left-0 right-0 h-1 rounded-t-box overflow-hidden"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(226, 115, 115, 0.2), transparent)',
                animation: 'pulse 3s infinite'
              }}
            ></div>
            
            <div className="relative w-28 h-28 mx-auto mb-6">
              <div className="absolute inset-0 bg-[#E67373]/10 rounded-full"></div>
              <div className="absolute inset-2 bg-[#E67373]/20 rounded-full"></div>
              <div className="flex items-center justify-center h-full">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 text-[#E67373]">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="15" y1="9" x2="9" y2="15"></line>
                  <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
              </div>
            </div>
            
            <h1 
              className="text-4xl text-[#E67373] font-editorial-ultralight mb-4"
              style={{ 
                textShadow: '0 0 10px rgba(230, 115, 115, 0.3)'
              }}
            >
              Payment not yet confirmed
            </h1>
            
            <p className="text-[#e3dcd4]/80 font-suisse-intl mb-8">
              We haven&apos;t confirmed a completed payment. Check My Orders before paying again, or contact us if you were charged.
            </p>
            
            <div className="space-y-3 mt-8">
              <Button 
                variant="outline" 
                onClick={() => router.push('/orders')} 
                fullWidth
                rounded="full"
                className="border-[#7c4d33]/50 hover:bg-[#7c4d33]/10 hover:border-[#7c4d33]"
              >
                My Orders
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
          </div>
        )}
      </AnimatedSection>
    </div>
  );
}
