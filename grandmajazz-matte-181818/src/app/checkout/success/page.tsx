//src/app/checkout/success/page.tsx
'use client';

import { Suspense } from 'react';
import CheckoutContent from './CheckoutSuccessClient';

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen pt-28 pb-16 bg-[#181818] flex justify-center items-center">
        <div className="w-12 h-12 border-4 border-[#B49B73] border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}