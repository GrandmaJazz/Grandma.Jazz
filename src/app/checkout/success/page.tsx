// src/app/checkout/success/page.tsx
import dynamic from 'next/dynamic';

// นำเข้า component แบบ dynamic เพื่อแก้ปัญหา Suspense boundary
const ClientCheckoutSuccess = dynamic(
  () => import('./client-component').then(mod => mod.CheckoutSuccessContent),
  {
    loading: () => (
      <div className="min-h-screen pt-28 pb-16 bg-[#0A0A0A] flex justify-center items-center">
        <div className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
      </div>
    ),
    ssr: false // ปิด Server-Side Rendering สำหรับ component นี้
  }
);

export default function CheckoutSuccessPage() {
  return <ClientCheckoutSuccess />;
}