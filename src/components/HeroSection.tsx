'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { AnimatedSection } from '@/components/AnimatedSection';
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
      <div className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
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
  const [showSlideButton, setShowSlideButton] = useState(false);
  
  const { currentMusic, isPlaying } = useMusicPlayer();
  
  const textSectionRef = useRef<HTMLDivElement>(null);
  const threeViewerRef = useRef<ThreeViewerRef>(null);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setMounted(true);
    }
  }, []);

  useEffect(() => {
    if (cardSelected && modelLoaded && threeViewerRef.current) {
      console.log("HeroSection: เลือกการ์ดแล้ว เริ่มแอนิเมชั่นโมเดล 1");
      threeViewerRef.current.startModel1AnimationsFromCardSelection();
    }
  }, [cardSelected, modelLoaded]);

  useEffect(() => {
    if (cardSelected && modelLoaded) {
      const timer = setTimeout(() => {
        setShowSlideButton(true);
      }, 5000);

      return () => clearTimeout(timer);
    } else {
      setShowSlideButton(false);
    }
  }, [cardSelected, modelLoaded]);
  
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
    console.log("HeroSection: โมเดลโหลดเสร็จแล้ว");
    setModelLoaded(true);
    
    if (onModelLoaded) {
      console.log("HeroSection: เรียก onModelLoaded callback");
      onModelLoaded();
    }
  }, [onModelLoaded]);

  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      if (!modelLoaded) {
        console.log("HeroSection: Fallback - แสดงโมเดลโดยไม่รอโหลด");
        setModelLoaded(true);
      }
    }, 10000);

    return () => clearTimeout(fallbackTimer);
  }, [modelLoaded]);

  const triggerModelMovement = useCallback(() => {
    if (threeViewerRef.current) {
      threeViewerRef.current.triggerModelMovement();
    }
    
    if (onInit) onInit();
  }, [onInit]);
  
  useEffect(() => {
    if (isLoadingModel && threeViewerRef.current) {
      console.log("HeroSection: เริ่มโหลดโมเดลจาก isLoadingModel");
      threeViewerRef.current.triggerModelMovement();
    }
  }, [isLoadingModel]);
  
  useEffect(() => {
    if (showViewer && threeViewerRef.current) {
      console.log("HeroSection: เริ่มโหลดโมเดลจาก showViewer");
      threeViewerRef.current.triggerModelMovement();
    }
  }, [showViewer]);
  
  useEffect(() => {
    if (mounted && threeViewerRef.current && !modelLoaded) {
      console.log("HeroSection: เริ่มโหลดโมเดลเมื่อ component พร้อม");
      threeViewerRef.current.triggerModelMovement();
    }
  }, [mounted, modelLoaded]);

  useEffect(() => {
    const forceTimer = setTimeout(() => {
      if (!modelLoaded && threeViewerRef.current) {
        console.log("HeroSection: Force trigger การโหลดโมเดล");
        threeViewerRef.current.triggerModelMovement();
      }
    }, 2000);

    return () => clearTimeout(forceTimer);
  }, [modelLoaded]);

  const viewer3dStyle = useMemo(() => ({
    transform: showViewer ? 'translateY(0)' : 'translateY(-100%)',
    transition: 'transform 5s cubic-bezier(0.16, 1, 0.3, 1)', 
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
    transition: 'transform 5s cubic-bezier(0.16, 1, 0.3, 1)',
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

      <div 
        className="absolute inset-0 w-full h-full scroll-container"
        style={{ 
          ...viewer3dStyle, 
          zIndex: 30,
          opacity: 1,
          pointerEvents: 'auto'
        }}
      >
        <AnimatedSection animation="fadeIn" duration={0.8} className="relative w-full">
          {mounted && (
            <div className="relative w-full">
              <ThreeViewer 
                ref={threeViewerRef}
                height="h-[100vh]" 
                className="bg-transparent"
                onModelLoaded={handleModelLoaded}
              />
              
              <div className="absolute bottom-0 left-0 right-0 h-[300px] bg-gradient-to-t from-[#0A0A0A] to-transparent pointer-events-none" />
            </div>
          )}
        </AnimatedSection>
      </div>

      {!modelLoaded && (
        <div className="fixed inset-0 w-full h-screen z-[100] flex items-center justify-center bg-[#0A0A0A]">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-2 border-[#D4AF37] opacity-30"></div>
            <div className="absolute top-0 left-0 w-16 h-16 rounded-full border-t-2 border-l-2 border-[#D4AF37] animate-spin"></div>
            <div className="absolute top-4 left-4 w-8 h-8 rounded-full bg-[#0A0A0A] flex items-center justify-center">
              <span className="text-[#D4AF37] text-xl">♪</span>
            </div>
          </div>
        </div>
      )}

      <div 
        className="absolute inset-0 pointer-events-none z-40 bg-gradient-to-b from-[#0A0A0A] to-transparent"
        style={overlayStyle}
      />

      {showSlideButton && onSlideToNext && (
        <button
          onClick={onSlideToNext}
          className="absolute inset-0 z-[60] bg-transparent"
        />
      )}
    </div>
  );
};

export default React.memo(HeroSection);