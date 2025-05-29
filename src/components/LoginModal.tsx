//src/components/LoginModal.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { GoogleLogin } from '@react-oauth/google';
import { useRouter } from 'next/navigation';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  redirectUrl?: string;
}

export default function LoginModal({ isOpen, onClose, redirectUrl = '/' }: LoginModalProps) {
  const [showAgeVerification, setShowAgeVerification] = useState<boolean>(true);
  const modalRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  
  const { 
    loginWithGoogle, 
    isAuthenticated, 
    isAuthLoading, 
    setBirthYear: setAuthBirthYear 
  } = useAuth();
  
  // Add animation keyframes
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes scaleIn {
        from { transform: scale(0.95); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  
  // Reset states when modal is opened
  useEffect(() => {
    if (isOpen) {
      setShowAgeVerification(true);
      // Prevent body scrolling when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);
  
  // Close modal if user becomes authenticated
  useEffect(() => {
    if (isAuthenticated && isOpen) {
      onClose();
      if (redirectUrl) {
        router.push(redirectUrl);
      }
    }
  }, [isAuthenticated, isOpen, onClose, redirectUrl, router]);
  
  // Handle click outside to close modal
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);
  
  const handleAgeConfirm = (isOver20: boolean) => {
    if (!isOver20) {
      toast.error('You must be over 20 to access this site');
      onClose();
      return;
    }
    
    // Set birth year to 2000 for all accounts (making them ~25 years old)
    setAuthBirthYear(2000);
    
    // Proceed to login
    setShowAgeVerification(false);
  };
  
  // Handle Google login success
  const handleGoogleSuccess = async (credentialResponse: any) => {
    await loginWithGoogle(credentialResponse.credential);
  };
  
  // Handle Google login error
  const handleGoogleError = () => {
    toast.error('Google login failed. Please try again.');
  };
  
  if (!isOpen) return null;
  
  return (
    <div 
      className="fixed inset-0 bg-[#0A0A0A] bg-opacity-90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      style={{ animation: 'fadeIn 0.3s ease-out' }}
    >
      {/* Subtle texture overlay */}
      <div 
        className="absolute inset-0 opacity-5 mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundSize: '100px',
          backgroundRepeat: 'repeat'
        }}
      />
      
      {/* Modal Content */}
      <div 
        ref={modalRef}
        className="bg-[#0A0A0A] border border-[#F5F1E6]/20 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden relative"
        style={{ animation: 'scaleIn 0.3s ease-out' }}
      >
        {/* Close button - top right */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-[#F5F1E6]/60 hover:text-[#F5F1E6] transition-all duration-300 z-20"
          aria-label="Close modal"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        
        <div className="relative z-10 p-10">
          {isAuthLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="w-12 h-12 border-4 border-[#F5F1E6] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : showAgeVerification ? (
            <div className="space-y-8 text-center">
              {/* Main question - large text */}
              <div className="space-y-4">
                <h1 className="text-4xl md:text-5xl font-editorial-ultralight text-[#F5F1E6] leading-tight">
                  My dear, are you over 20?
                </h1>
                
                {/* Subtitle - small text */}
                <p className="text-[#F5F1E6]/70 text-sm font-suisse-intl lowercase tracking-wide">
                  this place is for grown ups.
                </p>
              </div>
              
              {/* Decorative line */}
              <div className="flex items-center justify-center">
                <div className="h-px w-24 bg-[#F5F1E6]/30"></div>
              </div>
              
              {/* Yes/No buttons */}
              <div className="flex gap-6 justify-center mt-12">
                <button 
                  onClick={() => handleAgeConfirm(true)}
                  className="px-12 py-4 bg-[#F5F1E6] text-[#0A0A0A] rounded-full hover:bg-[#F5F1E6]/90 
                  transition-all duration-300 font-suisse-intl-mono text-sm uppercase tracking-widest
                  shadow-lg hover:shadow-xl transform hover:-translate-y-1 min-w-[120px]"
                >
                  Yes
                </button>
                
                <button 
                  onClick={() => handleAgeConfirm(false)}
                  className="px-12 py-4 border-2 border-[#F5F1E6] text-[#F5F1E6] rounded-full 
                  hover:bg-[#F5F1E6] hover:text-[#0A0A0A] transition-all duration-300 
                  font-suisse-intl-mono text-sm uppercase tracking-widest
                  shadow-lg hover:shadow-xl transform hover:-translate-y-1 min-w-[120px]"
                >
                  No
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Title */}
              <div className="text-center mb-10">
                <h1 className="text-4xl md:text-5xl font-editorial-ultralight text-[#F5F1E6]">
                  Sign In
                </h1>
                
                {/* Decorative line */}
                <div className="flex items-center justify-center mt-4">
                  <div className="h-px w-16 bg-[#F5F1E6]/30"></div>
                </div>
              </div>
              
              <p className="text-[#F5F1E6]/70 text-center font-suisse-intl">
                Sign in with your Google account to continue.
              </p>
              
              {/* Google login container */}
              <div className="flex justify-center mt-8 relative">
                <div className="relative z-10 backdrop-blur-sm bg-[#0A0A0A]/80 p-4 rounded-2xl border border-[#F5F1E6]/20">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={handleGoogleError}
                    useOneTap={false} 
                    theme="filled_black"
                    shape="pill"
                    text="signin_with"
                    locale="en"
                    type="standard"
                    logo_alignment="center"
                  />
                </div>
              </div>
              
              {/* Decorative separator */}
              <div className="h-px w-full bg-[#F5F1E6]/20 my-6"></div>
              
              <p className="text-[#F5F1E6]/50 text-xs text-center font-suisse-intl">
                By logging in, you agree to our Terms of Service and Privacy Policy.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}