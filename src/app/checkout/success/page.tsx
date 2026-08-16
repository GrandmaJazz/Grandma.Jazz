//src/app/checkout/success/page.tsx
'use client';

import { Suspense } from 'react';
import LogoLoadingSpinner from '@/components/LogoLoadingSpinner';
import CheckoutContent from './CheckoutSuccessClient';

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen pt-28 pb-16 bg-[#181818] flex justify-center items-center">
        <LogoLoadingSpinner width={160} />
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}