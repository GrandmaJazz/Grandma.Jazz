// frontend/src/components/MusicProtectedRoute.tsx
'use client';

import { useRequireMusic } from '@/hooks/useRequireMusic';
import { ReactNode } from 'react';

interface MusicProtectedRouteProps {
  children: ReactNode;
}

export function MusicProtectedRoute({ children }: MusicProtectedRouteProps) {
  const { isChecking, isAllowed } = useRequireMusic();

  // แสดง loading indicator ขณะตรวจสอบ
  if (isChecking) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-2 border-[#D4AF37] opacity-30"></div>
          <div className="absolute top-0 left-0 w-16 h-16 rounded-full border-t-2 border-l-2 border-[#D4AF37] animate-spin"></div>
          <div className="absolute top-4 left-4 w-8 h-8 rounded-full bg-[#0A0A0A] flex items-center justify-center">
            <span className="text-[#D4AF37] text-xl">♪</span>
          </div>
        </div>
      </div>
    );
  }

  // ถ้าได้รับอนุญาต ให้แสดง children
  if (isAllowed) {
    return <>{children}</>;
  }

  // ถ้าไม่ได้รับอนุญาต ให้แสดง loading (เพราะกำลัง redirect)
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <div className="text-[#D4AF37] text-center">
        <div className="mb-4">
          <div className="relative mx-auto w-16 h-16">
            <div className="w-16 h-16 rounded-full border-2 border-[#D4AF37] opacity-30"></div>
            <div className="absolute top-0 left-0 w-16 h-16 rounded-full border-t-2 border-l-2 border-[#D4AF37] animate-spin"></div>
            <div className="absolute top-4 left-4 w-8 h-8 rounded-full bg-[#0A0A0A] flex items-center justify-center">
              <span className="text-[#D4AF37] text-xl">♪</span>
            </div>
          </div>
        </div>
        <p className="text-sm">Redirecting...</p>
      </div>
    </div>
  );
} 