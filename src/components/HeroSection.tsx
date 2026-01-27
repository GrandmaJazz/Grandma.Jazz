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
      <div className="w-12 h-12 border-4 border-[#b88c41] border-t-transparent rounded-full animate-spin"></div>
    </div>
  )
});

const HeroSection: React.FC<HeroSectionProps> = ({ 
  showViewer, 
  onInit, 
  loading = false, 
  isLoadingModel = false,
  onModelLoaded,
  logoSrc = '/images/Grandma-Jazz-Logo.webp',
  logoAlt = 'Grandma Jazz Logo',
  onSlideToNext,
  cardSelected = false
}) => {
  const [mounted, setMounted] = useState(false);
  const [overlayOpacity, setOverlayOpacity] = useState(0);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [showClickableOverlay, setShowClickableOverlay] = useState(false);
  const [shouldShowVideo, setShouldShowVideo] = useState(false);
  
  const { currentMusic, isPlaying } = useMusicPlayer();
  
  const textSectionRef = useRef<HTMLDivElement>(null);
  const threeViewerRef = useRef<ThreeViewerRef>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const onSlideToNextRef = useRef(onSlideToNext);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setMounted(true);
      
      // ตรวจสอบว่าเป็น iPhone, iPad หรือ mobile
      const checkShouldShowVideo = () => {
        const userAgent = navigator.userAgent;
        
        // ตรวจจับ iPhone
        const isIPhone = /iPhone/.test(userAgent);
        
        // ตรวจจับ iPad (รวมทั้ง iPad ที่ใช้ iPadOS ที่อาจแสดงเป็น Mac)
        const isIPad = /iPad/.test(userAgent) || 
                       (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        
        // ตรวจจับ mobile ทั่วไป (Android มือถือ, etc.)
        const isMobileDevice = /Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent) && 
                               window.innerWidth < 768;
        
        // ถ้าเป็น iPhone, iPad หรือ mobile device -> แสดงวิดีโอ
        setShouldShowVideo(isIPhone || isIPad || isMobileDevice);
      };
      
      checkShouldShowVideo();
      window.addEventListener('resize', checkShouldShowVideo);
      
      return () => window.removeEventListener('resize', checkShouldShowVideo);
    }
  }, []);

  // อัปเดต ref เมื่อ onSlideToNext เปลี่ยน
  useEffect(() => {
    onSlideToNextRef.current = onSlideToNext;
  }, [onSlideToNext]);

  useEffect(() => {
    if (cardSelected && modelLoaded) {
      if (!shouldShowVideo && threeViewerRef.current) {
        // แสดงโมเดล 3D - เริ่มแอนิเมชั่น
        threeViewerRef.current.startModel1AnimationsFromCardSelection();
      } else if (shouldShowVideo && videoRef.current) {
        // แสดงวิดีโอ (iPhone, iPad, mobile) - เริ่มเล่นวิดีโอ
        videoRef.current.play().catch((error) => {
          console.error('Error playing video:', error);
        });
      }
    }
  }, [cardSelected, modelLoaded, shouldShowVideo]);

  // สไลด์อัตโนมัติหลังเลือกการ์ด 8 วินาที (หรือกดหน้าจอข้ามได้)
  useEffect(() => {
    if (cardSelected && modelLoaded && onSlideToNextRef.current) {
      
      // แสดง overlay ที่กดได้
      setShowClickableOverlay(true);
      
      // สไลด์หลัง 7 วินาที
      const autoSlideTimer = setTimeout(() => {
        if (onSlideToNextRef.current) {
          onSlideToNextRef.current();
        }
      }, 700000);

      return () => {
        clearTimeout(autoSlideTimer);
        setShowClickableOverlay(false);
      };
    } else {
      setShowClickableOverlay(false);
    }
  }, [cardSelected, modelLoaded]);

  // ฟังก์ชันสำหรับกดข้ามไปทันที
  const handleClickToNext = useCallback(() => {
    if (showClickableOverlay && onSlideToNextRef.current) {
      setShowClickableOverlay(false);
      onSlideToNextRef.current();
    }
  }, [showClickableOverlay]); // ไม่มี onSlideToNext ใน dependencies!
  
  useEffect(() => {
    if (showViewer) {
      setOverlayOpacity(1);
      
      const timer = setTimeout(() => {
        setOverlayOpacity(0);
      }, 350);
      
      return () => clearTimeout(timer);
    } else {
      setOverlayOpacity(0);
    }
  }, [showViewer]);
  
  const handleModelLoaded = useCallback(() => {
    setModelLoaded(true);
    
    if (onModelLoaded) {
      onModelLoaded();
    }
  }, [onModelLoaded]);

  // สำหรับอุปกรณ์ที่แสดงวิดีโอ: ตั้งค่า modelLoaded เป็น true เมื่อวิดีโอโหลดเสร็จ
  const handleVideoLoaded = useCallback(() => {
    if (shouldShowVideo && !modelLoaded) {
      setModelLoaded(true);
      if (onModelLoaded) {
        onModelLoaded();
      }
    }
  }, [shouldShowVideo, modelLoaded, onModelLoaded]);

  // Fallback timer - ลดจาก 10s เป็น 5s (เร็วขึ้น 50%)
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      if (!modelLoaded) {
        setModelLoaded(true);
      }
    }, 5000); // ลดจาก 10000ms เป็น 5000ms

    return () => clearTimeout(fallbackTimer);
  }, [modelLoaded]);

  const triggerModelMovement = useCallback(() => {
    if (threeViewerRef.current) {
      threeViewerRef.current.triggerModelMovement();
    }
    
    if (onInit) onInit();
  }, [onInit]);
  
  // รวม useEffect triggers เป็นตัวเดียว - ลดความซ้ำซ้อน (เร็วขึ้น!)
  useEffect(() => {
    if (!mounted || shouldShowVideo) return; // ไม่ต้อง trigger model ถ้าแสดงวิดีโอ

    let attempts = 0;
    const maxAttempts = 10;
    
    const tryTriggerModel = () => {
      attempts++;
      
      if (threeViewerRef.current) {
        threeViewerRef.current.triggerModelMovement();
      } else if (attempts < maxAttempts) {
        setTimeout(tryTriggerModel, 200);
      }
    };

    // เริ่ม trigger เมื่อ showViewer หรือ isLoadingModel เป็น true (เฉพาะตอนแสดงโมเดล 3D)
    if (showViewer || isLoadingModel) {
      setTimeout(tryTriggerModel, 100);
    }

  }, [mounted, showViewer, isLoadingModel, shouldShowVideo]);

  // Transform animation - ลดจาก 5s เป็น 2s (เร็วขึ้น 60%)
  const viewer3dStyle = useMemo(() => ({
    transform: showViewer ? 'translateY(0)' : 'translateY(-100%)',
    transition: 'transform 2s cubic-bezier(0.16, 1, 0.3, 1)', // ลดจาก 5s
    height: showViewer ? 'auto' : '0',
    zIndex: 30,
    top: 0,
    left: 0,
    right: 0,
    touchAction: 'auto' as const,
    overflow: 'auto' as const
  }), [showViewer]);
  
  const textSectionStyle = useMemo(() => ({
    transform: 'translateY(0)',
    transition: 'transform 2s cubic-bezier(0.16, 1, 0.3, 1)', // ลดจาก 5s
    height: 'auto',
    zIndex: 10,
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0A0A0A'
  }), []);
  
  const imageContainerStyle = useMemo(() => ({
    transform: 'translateY(0px)',
    opacity: 1
  }), []);
  
  const overlayStyle = useMemo(() => ({
    opacity: overlayOpacity,
    transition: 'opacity 0.8s ease-in-out',
    height: '30vh',
  }), [overlayOpacity]);

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {modelLoaded && (
        <div 
          ref={textSectionRef}
          className="absolute inset-0 w-full h-full overflow-hidden bg-[#0A0A0A]"
          style={{ zIndex: 10 }}
        >
          <div className="hello-container h-[100vh] flex flex-col items-center justify-center w-full relative">
            <div 
              className="w-full px-[15px] xs:px-[20px] sm:px-[30px] md:px-[40px] lg:px-[50px] xl:px-[60px] 2xl:px-[80px] 3xl:px-[100px] 4xl:px-[120px] flex items-center justify-center"
              style={imageContainerStyle}
            >
              <div className="relative w-full 
                max-w-[280px] 
                xs:max-w-[320px] 
                sm:max-w-[450px] 
                md:max-w-[600px] 
                lg:max-w-[750px] 
                xl:max-w-[900px] 
                2xl:max-w-[1100px] 
                3xl:max-w-[1300px] 
                4xl:max-w-[1500px] 
                5xl:max-w-[1700px]
                aspect-[3/1] 
                mt-[-120px] 
                xs:mt-[-140px] 
                sm:mt-[-180px] 
                md:mt-[-250px] 
                lg:mt-[-280px] 
                xl:mt-[-300px] 
                2xl:mt-[-350px] 
                3xl:mt-[-400px] 
                4xl:mt-[-450px] 
                5xl:mt-[-500px]">
                <Image
                  src={logoSrc}
                  alt={logoAlt}
                  fill
                  className="object-contain drop-shadow-2xl"
                  sizes="(max-width: 475px) 280px, 
                         (max-width: 640px) 320px, 
                         (max-width: 768px) 450px, 
                         (max-width: 1024px) 600px, 
                         (max-width: 1280px) 750px, 
                         (max-width: 1536px) 900px, 
                         (max-width: 1920px) 1100px, 
                         (max-width: 2560px) 1300px, 
                         (max-width: 3200px) 1500px, 
                         1700px"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {mounted && showViewer && (
        <div 
          className="absolute inset-0 w-full h-full scroll-container"
          style={{ 
            ...viewer3dStyle, 
            zIndex: 30,
            opacity: 1,
            pointerEvents: 'auto'
          }}
        >
          {/* ลบ AnimatedSection wrapper - ประหยัด 0.8s! */}
          <div className="relative w-full h-full">
            {shouldShowVideo ? (
              // แสดงวิดีโอสำหรับ iPhone, iPad และ mobile - วางไว้ด้านล่าง
              <div className="absolute bottom-[20px] left-0 right-0 w-full">
                <video
                  ref={videoRef}
                  src="/videos/Safarionly.webm"
                  className="w-full h-auto object-cover"
                  playsInline
                  muted
                  loop={false}
                  preload="auto"
                  onLoadedData={handleVideoLoaded}
                  onCanPlay={handleVideoLoaded}
                />
              </div>
            ) : (
              // แสดง 3D model สำหรับ desktop และ tablet อื่นๆ
              <ThreeViewer 
                ref={threeViewerRef}
                height="h-[100vh]" 
                className="bg-transparent"
                onModelLoaded={handleModelLoaded}
              />
            )}
            
            <div className="absolute bottom-0 left-0 right-0 h-[100px] bg-gradient-to-t from-[#0A0A0A] to-transparent pointer-events-none" />
          </div>
        </div>
      )}

      {!modelLoaded && (
        <div className="fixed inset-0 w-full h-screen z-[100] flex items-center justify-center bg-[#0A0A0A]">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-2 border-[#b88c41] opacity-30"></div>
            <div className="absolute top-0 left-0 w-16 h-16 rounded-full border-t-2 border-l-2 border-[#b88c41] animate-spin"></div>
            <div className="absolute top-4 left-4 w-8 h-8 rounded-full bg-[#0A0A0A] flex items-center justify-center">
              <span className="text-[#b88c41] text-xl">♪</span>
            </div>
          </div>
        </div>
      )}

      <div 
        className="absolute inset-0 pointer-events-none z-40 bg-gradient-to-b from-[#0A0A0A] to-transparent"
        style={overlayStyle}
      />

      {/* Clickable Overlay - กดที่ไหนก็ได้เพื่อข้าม */}
      {showClickableOverlay && onSlideToNext && (
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