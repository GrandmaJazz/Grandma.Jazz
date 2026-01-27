'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';

interface ThreeViewerRef {
  triggerModelMovement: () => void;
  startModel1AnimationsFromCardSelection: () => void;
}

interface HeroSectionProps {
  showViewer: boolean;
  onInit: () => void;
  loading?: boolean;
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

// Custom hook สำหรับตรวจจับอุปกรณ์
const useDeviceDetection = () => {
  const [shouldShowVideo, setShouldShowVideo] = useState(false);

  useEffect(() => {
    const detectDevice = () => {
      const ua = navigator.userAgent;
      const isIPhone = /iPhone/.test(ua);
      const isIPad = /iPad/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const isMobile = /Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua) && window.innerWidth < 768;
      
      const showVideo = isIPhone || isIPad || isMobile;
      
      console.log('📱 Device Detection:', { 
        isIPhone, 
        isIPad, 
        isMobile, 
        shouldShowVideo: showVideo,
        screenWidth: window.innerWidth 
      });
      
      setShouldShowVideo(showVideo);
    };

    detectDevice();
    window.addEventListener('resize', detectDevice);
    return () => window.removeEventListener('resize', detectDevice);
  }, []);

  return shouldShowVideo;
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
  const [modelLoaded, setModelLoaded] = useState(false);
  const [showClickableOverlay, setShowClickableOverlay] = useState(false);
  
  const threeViewerRef = useRef<ThreeViewerRef>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const onSlideToNextRef = useRef(onSlideToNext);
  
  const shouldShowVideo = useDeviceDetection();

  // Debug log
  useEffect(() => {
    console.log('🔍 HeroSection State:', { 
      mounted, 
      modelLoaded, 
      showViewer, 
      shouldShowVideo,
      cardSelected 
    });
  }, [mounted, modelLoaded, showViewer, shouldShowVideo, cardSelected]);

  // Update ref
  useEffect(() => {
    onSlideToNextRef.current = onSlideToNext;
  }, [onSlideToNext]);

  // Mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle content loaded (3D model or video)
  const handleContentLoaded = useCallback(() => {
    console.log('✅ Content loaded:', { shouldShowVideo, modelLoaded });
    setModelLoaded(true);
    onModelLoaded?.();
  }, [onModelLoaded, shouldShowVideo, modelLoaded]);

  // Play animation/video after card selection
  useEffect(() => {
    if (!cardSelected || !modelLoaded) return;

    if (shouldShowVideo && videoRef.current) {
      console.log('🎬 Playing video');
      videoRef.current.play().catch(console.error);
    } else if (!shouldShowVideo && threeViewerRef.current) {
      console.log('🎬 Starting 3D animation');
      threeViewerRef.current.startModel1AnimationsFromCardSelection();
    }
  }, [cardSelected, modelLoaded, shouldShowVideo]);

  // Auto-slide after card selection
  useEffect(() => {
    if (!cardSelected || !modelLoaded || !onSlideToNextRef.current) {
      setShowClickableOverlay(false);
      return;
    }

    setShowClickableOverlay(true);
    const timer = setTimeout(() => onSlideToNextRef.current?.(), 7000);
    
    return () => {
      clearTimeout(timer);
      setShowClickableOverlay(false);
    };
  }, [cardSelected, modelLoaded]);

  // Fallback timer (both video and 3D model)
  useEffect(() => {
    if (modelLoaded) return;

    // วิดีโอ: 3 วินาที, โมเดล 3D: 5 วินาที
    const fallbackTime = shouldShowVideo ? 3000 : 5000;
    
    console.log(`⏳ Fallback timer started: ${fallbackTime}ms`, { shouldShowVideo });
    
    const timer = setTimeout(() => {
      console.log('⚠️ Fallback triggered - forcing modelLoaded=true');
      setModelLoaded(true);
      onModelLoaded?.();
    }, fallbackTime);

    return () => clearTimeout(timer);
  }, [modelLoaded, shouldShowVideo, onModelLoaded]);

