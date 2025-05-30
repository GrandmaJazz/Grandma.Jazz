// frontend/src/components/HeroSection.tsx
'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { AnimatedSection } from '@/components/AnimatedSection';

// สร้าง interface สำหรับ ref ของ ThreeViewer
interface ThreeViewerRef {
  triggerModelMovement: () => void;
}

// สร้าง interface สำหรับ props ของ HeroSection
interface HeroSectionProps {
  showViewer: boolean;
  onInit?: () => void;
  loading?: boolean;
  isLoadingModel?: boolean;
  onModelLoaded?: () => void;
  logoSrc?: string; // เพิ่ม prop สำหรับ path ของรูปภาพ
  logoAlt?: string; // เพิ่ม prop สำหรับ alt text
}

// Dynamic import สำหรับ ThreeViewer - ตั้งค่า loading ให้เรียบง่าย
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
  logoSrc = '/images/Grandma-Jazz-Logo.webp', // default path
  logoAlt = 'Grandma Jazz Logo'
}) => {
  const [mounted, setMounted] = useState(false);
  const [overlayOpacity, setOverlayOpacity] = useState(0);
  const [textOffset, setTextOffset] = useState(0);
  const [textOpacity, setTextOpacity] = useState(1);
  const [modelLoaded, setModelLoaded] = useState(false);
  
  // สร้าง ref สำหรับ section ที่มีข้อความ
  const textSectionRef = useRef<HTMLDivElement>(null);
  // ระบุ type ให้กับ ref
  const threeViewerRef = useRef<ThreeViewerRef>(null);
  
  // Effect สำหรับการจัดการ client-side mounting
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setMounted(true);
    }
  }, []);
  
  // Effect สำหรับจัดการ overlay เมื่อ showViewer เปลี่ยน
  useEffect(() => {
    if (showViewer) {
      // เริ่มแสดง overlay ก่อนอนิเมชันสไลด์
      setOverlayOpacity(1);
      
      // ค่อยๆ ลด opacity ของ overlay หลังจากการสไลด์เริ่มต้น
      const timer = setTimeout(() => {
        setOverlayOpacity(0);
      }, 350);
      
      return () => clearTimeout(timer);
    } else {
      setOverlayOpacity(0);
    }
  }, [showViewer]);
  
  // Effect สำหรับจัดการ parallax scroll และการเฟดข้อความ
  useEffect(() => {
    if (!showViewer) return;
    
    // ใช้ throttle function เพื่อลดจำนวนการ update
    const throttle = (func: Function, limit: number) => {
      let inThrottle: boolean = false;
      return function(this: any) {
        if (!inThrottle) {
          func.apply(this, arguments);
          inThrottle = true;
          setTimeout(() => inThrottle = false, limit);
        }
      };
    };
    
    const handleScroll = throttle(() => {
      if (!textSectionRef.current) return;
      
      const parallaxSpeed = 0.5;
      const scrollY = window.scrollY;
      const maxParallaxDistance = 200;
      
      // คำนวณค่า offset และ opacity ใหม่
      const newOffset = Math.min(scrollY * parallaxSpeed, maxParallaxDistance);
      
      // ใช้ requestAnimationFrame เพื่อเพิ่มประสิทธิภาพ
      requestAnimationFrame(() => {
        setTextOffset(newOffset);
        
        // คำนวณความโปร่งใสของข้อความตามการเลื่อน
        const startFade = 100;
        const endFade = 400;
        
        if (scrollY <= startFade) {
          setTextOpacity(1);
        } else if (scrollY >= endFade) {
          setTextOpacity(0);
        } else {
          const fadeProgress = (scrollY - startFade) / (endFade - startFade);
          setTextOpacity(1 - fadeProgress);
        }
      });
    }, 16); // ประมาณ 60fps
    
    // ใช้ passive event listener เพื่อเพิ่มประสิทธิภาพ
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [showViewer]);
  
  // ฟังก์ชันจะถูกเรียกเมื่อโมเดลโหลดเสร็จ
  const handleModelLoaded = useCallback(() => {
    console.log("โมเดลโหลดเสร็จแล้ว");
    setModelLoaded(true);
    
    // เรียก callback ไปยัง parent component
    if (onModelLoaded) {
      onModelLoaded();
    }
  }, [onModelLoaded]);

  // ฟังก์ชันเพื่อให้ parent component เรียกใช้ triggerModelMovement
  const triggerModelMovement = useCallback(() => {
    if (threeViewerRef.current) {
      threeViewerRef.current.triggerModelMovement();
    }
    
    // เรียกใช้ callback onInit ถ้ามี
    if (onInit) onInit();
  }, [onInit]);
  
  // เริ่มโหลดโมเดลเมื่อ isLoadingModel เปลี่ยนเป็น true
  useEffect(() => {
    if (isLoadingModel && threeViewerRef.current) {
      console.log("เริ่มโหลดโมเดลจาก HeroSection");
      threeViewerRef.current.triggerModelMovement();
    }
  }, [isLoadingModel]);
  
  // เรียกใช้ triggerModelMovement เมื่อ showViewer เปลี่ยนจาก false เป็น true
  useEffect(() => {
    if (showViewer) {
      // ถ้ากดเลือกการ์ดและโมเดลโหลดไว้แล้ว จะไม่ต้องเรียก triggerModelMovement อีก
      if (threeViewerRef.current) {
        triggerModelMovement();
      }
    }
  }, [showViewer, triggerModelMovement]);

  // ใช้ useMemo สำหรับ style objects ที่จะใช้ซ้ำๆ
  const viewer3dStyle = useMemo(() => ({
    transform: showViewer && modelLoaded ? 'translateY(0)' : 'translateY(-100%)', 
    transition: 'transform 5s cubic-bezier(0.16, 1, 0.3, 1)', 
    height: showViewer && modelLoaded ? 'auto' : '0',
    zIndex: 30,
    top: 0,
    left: 0,
    right: 0,
    touchAction: 'auto' as const,
    overflow: 'auto' as const
  }), [showViewer, modelLoaded]);
  
  const textSectionStyle = useMemo(() => ({
    transform: showViewer && modelLoaded ? 'translateY(0)' : 'translateY(-100%)', 
    transition: 'transform 5s cubic-bezier(0.16, 1, 0.3, 1)',
    height: showViewer && modelLoaded ? 'auto' : '0',
    zIndex: 20,
    position: 'absolute' as const,
    backgroundColor: '#0A0A0A'
  }), [showViewer, modelLoaded]);
  
  // Style สำหรับกรอบรูปภาพใหม่
  const imageContainerStyle = useMemo(() => ({
    transform: `translateY(${textOffset}px)`,
    transition: 'transform 0.1s ease-out, opacity 0.2s ease-out',
    opacity: textOpacity
  }), [textOffset, textOpacity]);
  
  const overlayStyle = useMemo(() => ({
    opacity: overlayOpacity,
    transition: 'opacity 0.8s ease-in-out',
    height: '30vh',
  }), [overlayOpacity]);

  return (
    <>
      {/* Loading Indicator - แสดงเมื่อกำลังโหลดโมเดล */}
      {showViewer && !modelLoaded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0A0A]">
          <div className="w-20 h-20 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {/* Transition Overlay */}
      <div 
        className="absolute inset-0 pointer-events-none z-40 bg-gradient-to-b from-[#0A0A0A] to-transparent"
        style={overlayStyle}
      />

      {/* 3D Viewer Section */}
      <div 
        className="relative w-full scroll-container"
        style={viewer3dStyle}
      >
        <AnimatedSection animation="fadeIn" duration={0.8} className="relative w-full">
          {mounted && (
            <div className="relative w-full">
              {/* 3D Viewer */}
              <ThreeViewer 
                ref={threeViewerRef}
                height="h-[100vh]" 
                className="bg-transparent"
                onModelLoaded={handleModelLoaded}
              />
              
              {/* เพิ่มเงาที่ด้านล่างของ 3D Viewer */}
              <div className="absolute bottom-0 left-0 right-0 h-[300px] bg-gradient-to-t from-[#0A0A0A] to-transparent pointer-events-none" />
            </div>
          )}
        </AnimatedSection>
      </div>
      
      {/* คอนเทนเนอร์ที่มีพื้นหลังสีดำและรูปภาพโลโก้ */}
      <div 
        ref={textSectionRef}
        className="relative w-full overflow-hidden"
        style={textSectionStyle}
      >
        <div className="hello-container h-[100vh] flex flex-col items-center justify-center w-full relative">
          {/* รูปภาพโลโก้แบบไม่มีกรอบ - รองรับทุกขนาดหน้าจอ */}
          <div 
            className="w-full px-[15px] xs:px-[20px] sm:px-[30px] md:px-[40px] lg:px-[50px] xl:px-[60px] 2xl:px-[80px] 3xl:px-[100px] 4xl:px-[120px] flex items-center justify-center"
            style={imageContainerStyle}
          >
            {/* รูปภาพโลโก้ */}
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
    </>
  );
};

export default React.memo(HeroSection);