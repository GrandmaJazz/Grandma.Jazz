//src/app/ticket-checkout/layout.tsx
import { Suspense } from 'react';
import LogoLoadingSpinner from '@/components/LogoLoadingSpinner';

export default function TicketCheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={
      <div className="min-h-screen pt-28 pb-16 bg-[#181818] flex justify-center items-center">
        <LogoLoadingSpinner width={160} />
      </div>
    }>
      {children}
    </Suspense>
  );
}