  // Trigger 3D model movement
  useEffect(() => {
    if (!mounted || shouldShowVideo || (!showViewer && !isLoadingModel)) return;

    let attempts = 0;
    const maxAttempts = 10;
    
    const trigger = () => {
      if (threeViewerRef.current) {
        threeViewerRef.current.triggerModelMovement();
        onInit?.();
      } else if (attempts < maxAttempts) {
        attempts++;
        setTimeout(trigger, 200);
      }
    };

    setTimeout(trigger, 100);
  }, [mounted, showViewer, isLoadingModel, shouldShowVideo, onInit]);

  // Handle click to skip
  const handleClickToNext = useCallback(() => {
    if (showClickableOverlay) {
      setShowClickableOverlay(false);
      onSlideToNextRef.current?.();
    }
  }, [showClickableOverlay]);

  // Handle video error
  const handleVideoError = useCallback(() => {
    console.error('❌ Video loading error');
    setTimeout(() => {
      if (!modelLoaded) {
        console.log('⚠️ Setting modelLoaded after video error');
        handleContentLoaded();
      }
    }, 2000);
  }, [modelLoaded, handleContentLoaded]);

  // Memoized styles
  const styles = useMemo(() => ({
    viewer: {
      transform: showViewer ? 'translateY(0)' : 'translateY(-100%)',
      transition: 'transform 2s cubic-bezier(0.16, 1, 0.3, 1)',
      zIndex: 30
    }
  }), [showViewer]);

  if (!mounted) return null;

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Logo Section */}
      {modelLoaded && (
        <div className="absolute inset-0 bg-[#0A0A0A] z-10">
          <div className="h-full flex items-center justify-center">
            <div className="w-full px-4 sm:px-8 md:px-12 lg:px-16 xl:px-20">
              <div className="relative w-full max-w-[280px] xs:max-w-[320px] sm:max-w-[450px] md:max-w-[600px] lg:max-w-[750px] xl:max-w-[900px] 2xl:max-w-[1100px] 3xl:max-w-[1300px] aspect-[3/1] mx-auto -mt-32 sm:-mt-44 md:-mt-56 lg:-mt-64">
                <Image
                  src={logoSrc}
                  alt={logoAlt}
                  fill
                  className="object-contain drop-shadow-2xl"
                  sizes="(max-width: 640px) 320px, (max-width: 1024px) 600px, (max-width: 1536px) 900px, 1300px"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3D Model / Video Section */}
      {showViewer && (
        <div className="absolute inset-0 scroll-container" style={styles.viewer}>
          <div className="relative w-full h-full">
            {shouldShowVideo ? (
              <div className="absolute bottom-5 left-0 right-0 w-full">
                <video
                  ref={videoRef}
                  src="/videos/Safarionly.webm"
                  className="w-full h-auto object-cover"
                  playsInline
                  muted
                  preload="auto"
                  onCanPlayThrough={handleContentLoaded}
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
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#0A0A0A] to-transparent pointer-events-none" />
          </div>
        </div>
      )}

      {/* Loading Spinner */}
      {!modelLoaded && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0A0A]">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-2 border-[#b88c41] opacity-30" />
            <div className="absolute inset-0 w-16 h-16 rounded-full border-t-2 border-l-2 border-[#b88c41] animate-spin" />
            <div className="absolute top-4 left-4 w-8 h-8 rounded-full bg-[#0A0A0A] flex items-center justify-center">
              <span className="text-[#b88c41] text-xl">♪</span>
            </div>
          </div>
        </div>
      )}

      {/* Top Gradient Overlay */}
      <div 
        className="absolute top-0 left-0 right-0 h-[30vh] bg-gradient-to-b from-[#0A0A0A] to-transparent pointer-events-none z-40"
        style={{ 
          opacity: showViewer ? 0 : 1,
          transition: 'opacity 0.8s ease-in-out'
        }}
      />

      {/* Clickable Overlay */}
      {showClickableOverlay && (
        <button
          onClick={handleClickToNext}
          className="absolute inset-0 z-[60] bg-transparent cursor-pointer"
          aria-label="Click to continue"
        />
      )}
    </div>
  );
};

export default React.memo(HeroSection);
