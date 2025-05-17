'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AnimatedSection, StaggerAnimationContainer } from '@/components/AnimatedSection';
import CDCardCarousel from '@/components/CDCardCarousel';
import EventBooking from '@/components/evenbooking'; 
import ProductStory from '@/components/ProductStory';
import Featured from '@/components/Featured';
import dynamic from 'next/dynamic';
import Contact from '@/components/Contact';
import Review from '@/components/Review';

// สร้าง interface สำหรับ ref ของ ThreeViewer
interface ThreeViewerRef {
  triggerModelMovement: () => void;
}

// Dynamic import สำหรับ ThreeViewer
const ThreeViewer = dynamic(() => import('@/components/ThreeViewer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen flex items-center justify-center bg-[#0A0A0A]">
      <div className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
    </div>
  )
});

export default function Home() {
  const [mounted, setMounted] = useState(false);
  // State สำหรับ CDCardCarousel
  const [showCarousel, setShowCarousel] = useState(false);
  // เพิ่ม state สำหรับควบคุมการแสดง 3D Viewer Section
  const [showViewer, setShowViewer] = useState(false);
  // เพิ่ม state สำหรับควบคุมความโปร่งใสของ overlay
  const [overlayOpacity, setOverlayOpacity] = useState(0);
  // เพิ่ม state สำหรับเก็บค่า Y offset ของข้อความ
  const [textOffset, setTextOffset] = useState(0);
  // เพิ่ม state สำหรับควบคุมความโปร่งใสของข้อความ
  const [textOpacity, setTextOpacity] = useState(1);
  
  // เพิ่ม state สำหรับควบคุมสถานะล็อคการปฏิสัมพันธ์
  const [isInteractionLocked, setIsInteractionLocked] = useState(false);
  // เพิ่ม state สำหรับควบคุมการแสดงรูปมือแนะนำการเลื่อน
  const [showScrollHint, setShowScrollHint] = useState(false);
  // เพิ่ม state สำหรับติดตามว่าผู้ใช้ได้เลื่อนแล้วหรือยัง
  const [hasScrolled, setHasScrolled] = useState(false);
  
  // สร้าง ref สำหรับ section ที่มีข้อความ
  const textSectionRef = useRef<HTMLDivElement>(null);
  
  // ระบุ type ให้กับ ref
  const threeViewerRef = useRef<ThreeViewerRef>(null);
  
  // Effect for animation keyframes
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.8; }
      }
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes floatNote {
        0% { transform: translateY(0) rotate(0deg); }
        50% { transform: translateY(-10px) rotate(5deg); }
        100% { transform: translateY(0) rotate(0deg); }
      }
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
      @keyframes scrollHint {
        0% { transform: translateY(0); }
        25% { transform: translateY(-30px); }
        30% { transform: translateY(-25px); }
        35% { transform: translateY(-30px); }
        70% { transform: translateY(-30px); }
        100% { transform: translateY(0); }
      }
      @keyframes fadeInOut {
        0% { opacity: 0; }
        20% { opacity: 1; }
        80% { opacity: 1; }
        100% { opacity: 0; }
      }
      @keyframes touchDown {
        0%, 30%, 70%, 100% { transform: scale(1); }
        35%, 65% { transform: scale(0.9); }
      }
      @keyframes fingerMove {
        0% { transform: translateY(0); }
        20% { transform: translateY(-120px); }
        25% { transform: translateY(-110px); }
        30% { transform: translateY(-120px); }
        70% { transform: translateY(-120px); }
        100% { transform: translateY(0); }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  
  // Effect เดียวสำหรับจัดการ client-side mounting
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setMounted(true);
    }
  }, []);
  
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
  
  // Effect สำหรับจัดการ overlay เมื่อ showViewer เปลี่ยน
  useEffect(() => {
    if (showViewer) {
      // เริ่มแสดง overlay ก่อนอนิเมชันสไลด์
      setOverlayOpacity(1);
      
      // ค่อยๆ ลด opacity ของ overlay หลังจากการสไลด์เริ่มต้น
      const timer = setTimeout(() => {
        setOverlayOpacity(0);
      }, 350); // รอให้การสไลด์เริ่มต้นก่อน
      
      return () => clearTimeout(timer);
    } else {
      setOverlayOpacity(0);
    }
  }, [showViewer]);
  
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
  
  // เพิ่ม Effect สำหรับจัดการ parallax scroll และการเฟดข้อความ
  useEffect(() => {
    if (!showViewer) return;
    
    const handleScroll = () => {
      if (!textSectionRef.current) return;
      
      // กำหนดความเร็วของ parallax (ค่าน้อยกว่า 1 จะทำให้เคลื่อนที่ช้ากว่าการเลื่อนจอ)
      const parallaxSpeed = 0.5;
      
      // คำนวณตำแหน่ง offset ใหม่ตามการเลื่อน
      const scrollY = window.scrollY;
      
      // กำหนดจุดสิ้นสุดของเอฟเฟกต์ (เมื่อเลื่อนเกินค่านี้จะหยุดเอฟเฟกต์)
      const maxParallaxDistance = 200; // สามารถปรับค่านี้ตามต้องการ
      
      // คำนวณค่า offset ใหม่ แต่ไม่เกิน maxParallaxDistance
      const newOffset = Math.min(scrollY * parallaxSpeed, maxParallaxDistance);
      
      setTextOffset(newOffset);
      
      // คำนวณความโปร่งใสของข้อความตามการเลื่อน
      // เริ่มต้นเฟดเมื่อเลื่อนถึง startFade และเฟดออกหมดที่ endFade
      const startFade = 100; // เริ่มเฟดที่ 100px
      const endFade = 400;   // เฟดหมดที่ 400px
      
      if (scrollY <= startFade) {
        setTextOpacity(1); // ยังคงแสดงเต็มที่
      } else if (scrollY >= endFade) {
        setTextOpacity(0); // ซ่อนสมบูรณ์
      } else {
        // คำนวณค่าความโปร่งใสระหว่าง 1-0 ตามสัดส่วนการเลื่อน
        const fadeProgress = (scrollY - startFade) / (endFade - startFade);
        setTextOpacity(1 - fadeProgress);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [showViewer]);
  
  // handleCardSelection ที่เริ่มการสไลด์และเคลื่อนไหวโมเดลพร้อมกัน และล็อคการปฏิสัมพันธ์
  const handleCardSelection = () => {
    // ปิด carousel
    setShowCarousel(false);
    
    // แสดง 3D Viewer Section (จะทำให้เริ่มสไลด์ลง)
    setShowViewer(true);
    
    // เริ่มการเคลื่อนไหวโมเดล
    if (threeViewerRef.current) {
      threeViewerRef.current.triggerModelMovement();
    }
    
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
    
    // ล็อคการปฏิสัมพันธ์เป็นเวลา 3 วินาที
    setIsInteractionLocked(true);
    // รีเซ็ต state การเลื่อน
    setHasScrolled(false);
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
      
      {/* Transition Overlay - สร้าง overlay เพื่อซ่อนรอยต่อระหว่างคอนเทนเนอร์ */}
      <div 
        className="absolute inset-0 pointer-events-none z-40 bg-gradient-to-b from-[#0A0A0A] to-transparent"
        style={{
          opacity: overlayOpacity,
          transition: 'opacity 0.8s ease-in-out',
          height: '30vh',
        }}
      />

      {/* 3D Viewer Section - โหลดไว้แต่ซ่อนไว้ก่อน */}
      <div 
        className="relative w-full scroll-container"
        style={{
          transform: showViewer ? 'translateY(0)' : 'translateY(-100%)', 
          transition: 'transform 5s cubic-bezier(0.16, 1, 0.3, 1)', 
          height: showViewer ? 'auto' : '0',
          zIndex: 30,
          top: 0,
          left: 0,
          right: 0,
          touchAction: 'auto',
          overflow: 'auto'
        }}
      >
        <AnimatedSection animation="fadeIn" duration={0.8} className="relative w-full">
          {mounted && (
            <div className="relative w-full">
              <ThreeViewer 
                ref={threeViewerRef}
                height="h-[100vh]" 
                className="bg-transparent" // เปลี่ยนเป็นพื้นหลังโปร่งใส
              />
              
              {/* เพิ่มเงาที่ด้านล่างของ 3D Viewer เพื่อให้ transition ไปยัง Hero Section ดูสมูทขึ้น */}
              <div className="absolute bottom-0 left-0 right-0 h-[300px] bg-gradient-to-t from-[#0A0A0A] to-transparent pointer-events-none" />
            </div>
          )}
        </AnimatedSection>
      </div>
      
      {/* คอนเทนเนอร์ที่มีพื้นหลังสีดำและข้อความ */}
      <div 
        ref={textSectionRef}
        className="relative w-full overflow-hidden"
        style={{
          transform: showViewer ? 'translateY(0)' : 'translateY(-100%)', 
          transition: 'transform 5s cubic-bezier(0.16, 1, 0.3, 1)',
          height: showViewer ? 'auto' : '0',
          zIndex: 20, // ให้อยู่ด้านหลัง 3D Viewer
          position: 'absolute',
          backgroundColor: '#0A0A0A' // Rich Black
        }}
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
            style={{
              background: 'linear-gradient(90deg, #C2A14D, #D4AF37, #C2A14D)',
              backgroundSize: '400% 100%',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'shimmer 10s ease-in-out infinite',
              transform: `translateY(${textOffset}px)`,
              transition: 'transform 0.1s ease-out, opacity 0.2s ease-out',
              textShadow: '0 0 20px rgba(212, 175, 55, 0.3)',
              opacity: textOpacity // ใช้ค่า opacity ที่คำนวณจากการเลื่อน
            }}
          >
            Grandma Jazz
          </h1>
        </div>
      </div>

      {/* Event Booking Section */}
      <ProductStory />
      <EventBooking />
      <Featured /> 
      <Review />
      <Contact/>
    </div>
  );
}