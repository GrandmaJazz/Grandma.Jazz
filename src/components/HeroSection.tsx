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

// Helper: ตรวจจับ iOS/iPad/Mobile devices
const detectVideoDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const ua = navigator.userAgent;
  const isIPhone = /iPhone/.test(ua);
  const isIPad = /iPad/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isMobile = /Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua) && window.innerWidth < 768;
  
  return isIPhone || isIPad || isMobile;
};

// Constants
const AUTO_SLIDE_DELAY = 7000;
const OVERLAY_FADE_DELAY = 350;
const VIDEO_FALLBACK_TIME = 2000;
const MODEL_FALLBACK_TIME = 5000;

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
  const [shouldShowVideo, setShouldShowVideo] = useState(false);
  const [overlayOpacity, setOverlayOpacity] = useState(0);
  
  const threeViewerRef = useRef<ThreeViewerRef>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const onSlideToNextRef = useRef(onSlideToNext);

  // Update ref
  useEffect(() => { onSlideToNextRef.current = onSlideToNext; }, [onSlideToNext]);

  // Device detection & mount
  useEffect(() => {
    setMounted(true);
    const updateDevice = () => setShouldShowVideo(detectVideoDevice());
    updateDevice();
    window.addEventListener('resize', updateDevice);
    return () => window.removeEventListener('resize', updateDevice);
  }, []);

  // Handle content loaded
  const handleContentLoaded = useCallback(() => {
    if (!modelLoaded) {
      setModelLoaded(true);
      onModelLoaded?.();
    }
  }, [modelLoaded, onModelLoaded]);

  // Fallback timer
  useEffect(() => {
    const timer = setTimeout(handleContentLoaded, shouldShowVideo ? VIDEO_FALLBACK_TIME : MODEL_FALLBACK_TIME);
    return () => clearTimeout(timer);
  }, [shouldShowVideo, handleContentLoaded]);

  // Handle card selection animation
  useEffect(() => {
    if (!cardSelected || !modelLoaded) return;

    if (!shouldShowVideo && threeViewerRef.current) {
      threeViewerRef.current.startModel1AnimationsFromCardSelection();
    } else if (shouldShowVideo && videoRef.current) {
      videoRef.current.play().catch(console.error);
    }
  }, [cardSelected, modelLoaded, shouldShowVideo]);

  // Auto-slide after card selection
  useEffect(() => {
    if (!cardSelected || !modelLoaded || !onSlideToNextRef.current) {
      setShowClickableOverlay(false);
      return;
    }

    setShowClickableOverlay(true);
    const timer = setTimeout(() => onSlideToNextRef.current?.(), AUTO_SLIDE_DELAY);
    
    return () => {
      clearTimeout(timer);
      setShowClickableOverlay(false);
    };
  }, [cardSelected, modelLoaded]);

  // Overlay fade
  useEffect(() => {
    if (!showViewer) {
      setOverlayOpacity(0);
      return;
    }
    
    setOverlayOpacity(1);
    const timer = setTimeout(() => setOverlayOpacity(0), OVERLAY_FADE_DELAY);
    return () => clearTimeout(timer);
  }, [showViewer]);

  // Trigger 3D model (desktop only)
  useEffect(() => {
    if (!mounted || shouldShowVideo || !showViewer) return;

    let attempts = 0;
    const tryTrigger = () => {
      if (threeViewerRef.current) {
        threeViewerRef.current.triggerModelMovement();
        onInit?.();
      } else if (++attempts < 10) {
        setTimeout(tryTrigger, 200);
      }
    };
    
    setTimeout(tryTrigger, 100);
  }, [mounted, shouldShowVideo, showViewer, onInit]);

  // Handle click to skip
  const handleClickToNext = useCallback(() => {
    if (showClickableOverlay && onSlideToNextRef.current) {
      setShowClickableOverlay(false);
      onSlideToNextRef.current();
    }
  }, [showClickableOverlay]);

  // Video error handler
  const handleVideoError = useCallback(() => {
    console.error('Video loading failed');
    handleContentLoaded();
  }, [handleContentLoaded]);

  // Styles
  const viewer3dStyle = useMemo(() => ({
    transform: showViewer ? 'translateY(0)' : 'translateY(-100%)',
    transition: 'transform 2s cubic-bezier(0.16, 1, 0.3, 1)',
    zIndex: 30,
    opacity: 1,
  }), [showViewer]);

  if (!mounted) return null;

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Logo Section */}
      {modelLoaded && (
        <div className="absolute inset-0 z-10 overflow-hidden bg-[#0A0A0A]">
          <div className="h-full flex items-center justify-center">
            <div className="w-full px-4 sm:px-8 md:px-12 lg:px-16 xl:px-20 flex justify-center">
              <div className="relative w-full max-w-[280px] xs:max-w-[320px] sm:max-w-[450px] md:max-w-[600px] lg:max-w-[750px] xl:max-w-[900px] 2xl:max-w-[1100px] aspect-[3/1] -mt-[120px] xs:-mt-[140px] sm:-mt-[180px] md:-mt-[250px] lg:-mt-[280px] xl:-mt-[300px] 2xl:-mt-[350px]">
                <Image
                  src={logoSrc}
                  alt={logoAlt}
                  fill
                  className="object-contain drop-shadow-2xl"
                  sizes="(max-width: 475px) 280px, (max-width: 640px) 320px, (max-width: 768px) 450px, (max-width: 1024px) 600px, (max-width: 1280px) 750px, (max-width: 1536px) 900px, (max-width: 1920px) 1100px, 1700px"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3D Viewer / Video Section */}
      {showViewer && (
        <div className="absolute inset-0 scroll-container" style={viewer3dStyle}>
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
                  onLoadedMetadata={handleContentLoaded}
                  onCanPlay={handleContentLoaded}
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
            <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-[#0A0A0A] to-transparent pointer-events-none" />
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

      {/* Top Overlay Fade */}
      <div 
        className="absolute inset-x-0 top-0 h-[30vh] pointer-events-none z-40 bg-gradient-to-b from-[#0A0A0A] to-transparent transition-opacity duration-800"
        style={{ opacity: overlayOpacity }}
      />

      {/* Click to Continue Overlay */}
      {showClickableOverlay && (
        <button
          onClick={handleClickToNext}
          className="absolute inset-0 z-[60] bg-transparent cursor-pointer"
          aria-label="Click anywhere to continue"
        />
      )}
    </div>
  );
};

export default React.memo(HeroSection);
