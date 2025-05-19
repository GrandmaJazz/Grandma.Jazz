'use client';

import { useState, useEffect } from 'react';
import CDCardCarousel from '@/components/CDCardCarousel';
import EventBooking from '@/components/evenbooking'; 
import ProductStory from '@/components/ProductStory';
import Featured from '@/components/Featured';
import Contact from '@/components/Contact';
import Review from '@/components/Review';
import HeroSection from '@/components/HeroSection';

export default function Home() {
  // State สำหรับ CDCardCarousel
  const [showCarousel, setShowCarousel] = useState(false);
  // เพิ่ม state สำหรับควบคุมการแสดง 3D Viewer Section
  const [showViewer, setShowViewer] = useState(false);
  // เพิ่ม state สำหรับควบคุมสถานะล็อคการปฏิสัมพันธ์
  const [isInteractionLocked, setIsInteractionLocked] = useState(false);
  // เพิ่ม state สำหรับควบคุมการแสดงรูปมือแนะนำการเลื่อน
  const [showScrollHint, setShowScrollHint] = useState(false);
  // เพิ่ม state สำหรับติดตามว่าผู้ใช้ได้เลื่อนแล้วหรือยัง
  const [hasScrolled, setHasScrolled] = useState(false);
  
  // Effect สำหรับแสดง carousel
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowCarousel(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Effect สำหรับจัดการ scroll บน body
  useEffect(() => {
    // เพิ่มลอจิกจัดการการล็อคการปฏิสัมพันธ์
    if (showCarousel || isInteractionLocked) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }

    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [showCarousel, isInteractionLocked]);
  
  // เพิ่ม Effect สำหรับจัดการการล็อคการปฏิสัมพันธ์และแสดงรูปมือแนะนำ
  useEffect(() => {
    if (!isInteractionLocked) return;
    
    // กำหนดเวลาให้แสดงรูปมือหลังจาก 3 วินาที
    const hintTimer = setTimeout(() => {
      setShowScrollHint(true);
      // หลังจากแสดงรูปมือแล้ว ปลดล็อคการปฏิสัมพันธ์
      setIsInteractionLocked(false);
    }, 3000);
    
    return () => {
      clearTimeout(hintTimer);
    };
  }, [isInteractionLocked]);
  
  // เพิ่ม Effect สำหรับติดตามการเลื่อนและซ่อนรูปมือ
  useEffect(() => {
    if (!showScrollHint) return;
    
    const handleScroll = () => {
      // เมื่อผู้ใช้เลื่อน กำหนดให้ hasScrolled เป็น true
      setHasScrolled(true);
      // ซ่อนรูปมือ
      setShowScrollHint(false);
    };
    
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [showScrollHint]);

  // handleCardSelection ที่เริ่มการสไลด์และเคลื่อนไหวโมเดลพร้อมกัน และล็อคการปฏิสัมพันธ์
  const handleCardSelection = () => {
    // ปิด carousel
    setShowCarousel(false);
    
    // แสดง 3D Viewer Section (จะทำให้เริ่มสไลด์ลง)
    setShowViewer(true);
    
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
    
    // ล็อคการปฏิสัมพันธ์เป็นเวลา 3 วินาที
    setIsInteractionLocked(true);
    // รีเซ็ต state การเลื่อน
    setHasScrolled(false);
  };
  
  // ฟังก์ชันเมื่อ HeroSection ถูก initialize
  const handleHeroInit = () => {
    console.log("Hero section initialized");
    // ใส่โค้ดเพิ่มเติมหลังจาก HeroSection ถูก initialize
  };

  return (
    <div className="flex flex-col relative overflow-hidden bg-[#0A0A0A] text-[#F5F1E6]">
      {/* Noise overlay for vintage effect - applied to entire page */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-20 mix-blend-overlay z-10"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '150px 150px'
        }}
      />
      
      {/* Film grain effect - applied to entire page */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-30 mix-blend-multiply z-10"
        style={{
          animation: 'noise 0.5s steps(10) infinite',
        }}
      />

      {/* Carousel Modal */}
      {showCarousel && (
        <div 
          className="fixed inset-0 z-50 bg-[#0A0A0A] bg-opacity-80 backdrop-blur-sm flex items-center justify-center"
        >
          <div>
            <CDCardCarousel onCardClick={handleCardSelection} />
          </div>
        </div>
      )}

      {/* Scroll Hint (เฉพาะวงกลมแนะนำให้เลื่อน) - แสดงเฉพาะหน้าจอที่ต่ำกว่า xl */}
      {showScrollHint && !hasScrolled && (
        <div 
          className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[100] flex flex-col items-center xl:hidden"
          style={{
            animation: 'fadeInOut 4s ease-in-out forwards',
          }}
        >
          {/* เฉพาะวงกลมที่เลื่อนขึ้นลง */}
          <div 
            className="w-40 h-56 mb-6 relative"
          >
            {/* วงกลมที่เลื่อนขึ้น */}
            <div
              className="absolute top-0 left-0 w-full h-full flex justify-center"
              style={{
                animation: 'fingerMove 3s ease-in-out infinite',
              }}
            >
              <svg width="100%" height="100%" viewBox="0 0 160 280" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* วงกลมเอฟเฟกต์หลัก */}
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
            
            {/* แสดงเส้นประที่แสดงเส้นทางการเลื่อน (ยาวขึ้น) */}
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
          
          {/* ข้อความแนะนำ */}
          <p className="text-white font-bold text-center text-2xl">
            Scroll to Explore
          </p>
        </div>
      )}
      
      {/* ปิดการปฏิสัมพันธ์ในช่วง 3 วินาที */}
      {isInteractionLocked && (
        <div className="fixed inset-0 z-[90] bg-transparent cursor-not-allowed" />
      )}
      
      {/* เรียกใช้ HeroSection component */}
      <HeroSection 
        showViewer={showViewer} 
        onInit={handleHeroInit}
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