// src/app/ClientBody.tsx (แก้ไข)
'use client';

import type { ReactNode } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';
import { UIProvider } from '@/contexts/UIContext';
import { MusicPlayerProvider } from '@/contexts/MusicPlayerContext';  // เพิ่มบรรทัดนี้
import MusicPlayer from '@/components/MusicPlayer';  // เพิ่มบรรทัดนี้
import { GoogleOAuthProvider } from '@react-oauth/google';
import { CartDrawer } from '@/components/CartDrawer';
import LoginModal from '@/components/LoginModal';
import { useUI } from '@/contexts/UIContext';

// ส่วนนี้จะทำหน้าที่แสดง LoginModal โดยรับ props จาก UIContext
function LoginModalContainer() {
  const { isLoginModalOpen, closeLoginModal, loginRedirectUrl } = useUI();
  
  return (
    <LoginModal 
      isOpen={isLoginModalOpen} 
      onClose={closeLoginModal} 
      redirectUrl={loginRedirectUrl} 
    />
  );
}

// ส่วนนี้จะทำหน้าที่หลักในการให้ Context แก่แอพพลิเคชัน
function ClientBodyContent({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <CartDrawer />
      <LoginModalContainer />
      <MusicPlayer />  {/* เพิ่มบรรทัดนี้ */}
      <Toaster position="top-center" />
    </>
  );
}

// ส่วนหลักที่ export ไปใช้
export function ClientBody({ children }: { children: ReactNode }) {
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
  
  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <AuthProvider>
        <CartProvider>
          <UIProvider>
            <MusicPlayerProvider>  {/* เพิ่ม MusicPlayerProvider ที่นี่ */}
              <ClientBodyContent>
                {children}
              </ClientBodyContent>
            </MusicPlayerProvider>
          </UIProvider>
        </CartProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}