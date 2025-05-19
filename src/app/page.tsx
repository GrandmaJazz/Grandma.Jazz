'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import ProductStory from '@/components/ProductStory';
import Contact from '@/components/Contact';
import Review from '@/components/Review';
import HeroSection from '@/components/HeroSection';

// ใช้ dynamic import เพื่อลดขนาด bundle หลัก
const CDCardCarousel = dynamic(() => import('@/components/CDCardCarousel'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
    </div>
  )
});
const EventBooking = dynamic(() => import('@/components/evenbooking'));
const Featured = dynamic(() => import('@/components/Featured'));

// แยก CSS ที่ใช้กับทั้งหน้าออกมาเพื่อลด layout thrashing
const globalStyles = {
  noiseOverlay: {
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'repeat',
    backgroundSize: '150px 150px'
  }
};

export default function Home() {
  // รวม state ที่เกี่ยวข้องกับไว้ด้วยกันเพื่อลด re-render
  const [uiState, setUiState] = useState({
    showCarousel: false,
    showViewer: false,
    isInteractionLocked: false,
    showScrollHint: false,
    hasScrolled: false
  });
  
  // แยก state ที่เกี่ยวกับการโหลดโมเดล
  const [modelState, setModelState] = useState({
    loading: false,
    isLoadingModel: false,
    isModelLoaded: false
  });

  // ใช้ useCallback สำหรับฟังก์ชันที่ส่งไปยัง child components
  const handleCardSelection = useCallback(() => {
    setUiState(prev => ({
      ...prev,
      showCarousel: false,
      showViewer: true,
      isInteractionLocked: true,
      hasScrolled: false
    }));
    
    // ใช้ setTimeout เดียวแทนการเรียกหลายครั้ง
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, []);
  
  const handleStartLoading = useCallback(() => {
    console.log("เริ่มโหลดโมเดลเมื่อกดการ์ด");
    setModelState(prev => ({
      ...prev,
      isLoadingModel: true
    }));
  }, []);

  const handleModelLoaded = useCallback(() => {
    console.log("โมเดลโหลดเสร็จแล้ว");
    setModelState(prev => ({
      ...prev,
      isModelLoaded: true
    }));
  }, []);

  const handleHeroInit = useCallback(() => {
    setModelState(prev => ({
      ...prev,
      loading: true
    }));
    console.log("Hero section initializing");
  }, []);

  // แสดง carousel เมื่อโหลดหน้าเสร็จ
  useEffect(() => {
    const timer = setTimeout(() => {
      setUiState(prev => ({
        ...prev,
        showCarousel: true
      }));
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // จัดการ scroll บน body
  useEffect(() => {
    const { showCarousel, isInteractionLocked } = uiState;
    
    if (showCarousel || isInteractionLocked) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }

    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [uiState.showCarousel, uiState.isInteractionLocked]);
  
  // จัดการการแสดงคำแนะนำให้เลื่อน
  useEffect(() => {
    if (!uiState.isInteractionLocked) return;
    
    const hintTimer = setTimeout(() => {
      setUiState(prev => ({
        ...prev,
        showScrollHint: true,
        isInteractionLocked: false // ปลดล็อคการปฏิสัมพันธ์
      }));
    }, 3000);
    
    return () => clearTimeout(hintTimer);
  }, [uiState.isInteractionLocked]);
  
  // ติดตามการเลื่อนและซ่อนคำแนะนำ
  useEffect(() => {
    if (!uiState.showScrollHint) return;
    
    const handleScroll = () => {
      setUiState(prev => ({
        ...prev,
        hasScrolled: true,
        showScrollHint: false
      }));
    };
    
    // ใช้ passive event listener เพื่อเพิ่มประสิทธิภาพ
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, [uiState.showScrollHint]);

  // แยก element ที่ใช้เงื่อนไขเดียวกันเพื่อลดการคำนวณซ้ำ
  const scrollHintElement = useMemo(() => {
    if (!(uiState.showScrollHint && !uiState.hasScrolled)) return null;
    
    return (
      <div 
        className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[100] flex flex-col items-center xl:hidden"
        style={{
          animation: 'fadeInOut 4s ease-in-out forwards',
        }}
      >
        <div className="w-40 h-56 mb-6 relative">
          <div 
            className="absolute top-0 left-0 w-full h-full flex justify-center"
            style={{
              animation: 'fingerMove 3s ease-in-out infinite',
            }}
          >
            <svg width="100%" height="100%" viewBox="0 0 160 280" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle 
                cx="80" 
                cy="240" 
                r="35" 
                fill="#FFFFFF" 
                fillOpacity="0.3"
              />
              <circle 
                cx="80" 
                cy="240" 
                r="25" 
                fill="#FFFFFF" 
                fillOpacity="0.5"
              />
              <circle 
                cx="80" 
                cy="240" 
                r="15" 
                fill="#FFFFFF" 
                style={{
                  animation: 'touchDown 3s ease-in-out infinite',
                }}
              />
            </svg>
          </div>
          
          <svg width="100%" height="100%" viewBox="0 0 160 280" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute top-0 left-0 z-[-1]">
            <path 
              d="M80,240 L80,40" 
              stroke="#FFFFFF" 
              strokeWidth="4" 
              strokeDasharray="10 6" 
              strokeOpacity="0.5"
            />
          </svg>
        </div>
        
        <p className="text-white font-bold text-center text-2xl">
          Scroll to Explore
        </p>
      </div>
    );
  }, [uiState.showScrollHint, uiState.hasScrolled]);

  return (
    <div className="flex flex-col relative overflow-hidden bg-[#0A0A0A] text-[#F5F1E6]">
      {/* Noise overlay - ใช้ will-change เพื่อเพิ่มประสิทธิภาพ */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-20 mix-blend-overlay z-10"
        style={{
          ...globalStyles.noiseOverlay,
          willChange: 'opacity'
        }}
      />
      
      {/* Film grain effect - ใช้ transform แทน animation */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-30 mix-blend-multiply z-10"
        style={{
          willChange: 'transform'
        }}
      />

      {/* Carousel Modal - ลดการคำนวณเงื่อนไข */}
      {uiState.showCarousel && (
        <div 
          className="fixed inset-0 z-50 bg-[#0A0A0A] bg-opacity-80 backdrop-blur-sm flex items-center justify-center"
        >
          <div>
            <CDCardCarousel 
              onCardClick={handleCardSelection} 
              onStartLoading={handleStartLoading}
            />
          </div>
        </div>
      )}

      {/* Scroll Hint */}
      {scrollHintElement}
      
      {/* Interaction lock overlay */}
      {uiState.isInteractionLocked && (
        <div className="fixed inset-0 z-[90] bg-transparent cursor-not-allowed" />
      )}
      
      {/* HeroSection - ส่งเฉพาะ props ที่จำเป็น */}
      <HeroSection 
        showViewer={uiState.showViewer} 
        onInit={handleHeroInit}
        loading={modelState.loading}
        isLoadingModel={modelState.isLoadingModel}
        onModelLoaded={handleModelLoaded}
      />

      {/* ส่วนเนื้อหาอื่นๆ - ไม่มีการเปลี่ยนแปลง */}
      <ProductStory />
      <EventBooking />
      <Featured /> 
      <Review />
      <Contact/>
    </div>
  );
}