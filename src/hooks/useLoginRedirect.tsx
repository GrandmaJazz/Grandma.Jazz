//src/hooks/useLoginRedirect.tsx
'use client';

import { useUI } from '@/contexts/UIContext';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

/**
 * ฮุคสำหรับเปลี่ยนการนำทางไปยังหน้า login เป็นการแสดง login modal แทน
 * @param redirectPath เส้นทางที่จะนำทางไปหลังจาก login สำเร็จ
 */
export function useLoginRedirect(redirectPath = '/') {
  const { openLoginModal } = useUI();
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  
  // ฟังก์ชันสำหรับตรวจสอบว่าต้อง login หรือไม่ ถ้าจำเป็นจะแสดง login modal
  const requireLogin = (callback?: () => void) => {
    if (!isAuthenticated) {
      openLoginModal(redirectPath);
      return false;
    }
    
    if (callback) {
      callback();
    }
    
    return true;
  };
  
  // ฟังก์ชันสำหรับเปลี่ยนเส้นทางที่จะนำทางไปหลังจาก login
  const redirectAfterLogin = (newPath: string) => {
    openLoginModal(newPath);
  };
  
  return { requireLogin, redirectAfterLogin };
}