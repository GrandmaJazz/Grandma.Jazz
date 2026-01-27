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

// Video Cache Manager (คล้าย AssetsManager ของโมเดล)
class VideoCache {
  private static cache = new Map<string, HTMLVideoElement>();
  
  static get(src: string): HTMLVideoElement | null {
    return this.cache.get(src) || null;
  }
  
  static set(src: string, video: HTMLVideoElement): void {
    this.cache.set(src, video);
  }
  
  static preload(src: string): Promise<void> {
    if (this.cache.has(src)) return Promise.resolve();
    
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.src = src;
      
      const handleLoad = () => {
        this.cache.set(src, video);
        cleanup();
        resolve();
      };
      
      const cleanup = () => {
        video.removeEventListener('loadedmetadata', handleLoad);
        video.removeEventListener('error', handleLoad);
      };
      
      video.addEventListener('loadedmetadata', handleLoad);
      video.addEventListener('error', handleLoad);
    });
  }
}

// Constants
const AUTO_SLIDE_DELAY = 7000;
const OVERLAY_FADE_DELAY = 350;
const MODEL_FALLBACK_TIME = 5000;
const VIDEO_FULL_LOAD_TIMEOUT = 10000; // รอวิดีโอโหลดเสร็จสูงสุด 10 วินาที (ใช้สำหรับ fallback)

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
  const [videoFullyLoaded, setVideoFullyLoaded] = useState(false);
  const [showClickableOverlay, setShowClickableOverlay] = useState(false);
  const [shouldShowVideo, setShouldShowVideo] = useState(false);
  const [overlayOpacity, setOverlayOpacity] = useState(0);
  
  const threeViewerRef = useRef<ThreeViewerRef>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const onSlideToNextRef = useRef(onSlideToNext);

  // Update ref
  useEffect(() => { onSlideToNextRef.current = onSlideToNext; }, [onSlideToNext]);

  // Device detection & mount + Preload video
  useEffect(() => {
    setMounted(true);
    const updateDevice = () => {
      const shouldShow = detectVideoDevice();
      setShouldShowVideo(shouldShow);
      
      // Preload video ถ้าเป็นอุปกรณ์ที่ต้องแสดงวิดีโอ (เหมือน lazy loading ของโมเดล)
      if (shouldShow) {
        VideoCache.preload('/videos/Safarionly.webm');
      }
    };
    
    updateDevice();
    window.addEventListener('resize', updateDevice);
    return () => window.removeEventListener('resize', updateDevice);
  }, []);

  // Handle content loaded
  const handleContentLoaded = useCallback(() => {
    if (!modelLoaded) {
      setModelLoaded(true);
      // สำหรับ desktop (โมเดล 3D) ให้เรียก onModelLoaded ทันที
      if (!shouldShowVideo) {
        onModelLoaded?.();
      }
    }
  }, [modelLoaded, shouldShowVideo, onModelLoaded]);

  // Handle video fully loaded (วิดีโอโหลดเสร็จ 100%)
  const handleVideoFullyLoaded = useCallback(() => {
    console.log('Video fully loaded!');
    setVideoFullyLoaded(true);
    setModelLoaded(true);
    // เรียก onModelLoaded เมื่อวิดีโอโหลดเสร็จจริงๆ
    onModelLoaded?.();
  }, [onModelLoaded]);

  // Fallback timer
  useEffect(() => {
    if (!shouldShowVideo) {
      // Desktop: ใช้ fallback ปกติ
      const timer = setTimeout(handleContentLoaded, MODEL_FALLBACK_TIME);
      return () => clearTimeout(timer);
    } else {
      // Mobile/Video: รอให้วิดีโอโหลดเสร็จจริงๆ (สูงสุด 10 วินาที)
      const timer = setTimeout(() => {
        if (!videoFullyLoaded) {
          console.log('Video fallback triggered after', VIDEO_FULL_LOAD_TIMEOUT, 'ms');
          handleVideoFullyLoaded();
        }
      }, VIDEO_FULL_LOAD_TIMEOUT);
      return () => clearTimeout(timer);
    }
  }, [shouldShowVideo, videoFullyLoaded, handleContentLoaded, handleVideoFullyLoaded]);

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
  const handleVideoError = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    console.error('Video loading failed:', e);
    // แม้วิดีโอโหลดไม่สำเร็จ ก็ให้แสดงการ์ดได้
    handleVideoFullyLoaded();
  }, [handleVideoFullyLoaded]);

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
                  onCanPlayThrough={handleVideoFullyLoaded}
                  onError={handleVideoError}
                  crossOrigin="anonymous"
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
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0A0A0A]">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-2 border-[#b88c41] opacity-30" />
            <div className="absolute inset-0 w-16 h-16 rounded-full border-t-2 border-l-2 border-[#b88c41] animate-spin" />
            <div className="absolute top-4 left-4 w-8 h-8 rounded-full bg-[#0A0A0A] flex items-center justify-center">
              <span className="text-[#b88c41] text-xl">♪</span>
            </div>
          </div>
          {shouldShowVideo && (
            <p className="mt-4 text-[#b88c41] text-sm animate-pulse">
              กำลังโหลดวิดีโอ...
            </p>
          )}
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
