import LogoLoadingSpinner from '@/components/LogoLoadingSpinner';
// src/app/checkout/success/loading.tsx
export default function Loading() {
  return (
    <div className="min-h-screen pt-28 pb-16 bg-[#181818] flex justify-center items-center">
      <LogoLoadingSpinner width={160} />
    </div>
  );
}