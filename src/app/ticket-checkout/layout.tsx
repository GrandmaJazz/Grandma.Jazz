//src/app/ticket-checkout/layout.tsx
import { Suspense } from 'react';

export default function TicketCheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={
      <div className="min-h-screen pt-28 pb-16 bg-[#0A0A0A] flex justify-center items-center">
        <div className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      {children}
    </Suspense>
  );
}