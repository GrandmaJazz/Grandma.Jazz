'use client';

import { Suspense } from 'react';
import { SessionIdProvider } from './SessionIdProvider';
import CheckoutContent from '@/components/CheckoutContent';

export default function CheckoutSuccessPage() {
  return (
    <div className="min-h-screen pt-28 pb-16 bg-[#0A0A0A]">
      <div 
        className="fixed inset-0 opacity-15 mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundSize: '150px',
          backgroundRepeat: 'repeat',
          zIndex: -1
        }}
      />
      
      <Suspense fallback={
        <div className="min-h-screen flex justify-center items-center">
          <div className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
        </div>
      }>
        <SessionIdProvider>
          {(sessionId) => (
            <CheckoutContent sessionId={sessionId} />
          )}
        </SessionIdProvider>
      </Suspense>
    </div>
  );
}