//src/contexts/UIContext.tsx
'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface UIContextProps {
  isLoginModalOpen: boolean;
  loginRedirectUrl: string;
  openLoginModal: (redirectUrl?: string) => void;
  closeLoginModal: () => void;
}

const UIContext = createContext<UIContextProps | undefined>(undefined);

export function UIProvider({ children }: { children: ReactNode }) {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginRedirectUrl, setLoginRedirectUrl] = useState('/');
  
  const openLoginModal = (redirectUrl: string = '/') => {
    setLoginRedirectUrl(redirectUrl);
    setIsLoginModalOpen(true);
  };
  
  const closeLoginModal = () => {
    setIsLoginModalOpen(false);
  };
  
  return (
    <UIContext.Provider value={{
      isLoginModalOpen,
      loginRedirectUrl,
      openLoginModal,
      closeLoginModal
    }}>
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }
  
  return context;
}