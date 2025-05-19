'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
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

// สร้าง keyframes CSS - แยกออกมาเพื่อไม่ต้องสร้างใหม่ทุกครั้ง
const insertKeyframes = () => {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    @keyframes noise {
      0%, 100% { background-position: 0 0; }
      10% { background-position: -5% -10%; }
      20% { background-position: -15% 5%; }
      30% { background-position: 7% -25%; }
      40% { background-position: 20% 15%; }
      50% { background-position: -25% 10%; }
      60% { background-position: 15% 5%; }
      70% { background-position: 0% 15%; }
      80% { background-position: 25% 35%; }
      90% { background-position: -10% 10%; }
    }
  `;
  return style;
};

const HeroSection: React.FC<HeroSectionProps> = ({ 
  showViewer, 
  onInit, 
  loading = false, 
  isLoadingModel = false,
  onModelLoaded
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
  // ref สำหรับเก็บ keyframes style element
  const keyframesRef = useRef<HTMLStyleElement | null>(null);
  
  // ใช้ useMemo สำหรับ style ที่ไม่เปลี่ยนแปลงบ่อย
  const titleStyle = useMemo(() => ({
    background: 'linear-gradient(90deg, #C2A14D, #D4AF37, #C2A14D)',
    backgroundSize: '400% 100%',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    animation: 'shimmer 10s ease-in-out infinite',
    textShadow: '0 0 20px rgba(212, 175, 55, 0.3)',
    willChange: 'transform, opacity' // เพิ่ม will-change เพื่อเตรียม GPU ก่อน
  }), []);
  
  // Effect for animation keyframes - ใช้ ref เพื่อไม่ต้องสร้าง element ใหม่ทุกครั้ง
  useEffect(() => {
    if (!keyframesRef.current) {
      keyframesRef.current = insertKeyframes();
      document.head.appendChild(keyframesRef.current);
    }
    
    return () => {
      if (keyframesRef.current && document.head.contains(keyframesRef.current)) {
        document.head.removeChild(keyframesRef.current);
        keyframesRef.current = null;
      }
    };
  }, []);
  
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
      // ถ้ากดเลือกการ์ดและโมเดลโหลดไปแล้ว จะไม่ต้องเรียก triggerModelMovement อีก
      if (!isLoadingModel) {
        triggerModelMovement();
      }
    }
  }, [showViewer, isLoadingModel, triggerModelMovement]);

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
  
  const dynamicTitleStyle = useMemo(() => ({
    ...titleStyle,
    transform: `translateY(${textOffset}px)`,
    transition: 'transform 0.1s ease-out, opacity 0.2s ease-out',
    opacity: textOpacity
  }), [titleStyle, textOffset, textOpacity]);
  
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
      
      {/* คอนเทนเนอร์ที่มีพื้นหลังสีดำและข้อความ */}
      <div 
        ref={textSectionRef}
        className="relative w-full overflow-hidden"
        style={textSectionStyle}
      >
        <div className="hello-container h-[100vh] flex flex-col items-center justify-center w-full relative px-6">
          {/* Main title with shimmer effect and fade effect */}
          <h1 
            className="text-center w-full
              text-[65px]    /* มือถือ */
              sm:text-[120px]   /* Tablet เล็ก */
              md:text-[140px]    /* Tablet */
              lg:text-[160px]   /* Desktop เล็ก */
              xl:text-[180px]   /* Desktop ใหญ่ */
              2xl:text-[200px]   /* Desktop ใหญ่พิเศษ */
              tracking-widest
              font-bold
              mt-[-300px] sm:mt-[-300px] md:mt-[-400px] lg:mt-[-500px] xl:mt-[-400px] 2xl:mt-[-400px]"
            style={dynamicTitleStyle}
          >
            Grandma Jazz
          </h1>
        </div>
      </div>
    </>
  );
};

export default React.memo(HeroSection);