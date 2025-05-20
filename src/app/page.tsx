'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import ProductStory from '@/components/ProductStory';
import Contact from '@/components/Contact';
import Review from '@/components/Review';
import HeroSection from '@/components/HeroSection';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';

// นำเข้า interface หรือกำหนด interface
interface Music {
  _id: string;
  title: string;
  artist: string;
  filePath: string;
  duration: number;
}

interface Card {
  _id: string;
  title: string;
  description: string;
  imagePath: string;
  order: number;
  music: Music[];
}

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
    isInteractionLocked: false
  });
  
  // แยก state ที่เกี่ยวกับการโหลดโมเดล
  const [modelState, setModelState] = useState({
    loading: false,
    isLoadingModel: false,
    isModelLoaded: false
  });
  
  // ใช้ context สำหรับเล่นเพลง
  const { playCard, currentMusic } = useMusicPlayer();
  
  // เพิ่ม usePathname เพื่อตรวจสอบหน้าปัจจุบัน
  const pathname = usePathname();

  // เพิ่ม useEffect เพื่อเริ่มโหลดโมเดลทันทีหลังจากโหลดหน้าเว็บ
  useEffect(() => {
    // เริ่มโหลดโมเดลทันทีหลังจากโหลดหน้าเว็บ
    const timer = setTimeout(() => {
      console.log("เริ่มโหลดโมเดลอัตโนมัติหลังโหลดหน้าเว็บ");
      setModelState(prev => ({
        ...prev,
        isLoadingModel: true
      }));
      
      // ถ้ามีการเรียก setModelState เป็น isLoadingModel: true
      // HeroSection จะเริ่มโหลดโมเดลโดยอัตโนมัติ
    }, 300); // ใส่ delay เล็กน้อยเพื่อให้หน้าเว็บโหลดเสร็จก่อน

    return () => clearTimeout(timer);
  }, []); // เรียก effect นี้เพียงครั้งเดียวตอนโหลดหน้าเว็บ

  // เพิ่ม useEffect ใหม่สำหรับตรวจสอบเงื่อนไขการแสดงการ์ดอัตโนมัติ
  useEffect(() => {
    // ตรวจสอบว่าไม่ได้อยู่ที่หน้า /admin และยังไม่มีเพลงถูกเลือก
    const isNotAdminPage = pathname && !pathname.startsWith('/admin');
    const noMusicSelected = !currentMusic; // แก้ไขตรงนี้: ตรวจสอบเฉพาะว่ามีเพลงถูกเลือกหรือไม่ โดยไม่สนใจว่ากำลังเล่นหรือหยุดพัก
    
    // ถ้าไม่ได้อยู่ที่หน้า /admin และไม่มีเพลงถูกเลือก ให้แสดงการ์ดเพลงทันที
    if (isNotAdminPage && noMusicSelected) {
      // ใส่ delay เล็กน้อยเพื่อให้หน้าเว็บโหลดเสร็จก่อน
      const showCarouselTimer = setTimeout(() => {
        setUiState(prev => ({
          ...prev,
          showCarousel: true
        }));
      }, 600); // เพิ่ม delay ให้มากกว่าเดิมเล็กน้อยเพื่อให้ UI โหลดเสร็จก่อน
      
      return () => clearTimeout(showCarouselTimer);
    }
  }, [pathname, currentMusic]); // ตัด isPlaying ออกจาก dependencies

  // ใช้ useCallback สำหรับฟังก์ชันที่ส่งไปยัง child components
  const handleCardSelection = useCallback((card: Card) => {
    // เริ่มเล่นเพลงจากการ์ดที่เลือก
    playCard(card);
    
    setUiState(prev => ({
      ...prev,
      showCarousel: false,
      showViewer: true,
      isInteractionLocked: true
    }));
    
    // ใช้ setTimeout เดียวแทนการเรียกหลายครั้ง
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, [playCard]);
  
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
  
  // จัดการการปลดล็อคการปฏิสัมพันธ์หลังจากเลือกการ์ด
  useEffect(() => {
    if (!uiState.isInteractionLocked) return;
    
    const unlockTimer = setTimeout(() => {
      setUiState(prev => ({
        ...prev,
        isInteractionLocked: false
      }));
    }, 3000);
    
    return () => clearTimeout(unlockTimer);
  }, [uiState.isInteractionLocked]);

  return (
    <div className="flex flex-col relative overflow-hidden bg-[#0A0A0A] text-[#F5F1E6]">
      {/* ส่วน return ยังคงเหมือนเดิม */}
      {/* Noise overlay */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-20 mix-blend-overlay z-10"
        style={{
          ...globalStyles.noiseOverlay,
          willChange: 'opacity'
        }}
      />
      
      {/* Film grain effect */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-30 mix-blend-multiply z-10"
        style={{
          willChange: 'transform'
        }}
      />

      {/* Carousel Modal */}
      {uiState.showCarousel && (
        <div 
          className="fixed inset-0 z-50 bg-[#0A0A0A] bg-opacity-80 backdrop-blur-sm flex items-center justify-center"
        >
          <div>
            <CDCardCarousel 
              onCardClick={handleCardSelection} 
            />
          </div>
        </div>
      )}
      
      {/* Interaction lock overlay */}
      {uiState.isInteractionLocked && (
        <div className="fixed inset-0 z-[90] bg-transparent cursor-not-allowed" />
      )}
      
      {/* HeroSection */}
      <HeroSection 
        showViewer={uiState.showViewer} 
        onInit={handleHeroInit}
        loading={modelState.loading}
        isLoadingModel={modelState.isLoadingModel}
        onModelLoaded={handleModelLoaded}
      />

      {/* ส่วนเนื้อหาอื่นๆ */}
      <ProductStory />
      <EventBooking />
      <Featured /> 
      <Review />
      <Contact/>
    </div>
  );
}