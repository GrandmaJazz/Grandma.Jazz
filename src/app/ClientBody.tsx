// src/app/ClientBody.tsx (แก้ไข)
'use client';

import { useEffect, useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';
import { UIProvider } from '@/contexts/UIContext';
import { MusicPlayerProvider } from '@/contexts/MusicPlayerContext';  // เพิ่มบรรทัดนี้
import { GoogleOAuthProvider } from '@react-oauth/google';
const CartDrawer = dynamic(() => import('@/components/CartDrawer').then(module => module.CartDrawer), { ssr: false });
const LoginModal = dynamic(() => import('@/components/LoginModal'), { ssr: false });
import { useUI } from '@/contexts/UIContext';
import { useCart } from '@/contexts/CartContext';

// ส่วนนี้จะทำหน้าที่แสดง LoginModal โดยรับ props จาก UIContext
function LoginModalContainer() {
  const { isLoginModalOpen, closeLoginModal, loginRedirectUrl } = useUI();
  
  if (!isLoginModalOpen) return null;
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
  const { isCartOpen } = useCart();
  const [hasOpenedCart, setHasOpenedCart] = useState(false);
  useEffect(() => {
    if (isCartOpen) setHasOpenedCart(true);
  }, [isCartOpen]);
  return (
    <>
      {children}
      {(isCartOpen || hasOpenedCart) && <CartDrawer />}
      <LoginModalContainer />
      {/* <MusicPlayer /> TEMP DISABLED - build cache fix */}
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
