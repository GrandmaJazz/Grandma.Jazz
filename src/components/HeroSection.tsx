'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';

interface ThreeViewerRef {
  triggerModelMovement: () => void;
  startModel1AnimationsFromCardSelection: () => void;
}

interface HeroSectionProps {
  showViewer: boolean;
  onInit: () => void;
  isLoadingModel?: boolean;
  onModelLoaded?: () => void;
  logoSrc?: string;
  logoAlt?: string;
  onSlideToNext?: () => void;
  cardSelected?: boolean;
}

const ThreeViewer = dynamic(() => import('@/components/ThreeViewer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen flex items-center justify-center bg-[#0A0A0A]">
      <div className="w-12 h-12 border-4 border-[#b88c41] border-t-transparent rounded-full animate-spin" />
    </div>
  )
});

// ตรวจจับอุปกรณ์ที่ควรแสดงวิดีโอ
const shouldShowVideo = () => {
  if (typeof window === 'undefined') return false;
  
  const ua = navigator.userAgent;
  const isIPhone = /iPhone/.test(ua);
  const isIPad = /iPad/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isMobile = /Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua) && window.innerWidth < 768;
  
  return isIPhone || isIPad || isMobile;
};

const HeroSection: React.FC<HeroSectionProps> = ({ 
  showViewer, 
  onInit, 
  isLoadingModel = false,
  onModelLoaded,
  logoSrc = '/images/Grandma-Jazz-Logo.webp',
  logoAlt = 'Grandma Jazz Logo',
  onSlideToNext,
  cardSelected = false
}) => {
  const [mounted, setMounted] = useState(false);
  const [contentLoaded, setContentLoaded] = useState(false);
  const [showClickOverlay, setShowClickOverlay] = useState(false);
  const [isVideoMode, setIsVideoMode] = useState(false);
  
  const threeViewerRef = useRef<ThreeViewerRef>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const slideTimerRef = useRef<NodeJS.Timeout>();

  // Mount และตรวจสอบอุปกรณ์
  useEffect(() => {
    setMounted(true);
    setIsVideoMode(shouldShowVideo());
    
    const handleResize = () => setIsVideoMode(shouldShowVideo());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle content loaded
  const handleContentLoaded = useCallback(() => {
    setContentLoaded(true);
    onModelLoaded?.();
    onInit?.();
  }, [onModelLoaded, onInit]);

  // Video loaded
  const handleVideoReady = useCallback(() => {
    if (isVideoMode) handleContentLoaded();
  }, [isVideoMode, handleContentLoaded]);

  // Video error fallback
  const handleVideoError = useCallback(() => {
    setTimeout(() => {
      if (!contentLoaded) handleContentLoaded();
    }, 3000);
  }, [contentLoaded, handleContentLoaded]);

  // Fallback timer สำหรับโมเดล 3D
  useEffect(() => {
    if (isVideoMode || contentLoaded) return;
    
    const timer = setTimeout(() => {
      if (!contentLoaded) handleContentLoaded();
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [isVideoMode, contentLoaded, handleContentLoaded]);

  // Trigger model movement (สำหรับ 3D)
  useEffect(() => {
    if (!mounted || isVideoMode || !showViewer) return;

    let attempts = 0;
    const tryTrigger = () => {
      if (threeViewerRef.current) {
        threeViewerRef.current.triggerModelMovement();
      } else if (attempts++ < 10) {
        setTimeout(tryTrigger, 200);
      }
    };
    
    setTimeout(tryTrigger, 100);
  }, [mounted, isVideoMode, showViewer]);

  // เล่นวิดีโอ/แอนิเมชั่นเมื่อเลือกการ์ด
  useEffect(() => {
    if (!cardSelected || !contentLoaded) return;

    if (isVideoMode && videoRef.current) {
      videoRef.current.play().catch(console.error);
    } else if (!isVideoMode && threeViewerRef.current) {
      threeViewerRef.current.startModel1AnimationsFromCardSelection();
    }

    // แสดง overlay และตั้งเวลาสไลด์
    setShowClickOverlay(true);
    slideTimerRef.current = setTimeout(() => {
      onSlideToNext?.();
    }, 7000);

    return () => {
      setShowClickOverlay(false);
      if (slideTimerRef.current) clearTimeout(slideTimerRef.current);
    };
  }, [cardSelected, contentLoaded, isVideoMode, onSlideToNext]);

  // Handle click to skip
  const handleSkip = useCallback(() => {
    if (showClickOverlay) {
      setShowClickOverlay(false);
      if (slideTimerRef.current) clearTimeout(slideTimerRef.current);
      onSlideToNext?.();
    }
  }, [showClickOverlay, onSlideToNext]);

  // Memoized styles
  const viewerStyle = useMemo(() => ({
    transform: showViewer ? 'translateY(0)' : 'translateY(-100%)',
    transition: 'transform 2s cubic-bezier(0.16, 1, 0.3, 1)',
  }), [showViewer]);

  if (!mounted) return null;

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#0A0A0A]">
      {/* Logo Section - แสดงเมื่อโหลดเสร็จ */}
      {contentLoaded && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <div className="relative w-full max-w-[280px] xs:max-w-[320px] sm:max-w-[450px] md:max-w-[600px] lg:max-w-[750px] xl:max-w-[900px] 2xl:max-w-[1100px] aspect-[3/1] mt-[-120px] xs:mt-[-140px] sm:mt-[-180px] md:mt-[-250px] lg:mt-[-280px] xl:mt-[-300px] 2xl:mt-[-350px] px-[15px] xs:px-[20px] sm:px-[30px] md:px-[40px]">
            <Image
              src={logoSrc}
              alt={logoAlt}
              fill
              className="object-contain drop-shadow-2xl"
              sizes="(max-width: 475px) 280px, (max-width: 640px) 320px, (max-width: 768px) 450px, (max-width: 1024px) 600px, (max-width: 1280px) 750px, (max-width: 1536px) 900px, 1100px"
              priority
            />
          </div>
        </div>
      )}

      {/* Content Section - วิดีโอหรือโมเดล 3D */}
      {showViewer && (
        <div 
          className="absolute inset-0 z-30"
          style={viewerStyle}
        >
          <div className="relative w-full h-full">
            {isVideoMode ? (
              <div className="absolute bottom-[20px] left-0 right-0 w-full">
                <video
                  ref={videoRef}
                  src="/videos/Safarionly.webm"
                  className="w-full h-auto object-cover"
                  playsInline
                  muted
                  preload="auto"
                  onCanPlayThrough={handleVideoReady}
                  onError={handleVideoError}
                />
              </div>
            ) : (
              <ThreeViewer 
                ref={threeViewerRef}
                height="h-[100vh]" 
                className="bg-transparent"
                onModelLoaded={handleContentLoaded}
              />
            )}
            <div className="absolute bottom-0 left-0 right-0 h-[100px] bg-gradient-to-t from-[#0A0A0A] to-transparent pointer-events-none" />
          </div>
        </div>
      )}

      {/* Loading Spinner */}
      {!contentLoaded && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0A0A]">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-2 border-[#b88c41] opacity-30" />
            <div className="absolute top-0 left-0 w-16 h-16 rounded-full border-t-2 border-l-2 border-[#b88c41] animate-spin" />
            <div className="absolute top-4 left-4 w-8 h-8 rounded-full bg-[#0A0A0A] flex items-center justify-center">
              <span className="text-[#b88c41] text-xl">♪</span>
            </div>
          </div>
        </div>
      )}

      {/* Top Gradient Overlay */}
      <div 
        className="absolute inset-0 pointer-events-none z-40 bg-gradient-to-b from-[#0A0A0A] to-transparent"
        style={{ 
          opacity: showViewer ? 0 : 1,
          transition: 'opacity 0.8s ease-in-out',
          height: '30vh'
        }}
      />

      {/* Click to Skip Overlay */}
      {showClickOverlay && (
        <button
          onClick={handleSkip}
          className="absolute inset-0 z-[60] bg-transparent cursor-pointer"
          aria-label="Click to continue"
        />
      )}
    </div>
  );
};

export default React.memo(HeroSection);
