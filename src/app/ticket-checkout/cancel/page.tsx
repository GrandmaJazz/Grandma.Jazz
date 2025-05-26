//src/app/ticket-checkout/cancel/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatedSection } from '@/components/AnimatedSection';
import { Button } from '@/components/ui/Button';

export default function TicketCheckoutCancelPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ticketId = searchParams.get('ticketId');
  
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
      
      <AnimatedSection animation="fadeIn" className="max-w-2xl mx-auto px-6">
        <div 
          className="bg-[#1a1a1a]/70 backdrop-blur-sm p-8 rounded-3xl shadow-lg border border-[#7c4d33]/20 relative overflow-hidden text-center"
          style={{ animation: 'fadeInSlide 0.5s ease-out forwards' }}
        >
          {/* Subtle glow effect at top */}
          <div 
            className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl overflow-hidden"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(124, 77, 51, 0.2), transparent)',
              animation: 'pulse 3s infinite'
            }}
          ></div>
          
          <div className="relative w-28 h-28 mx-auto mb-6">
            <div className="absolute inset-0 bg-[#7c4d33]/10 rounded-full"></div>
            <div className="absolute inset-2 bg-[#7c4d33]/20 rounded-full"></div>
            <div className="flex items-center justify-center h-full">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 text-[#e3dcd4]">
                <path d="M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m9 9a9 9 0 0 1-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9"></path>
              </svg>
            </div>
          </div>
          
          <h1 
            className="text-4xl font-editorial-ultralight mb-4"
            style={{ 
              textShadow: '0 0 10px rgba(227, 220, 212, 0.1)'
            }}
          >
            <span className="text-[#F5F1E6]">Payment</span> <span className="text-[#D4AF37]">Cancelled</span>
          </h1>
          
          <p className="text-[#e3dcd4]/80 font-suisse-intl mb-8">
            Your ticket payment was cancelled. Your ticket reservation is still available if you wish to complete your purchase.
          </p>
          
          <div className="space-y-3 mt-8">
            {ticketId && (
              <Button 
                onClick={() => router.push(`/ticket-checkout/${ticketId}`)} 
                rounded="full"
                className="border-[#D4AF37]/50 hover:bg-[#D4AF37]/10 shadow-lg"
                fullWidth
              >
                Try Payment Again
              </Button>
            )}
            
            <Button 
              onClick={() => router.push('/my-tickets')} 
              variant="outline"
              fullWidth
              rounded="full"
              className="border-[#7c4d33]/50 hover:bg-[#7c4d33]/10 hover:border-[#7c4d33]"
            >
              Back to My Tickets
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => router.push('/')} 
              fullWidth
              rounded="full"
              className="border-[#7c4d33]/50 hover:bg-[#7c4d33]/10 hover:border-[#7c4d33]"
            >
              Back to Home
            </Button>
          </div>
        </div>
      </AnimatedSection>
    </div>
  );
}