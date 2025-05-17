'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AnimatedSection } from '@/components/AnimatedSection';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { toast } from 'react-hot-toast';
import { GoogleLogin } from '@react-oauth/google';

export default function LoginPage() {
  const [birthYear, setBirthYear] = useState<string>('');
  const [birthYearError, setBirthYearError] = useState<string>('');
  const [showAgeVerification, setShowAgeVerification] = useState<boolean>(true);
  
  const { loginWithGoogle, isAuthenticated, isAuthLoading, setBirthYear: setAuthBirthYear } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';
  
  // Add animation keyframes
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
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
  
  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated && !isAuthLoading) {
      router.push(redirect);
    }
  }, [isAuthenticated, isAuthLoading, router, redirect]);
  
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
  
  if (isAuthLoading) {
    return (
      <div className="min-h-screen pt-28 pb-16 bg-[#0A0A0A] flex justify-center items-center">
        <div className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen pt-28 pb-16 bg-[#0A0A0A]">
      {/* Noise texture overlay */}
      <div 
        className="fixed inset-0 opacity-15 mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundSize: '150px',
          backgroundRepeat: 'repeat',
          zIndex: -1
        }}
      />
      
      <AnimatedSection animation="fadeIn" className="max-w-md mx-auto px-6">
        <div className="bg-[#7c4d33]/40 border border-[#D4AF37]/20 backdrop-blur-md p-10 rounded-[40px] shadow-xl relative overflow-hidden">
          {/* Subtle radial gradient */}
          <div 
            className="absolute inset-0 opacity-30 pointer-events-none"
            style={{
              background: 'radial-gradient(circle at center, rgba(184, 140, 65, 0.4) 0%, rgba(10, 10, 10, 0.2) 70%)',
              animation: 'pulse 4s infinite ease-in-out'
            }}
          ></div>
          
          <div className="relative z-10">
            {/* Title with golden glow */}
            <div className="text-center mb-10">
              <h1 
                className="text-5xl font-editorial-ultralight"
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
            
            {showAgeVerification ? (
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
        
        {/* Decorative element at the bottom */}
        <div className="flex justify-center mt-6">
          <div className="h-1 w-8 bg-[#D4AF37]/30 rounded-full"></div>
        </div>
      </AnimatedSection>
    </div>
  );
}