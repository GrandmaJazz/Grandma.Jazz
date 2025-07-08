// frontend/src/app/page.tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
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

// Lazy load components ที่อยู่ด้านล่างของหน้า
const ProductStory = dynamic(() => import('@/components/ProductStory'), {
  loading: () => <div className="h-96 bg-[#0A0A0A]" />,
});

const EventBooking = dynamic(() => import('@/components/evenbooking'), {
  loading: () => <div className="h-96 bg-[#0A0A0A]" />,
});

const Featured = dynamic(() => import('@/components/Featured'), {
  loading: () => <div className="h-96 bg-[#0A0A0A]" />,
});

const Review = dynamic(() => import('@/components/Review'), {
  loading: () => <div className="h-96 bg-[#0A0A0A]" />,
});

const Contact = dynamic(() => import('@/components/Contact'), {
  loading: () => <div className="h-96 bg-[#0A0A0A]" />,
});

// แยก CSS ที่ใช้กับทั้งหน้าออกมาเพื่อลด layout thrashing
const globalStyles = {
  noiseOverlay: {
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'repeat',
    backgroundSize: '150px 150px'
  }
};

// สร้างตัวแปร global สำหรับ state
let globalShowHero = true;

export default function Home() {
  // State สำหรับควบคุมการแสดง HeroSection vs หน้าหลัก
  const [showHeroSection, setShowHeroSection] = useState(true);
  const [isSliding, setIsSliding] = useState(false);
  const [mounted, setMounted] = useState(false);
  
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
  
  // State สำหรับติดตามการเลือกการ์ด
  const [cardSelected, setCardSelected] = useState(false);
  
  // State สำหรับติดตามการโหลดข้อมูลจากแคช
  const [hasMusicInCache, setHasMusicInCache] = useState(false);
  
  // ใช้ context สำหรับเล่นเพลง
  const { selectCardTemporary, saveMusicCache, currentMusic } = useMusicPlayer();
  
  // เพิ่ม usePathname เพื่อตรวจสอบหน้าปัจจุบัน
  const pathname = usePathname();

  // ตรวจสอบ localStorage เมื่อ component mount
  useEffect(() => {
    setMounted(true);
    const heroHidden = localStorage.getItem('heroSectionHidden') === 'true';
    if (heroHidden) {
      setShowHeroSection(false);
    }
    
    // ตรวจสอบว่ามีเพลงในแคชหรือไม่
    const savedCard = localStorage.getItem('selectedMusicCard');
    const savedPlaylist = localStorage.getItem('currentPlaylist');
    const savedTrackIndex = localStorage.getItem('currentTrackIndex');
    
    if (savedCard && savedPlaylist && savedTrackIndex) {
      setHasMusicInCache(true);
      setCardSelected(true); // ตั้งค่าให้ถือว่าเลือกการ์ดแล้ว
      console.log("พบเพลงในแคช - ไม่ต้องแสดง carousel");
    }
  }, []);

  // ส่ง state ไปยัง parent (layout) เพื่อซ่อน Header
  useEffect(() => {
    if (!mounted) return; // รอจนกว่า component จะ mount เสร็จ
    
    globalShowHero = showHeroSection;
    // Trigger re-render ของ Header
    window.dispatchEvent(new CustomEvent('heroSectionChange', { detail: showHeroSection }));
  }, [showHeroSection, mounted]);

  // ฟัง event เมื่อแคชเพลงถูกล้าง
  useEffect(() => {
    const handleMusicCacheCleared = () => {
      console.log("ได้รับแจ้งว่าแคชเพลงถูกล้าง - รีเซ็ต state");
      setHasMusicInCache(false);
      setCardSelected(false);
    };

    window.addEventListener('musicCacheCleared', handleMusicCacheCleared);
    
    return () => {
      window.removeEventListener('musicCacheCleared', handleMusicCacheCleared);
    };
  }, []);

  // เพิ่ม useEffect เพื่อเริ่มโหลดโมเดลทันทีหลังจากโหลดหน้าเว็บ
  useEffect(() => {
    // เริ่มโหลดโมเดลทันทีหลังจากโหลดหน้าเว็บ (ไม่มีดีเลย์)
    if (process.env.NODE_ENV === 'development') {
      console.log("เริ่มโหลดโมเดลอัตโนมัติหลังโหลดหน้าเว็บ");
    }
    setModelState(prev => ({
      ...prev,
      isLoadingModel: true
    }));
  }, []);

  // เพิ่ม useEffect สำหรับเริ่มแสดงโมเดลทันทีใน HeroSection
  useEffect(() => {
    if (!showHeroSection) return;
    
    // แสดงโมเดลทันทีเมื่อเข้าหน้าเว็บ (ไม่มีดีเลย์)
    setUiState(prev => ({
      ...prev,
      showViewer: true
    }));
  }, [showHeroSection]);
  
  // เพิ่ม useEffect ใหม่สำหรับตรวจสอบเงื่อนไขการแสดงการ์ดอัตโนมัติ (เฉพาะเมื่อโมเดลโหลดเสร็จ)
  useEffect(() => {
    if (!showHeroSection) return; // ไม่แสดงการ์ดถ้าไม่ได้อยู่ใน HeroSection
    
    const isNotAdminPage = pathname && !pathname.startsWith('/admin');
    const noMusicSelected = !currentMusic;
    
    // ถ้ามีเพลงในแคชแล้ว ไม่ต้องแสดง carousel
    if (hasMusicInCache) {
      console.log("มีเพลงในแคชแล้ว - ไม่แสดง carousel");
      return;
    }
    
    // แสดงการ์ดทันทีเมื่อโมเดลโหลดเสร็จ (ไม่มีดีเลย์) และยังไม่มีเพลงในแคช
    if (isNotAdminPage && noMusicSelected && modelState.isModelLoaded && !hasMusicInCache) {
      console.log("แสดง carousel เพื่อเลือกเพลง");
      setUiState(prev => ({
        ...prev,
        showCarousel: true
      }));
    }
  }, [pathname, currentMusic, showHeroSection, modelState.isModelLoaded, hasMusicInCache]);

  // ฟังก์ชันสำหรับสไลด์ไปหน้าถัดไป
  const handleSlideToMainPage = useCallback(() => {
    // บันทึกแคชเพลงก่อนสไลด์
    saveMusicCache();
    setHasMusicInCache(true); // อัปเดต state ว่ามีเพลงในแคชแล้ว
    
    setIsSliding(true);
    
    // บันทึกสถานะใน localStorage
    localStorage.setItem('heroSectionHidden', 'true');
    
    // หลังจากเอฟเฟกต์สไลด์เสร็จ ให้ซ่อน HeroSection
    setTimeout(() => {
      setShowHeroSection(false);
      setIsSliding(false);
    }, 800); // ระยะเวลาการสไลด์ 1 วินาที
  }, [saveMusicCache]);

  // ใช้ useCallback สำหรับฟังก์ชันที่ส่งไปยัง child components
  const handleCardSelection = useCallback((card: Card) => {
    // เลือกการ์ดชั่วคราว (ยังไม่บันทึกแคช)
    selectCardTemporary(card);
    
    // ตั้งค่าว่าการ์ดถูกเลือกแล้ว
    setCardSelected(true);
    // ยังไม่อัปเดต hasMusicInCache เพราะยังไม่ได้บันทึกแคช
    
    setUiState(prev => ({
      ...prev,
      showCarousel: false,
      showViewer: true,
      isInteractionLocked: true
    }));
    
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, [selectCardTemporary]);
  
  const handleStartLoading = useCallback(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log("เริ่มโหลดโมเดลเมื่อกดการ์ด");
    }
    setModelState(prev => ({
      ...prev,
      isLoadingModel: true
    }));
  }, []);

  const handleModelLoaded = useCallback(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log("โมเดลโหลดเสร็จแล้ว - แสดงทุกอย่างทันที");
    }
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
    if (process.env.NODE_ENV === 'development') {
      console.log("Hero section initializing");
    }
  }, []);

  // จัดการ scroll บน body
  useEffect(() => {
    const { showCarousel, isInteractionLocked } = uiState;
    
    if (showHeroSection || showCarousel || isInteractionLocked) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }

    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [showHeroSection, uiState.showCarousel, uiState.isInteractionLocked]);
  
  // จัดการการปลดล็อคการปฏิสัมพันธ์หลังจากเลือกการ์ด
  useEffect(() => {
    if (!uiState.isInteractionLocked) return;
    
    const unlockTimer = setTimeout(() => {
      setUiState(prev => ({
        ...prev,
        isInteractionLocked: false
      }));
    }, 5000);
    
    return () => clearTimeout(unlockTimer);
  }, [uiState.isInteractionLocked]);

  return (
    <div className="flex flex-col relative overflow-hidden bg-[#0A0A0A] text-[#F5F1E6]">
      {/* Noise overlay */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-20 mix-blend-overlay z-10"
        style={{
          ...globalStyles.noiseOverlay,
          willChange: 'opacity'
        }}
        aria-hidden="true"
      />
      
      {/* Film grain effect */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-30 mix-blend-multiply z-10"
        style={{
          willChange: 'transform'
        }}
        aria-hidden="true"
      />

      {/* HeroSection Container - สไลด์ออกไปทางซ้าย */}
      {mounted && (
        <div 
          className={`fixed inset-0 z-40 ${
            isSliding ? '-translate-x-full' : 'translate-x-0'
          } ${showHeroSection ? 'block' : 'hidden'}`}
          style={{ 
            willChange: 'transform',
            transition: 'transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
          }}
        >
        {/* Carousel Modal */}
        {uiState.showCarousel && (
          <div 
            className="absolute inset-0 z-50 bg-[#0A0A0A] bg-opacity-80 backdrop-blur-sm flex items-center justify-center"
            role="dialog"
            aria-modal="true"
            aria-label="Select music card"
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
          <div className="absolute inset-0 z-[90] bg-transparent cursor-not-allowed" aria-hidden="true" />
        )}
        
        {/* HeroSection */}
        <HeroSection 
          showViewer={uiState.showViewer} 
          onInit={handleHeroInit}
          loading={modelState.loading}
          isLoadingModel={modelState.isLoadingModel}
          onModelLoaded={handleModelLoaded}
          onSlideToNext={handleSlideToMainPage}
          cardSelected={cardSelected}
        />
        </div>
      )}

      {/* Main Content - แสดงอยู่ข้างหลัง HeroSection ตลอดเวลา */}
      <div 
        className={`relative z-10 ${showHeroSection ? 'pointer-events-none' : 'pointer-events-auto'}`}
        style={{
          transform: isSliding ? 'translateY(0)' : showHeroSection ? 'translateY(100vh)' : 'translateY(0)',
          transition: 'transform 0s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          willChange: 'transform'
        }}
      >
        <ProductStory />
        <EventBooking />
        <Featured /> 
        <Review />
        <Contact/>
      </div>
    </div>
  );
}

// Export ตัวแปร global สำหรับให้ component อื่นใช้
export { globalShowHero };