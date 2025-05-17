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
  const [birthYear, setBirthYear] = useState<string>('');
  const [birthYearError, setBirthYearError] = useState<string>('');
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
      @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes scaleIn {
        from { transform: scale(0.95); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
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
      setBirthYear('');
      setBirthYearError('');
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
  
  const handleVerifyAge = () => {
    // Clear previous error
    setBirthYearError('');
    
    // Validate birth year
    if (!birthYear) {
      setBirthYearError('Please enter your birth year');
      return;
    }
    
    const yearNum = parseInt(birthYear, 10);
    const currentYear = new Date().getFullYear();
    
    if (isNaN(yearNum) || yearNum.toString().length !== 4) {
      setBirthYearError('Please enter a valid 4-digit year');
      return;
    }
    
    if (yearNum > currentYear) {
      setBirthYearError('Birth year cannot be in the future');
      return;
    }
    
    if (yearNum < currentYear - 120) {
      setBirthYearError('Please enter a valid birth year');
      return;
    }
    
    // Calculate age
    const age = currentYear - yearNum;
    
    if (age < 21) {
      setBirthYearError('You must be at least 21 years old to access this site');
      return;
    }
    
    // Set birth year in auth context
    setAuthBirthYear(yearNum);
    
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
      className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      style={{ animation: 'fadeIn 0.3s ease-out' }}
    >
      {/* Noise texture overlay */}
      <div 
        className="absolute inset-0 opacity-15 mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundSize: '150px',
          backgroundRepeat: 'repeat'
        }}
      />
      
      {/* Modal Content */}
      <div 
        ref={modalRef}
        className="bg-[#7c4d33]/40 border border-[#D4AF37]/20 backdrop-blur-md rounded-[40px] shadow-2xl max-w-md w-full overflow-hidden relative"
        style={{ animation: 'scaleIn 0.3s ease-out' }}
      >
        {/* Close button - top right */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-[#e3dcd4] hover:text-[#F5F1E6] transition-all duration-300 z-20"
          aria-label="Close modal"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        
        {/* Subtle radial gradient */}
        <div 
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at center, rgba(184, 140, 65, 0.4) 0%, rgba(10, 10, 10, 0.2) 70%)'
          }}
        ></div>
        
        <div className="relative z-10 p-10">
          {/* Title with golden glow */}
          <div className="text-center mb-10">
            <h1 
              className="text-4xl md:text-5xl font-editorial-ultralight"
              style={{ 
                background: 'linear-gradient(90deg, #D4AF37, #b88c41, #D4AF37)',
                backgroundSize: '400% 100%',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                animation: 'shimmer 8s ease-in-out infinite',
                textShadow: '0 0 20px rgba(212, 175, 55, 0.2)'
              }}
            >
              {showAgeVerification ? 'Age Verification' : 'Sign In'}
            </h1>
            
            {/* Decorative line */}
            <div className="flex items-center justify-center mt-4">
              <div className="h-px w-16 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent"></div>
            </div>
          </div>
          
          {isAuthLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : showAgeVerification ? (
            <div className="space-y-8">
              <p className="text-[#e3dcd4] text-center font-suisse-intl">
                Please enter your birth year to verify your age.
              </p>
              
              {/* Custom styled birth year input */}
              <div className="mt-6">
                <label className="block text-sm font-suisse-intl-mono uppercase mb-2 text-[#D4AF37]">
                  Birth Year
                </label>
                <input
                  type="number"
                  placeholder="e.g., 1985"
                  value={birthYear}
                  onChange={(e) => setBirthYear(e.target.value)}
                  className={`bg-[#0A0A0A]/80 border ${birthYearError ? 'border-[#E67373]' : 'border-[#D4AF37]/30'} 
                  text-[#F5F1E6] rounded-2xl px-5 py-4 w-full focus:outline-none focus:ring-2 
                  focus:ring-[#D4AF37]/50 transition duration-300 font-suisse-intl text-center text-lg`}
                  min="1900"
                  max={new Date().getFullYear()}
                  maxLength={4}
                />
                {birthYearError && (
                  <p className="mt-2 text-[#E67373] text-sm text-center">{birthYearError}</p>
                )}
              </div>
              
              {/* Custom styled button */}
              <button 
                onClick={handleVerifyAge}
                className="w-full mt-8 px-8 py-4 rounded-full bg-[#D4AF37] text-[#0A0A0A] 
                hover:bg-[#b88c41] transition-all duration-300 font-suisse-intl-mono text-sm
                tracking-wide uppercase shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Verify & Continue
              </button>
              
              <p className="text-[#e3dcd4]/60 text-xs text-center mt-6 font-suisse-intl">
                You must be at least 21 years old to access Grandma Jazz.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              <p className="text-[#e3dcd4] text-center font-suisse-intl">
                Sign in with your Google account to continue.
              </p>
              
              {/* Custom Google login container */}
              <div className="flex justify-center mt-6 relative">
                <div className="relative z-10 backdrop-blur-sm bg-[#0A0A0A]/40 p-3 rounded-full">
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
                
                {/* Decorative glow behind the button */}
                <div 
                  className="absolute inset-0 rounded-full opacity-30"
                  style={{
                    background: 'radial-gradient(circle at center, rgba(212, 175, 55, 0.6) 0%, transparent 70%)',
                    filter: 'blur(8px)'
                  }}
                ></div>
              </div>
              
              {/* Decorative separator */}
              <div className="h-px w-full bg-gradient-to-r from-transparent via-[#D4AF37]/30 to-transparent my-6"></div>
              
              <p className="text-[#e3dcd4]/60 text-xs text-center font-suisse-intl">
                By logging in, you agree to our Terms of Service and Privacy Policy.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}