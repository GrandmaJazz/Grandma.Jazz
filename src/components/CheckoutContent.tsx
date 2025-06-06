'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { OrderAPI } from '@/lib/api';
import { AnimatedSection } from '@/components/AnimatedSection';
import { Button } from '@/components/ui/Button';
import { toast } from 'react-hot-toast';

interface OrderResult {
  success: boolean;
  order?: {
    _id: string;
    // เพิ่ม property อื่นๆ ของ order ตามที่คุณมีในระบบ
  };
}

interface CheckoutContentProps {
  sessionId: string | null;
}

export default function CheckoutContent({ sessionId }: CheckoutContentProps) {
  const { isAuthenticated, isAuthLoading } = useAuth();
  const router = useRouter();
  
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
  
  // Verify payment and update order status
  useEffect(() => {
    async function verifyPayment() {
      if (!sessionId) {
        // Try to get orderId from session storage
        const storedOrderId = sessionStorage.getItem('latestOrderId');
        if (storedOrderId) {
          setOrderId(storedOrderId);
          setOrderConfirmed(true);
          setIsLoading(false);
          sessionStorage.removeItem('latestOrderId');
        } else {
          toast.error('Invalid checkout session');
          router.push('/orders');
        }
        return;
      }
      
      try {
        const result = await OrderAPI.verifyPayment(sessionId) as OrderResult;
        
        if (result.success) {
          setOrderConfirmed(true);
          if (result.order && result.order._id) {
            setOrderId(result.order._id);
          }
          sessionStorage.removeItem('latestOrderId');
        } else {
          toast.error('Payment verification failed');
        }
      } catch (error) {
        console.error('Payment verification error:', error);
        toast.error('An error occurred while verifying payment');
      } finally {
        setIsLoading(false);
      }
    }
    
    if (!isAuthLoading && isAuthenticated) {
      verifyPayment();
    }
  }, [isAuthenticated, isAuthLoading, router, sessionId]);
  
  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isAuthLoading, router]);
  
  if (isAuthLoading || isLoading) {
    return (
      <div className="min-h-screen pt-28 pb-16 bg-[#0A0A0A] flex justify-center items-center">
        <div className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  return (
    <div className="max-w-2xl mx-auto px-6">
      <AnimatedSection animation="fadeIn">
        {orderConfirmed ? (
          <div 
            className="bg-[#1a1a1a]/70 backdrop-blur-sm p-8 rounded-3xl shadow-lg border border-[#7c4d33]/20 relative overflow-hidden text-center"
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
            
            <div className="relative w-28 h-28 mx-auto mb-6">
              <div className="absolute inset-0 bg-[#D4AF37]/10 rounded-full"></div>
              <div className="absolute inset-2 bg-[#D4AF37]/20 rounded-full"></div>
              <div className="flex items-center justify-center h-full">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 text-[#D4AF37]">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
            </div>
            
            <h1 
              className="text-4xl text-[#D4AF37] font-editorial-ultralight mb-4"
              style={{ 
                textShadow: '0 0 10px rgba(212, 175, 55, 0.3)'
              }}
            >
              ยืนยันคำสั่งซื้อแล้ว!
            </h1>
            
            <p className="text-[#e3dcd4]/80 font-suisse-intl mb-8">
              ขอบคุณสำหรับการสั่งซื้อ คำสั่งซื้อของคุณได้รับการดำเนินการเรียบร้อยแล้ว
            </p>
            
            {orderId && (
              <div 
                className="bg-[#0A0A0A]/50 p-4 rounded-xl mb-8 inline-block border border-[#7c4d33]/30"
                style={{ animation: 'fadeInSlide 0.7s ease-out forwards' }}
              >
                <p className="text-[#D4AF37] text-sm font-suisse-intl-mono mb-1 uppercase tracking-wider">
                  รหัสคำสั่งซื้อ
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
                className="border-[#D4AF37]/50 hover:bg-[#D4AF37]/10 shadow-lg"
              >
                ดูรายละเอียดคำสั่งซื้อ
              </Button>
              
              <div className="flex space-x-3 mt-4">
                <Button 
                  variant="outline" 
                  onClick={() => router.push('/orders')} 
                  fullWidth
                  rounded="full"
                  className="border-[#7c4d33]/50 hover:bg-[#7c4d33]/10 hover:border-[#7c4d33]"
                >
                  คำสั่งซื้อของฉัน
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => router.push('/products')} 
                  fullWidth
                  rounded="full"
                  className="border-[#7c4d33]/50 hover:bg-[#7c4d33]/10 hover:border-[#7c4d33]"
                >
                  เลือกซื้อสินค้าต่อ
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div 
            className="bg-[#1a1a1a]/70 backdrop-blur-sm p-8 rounded-3xl shadow-lg border border-[#7c4d33]/20 relative overflow-hidden text-center"
            style={{ animation: 'fadeInSlide 0.5s ease-out forwards' }}
          >
            {/* Subtle glow effect at top */}
            <div 
              className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl overflow-hidden"
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
              การชำระเงินล้มเหลว
            </h1>
            
            <p className="text-[#e3dcd4]/80 font-suisse-intl mb-8">
              เราไม่สามารถยืนยันการชำระเงินของคุณได้ โปรดลองอีกครั้งหรือติดต่อฝ่ายสนับสนุนลูกค้า
            </p>
            
            <div className="space-y-3 mt-8">
              <Button 
                variant="outline" 
                onClick={() => router.push('/orders')} 
                fullWidth
                rounded="full"
                className="border-[#7c4d33]/50 hover:bg-[#7c4d33]/10 hover:border-[#7c4d33]"
              >
                คำสั่งซื้อของฉัน
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => router.push('/products')} 
                fullWidth
                rounded="full"
                className="border-[#7c4d33]/50 hover:bg-[#7c4d33]/10 hover:border-[#7c4d33]"
              >
                เลือกซื้อสินค้าต่อ
              </Button>
            </div>
          </div>
        )}
      </AnimatedSection>
    </div>
  );
}