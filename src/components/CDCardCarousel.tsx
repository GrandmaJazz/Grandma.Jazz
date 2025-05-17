'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCards, Pagination } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/effect-cards';
import 'swiper/css/pagination';

// Define types
interface CardData {
  id: number;
  imagePath: string;
  title: string;
  artist: string;
  year: string;
}

interface CDCardCarouselProps {
  onCardClick?: () => void;
}

// Screen size breakpoints
enum ScreenSize {
  XS = 'xs',
  SM = 'sm',
  MD = 'md',
  LG = 'lg',
  XL = 'xl',
  XXL = 'xxl'
}

// ข้อมูลการ์ดตั้งต้น - Jazz theme
const ORIGINAL_CARDS: CardData[] = [
  { id: 1, imagePath: "/images/vinyl7.webp", title: "Beachside Swing", artist: "The Island Crooners", year: "1961" },
  { id: 2, imagePath: "/images/vinyl2.webp", title: "Silky Sax Sessions", artist: "Lady Ella & The Rhythm Kings", year: "1962" },
  { id: 3, imagePath: "/images/vinyl3.webp", title: "Monsoon Blues", artist: "Phuket Jazz Ensemble", year: "1965" },
  { id: 4, imagePath: "/images/vinyl4.webp", title: "Tropical Nocturne", artist: "The Golden Palms Trio", year: "1953" },
  { id: 5, imagePath: "/images/vinyl5.webp", title: "Breezy Melodies", artist: "Grandma's Favorites", year: "1957" },
  { id: 6, imagePath: "/images/vinyl6.webp", title: "Beachside Swing", artist: "The Island Crooners", year: "1961" },
  { id: 7, imagePath: "/images/vinyl1.webp", title: "Midnight in Bangkok", artist: "The Siam Quartet", year: "1958" }
];

const CDCardCarousel: React.FC<CDCardCarouselProps> = ({ onCardClick }) => {
  // State variables
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasSelected, setHasSelected] = useState<boolean>(false);
  const [selectedCard, setSelectedCard] = useState<CardData | null>(null);
  const [screenSize, setScreenSize] = useState<ScreenSize>(ScreenSize.MD);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  
  // Animation state tracking
  const [animationStage, setAnimationStage] = useState<'idle' | 'vinylAppear' | 'vinylRise' | 'complete'>('idle');
  
  // References
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const swiperRef = useRef<SwiperType | null>(null);
  const selectedCardRef = useRef<HTMLDivElement | null>(null);

  // ตรวจสอบขนาดหน้าจอและโหลดรูปภาพ
  useEffect(() => {
    const preloadImages = async (): Promise<void> => {
      try {
        const imagePromises = ORIGINAL_CARDS.map(card => {
          return new Promise<void>((resolve, reject) => {
            const img = new Image();
            img.src = card.imagePath;
            img.onload = () => resolve();
            img.onerror = () => resolve(); // ทำงานต่อแม้โหลดรูปไม่สำเร็จ
          });
        });
        
        await Promise.all(imagePromises);
        setTimeout(() => setIsLoading(false), 300); // เพิ่ม delay เล็กน้อยเพื่อ smoother transition
      } catch (error) {
        console.error('Error preloading images:', error);
        setIsLoading(false);
      }
    };

    preloadImages();
    
    // ฟังก์ชันตรวจสอบขนาดหน้าจอ
    const updateScreenDimensions = (): void => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      // กำหนดขนาดหน้าจอ
      if (width < 375) setScreenSize(ScreenSize.XS);
      else if (width < 640) setScreenSize(ScreenSize.SM);
      else if (width < 768) setScreenSize(ScreenSize.MD);
      else if (width < 1024) setScreenSize(ScreenSize.LG);
      else if (width < 1280) setScreenSize(ScreenSize.XL);
      else setScreenSize(ScreenSize.XXL);
      
      // กำหนด orientation
      setOrientation(width > height ? 'landscape' : 'portrait');
    };
    
    // ตรวจสอบขนาดหน้าจอตอนโหลดครั้งแรก
    updateScreenDimensions();
    
    // ตรวจสอบทุกครั้งที่มีการเปลี่ยนขนาดหน้าจอ
    window.addEventListener('resize', updateScreenDimensions);
    
    // ตรวจสอบทุกครั้งที่มีการเปลี่ยน orientation
    window.addEventListener('orientationchange', updateScreenDimensions);
    
    return () => {
      window.removeEventListener('resize', updateScreenDimensions);
      window.removeEventListener('orientationchange', updateScreenDimensions);
    };
  }, []);

  // ฟังก์ชันจัดการเมื่อคลิกการ์ด - ทำให้ช้าลง 3 เท่าและเอาแอนิเมชั่นการขยายการ์ดออก
  const handleCardClick = useCallback((card: CardData): void => {
    if (hasSelected || animationStage !== 'idle') return;
    
    setSelectedCard(card);
    setHasSelected(true);
    
    // แสดงแผ่นเสียงทันที (ไม่มีการขยายการ์ด)
    setAnimationStage('vinylAppear');
    
    // รอให้แผ่นเสียงปรากฏเต็มตัว แล้วค่อยเริ่มยกขึ้น (ช้าลง 3 เท่า)
    setTimeout(() => {
      setAnimationStage('vinylRise');
      
      // รอให้แผ่นเสียงลอยขึ้นสมบูรณ์แล้ว (ช้าลง 3 เท่า)
      setTimeout(() => {
        setAnimationStage('complete');
        
        // ปิดหน้าจอ
        if (onCardClick) {
          onCardClick();
        }
        
        // รีเซ็ตสถานะ
        setTimeout(() => {
          setHasSelected(false);
          setSelectedCard(null);
          setAnimationStage('idle');
        }, 100);
      }, 1000); 
    }, 100); 
    
  }, [hasSelected, animationStage, onCardClick]);

  // ถ้ากำลังโหลด แสดง Loading spinner
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full w-full">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-2 border-[#D4AF37] opacity-30"></div>
          <div className="absolute top-0 left-0 w-16 h-16 rounded-full border-t-2 border-l-2 border-[#D4AF37] animate-spin"></div>
          <div className="absolute top-4 left-4 w-8 h-8 rounded-full bg-[#0A0A0A] flex items-center justify-center">
            <span className="text-[#D4AF37] text-xl">♪</span>
          </div>
        </div>
      </div>
    );
  }

  // ปรับขนาดตาม screen size
  const getContainerClasses = (): string => {
    let classes = "vinyl-carousel-container ";
    
    // ปรับขนาด padding ตามขนาดหน้าจอ
    if (screenSize === ScreenSize.XS) classes += "px-2 py-4 ";
    else if (screenSize === ScreenSize.SM) classes += "px-4 py-5 ";
    else if (screenSize === ScreenSize.MD) classes += "px-5 py-6 ";
    else classes += "px-6 py-8 ";
    
    return classes.trim();
  };

  // ปรับขนาด carousel ตามขนาดหน้าจอ
  const getSwiperContainerClasses = (): string => {
    let classes = "relative mx-auto ";
    
    // ปรับความกว้างตามขนาดหน้าจอ
    if (screenSize === ScreenSize.XS) classes += "w-[85vw] max-w-[280px] ";
    else if (screenSize === ScreenSize.SM) classes += "w-[80vw] max-w-[350px] ";
    else if (screenSize === ScreenSize.MD) classes += "w-[75vw] max-w-[450px] ";
    else if (screenSize === ScreenSize.LG) classes += "w-[50vw] max-w-[500px] ";
    else classes += "w-[40vw] max-w-[550px] ";
    
    // ปรับการจัดวางสำหรับ landscape mode บนมือถือ
    if (orientation === 'landscape' && (screenSize === ScreenSize.XS || screenSize === ScreenSize.SM)) {
      classes += "h-[60vh] ";
    }
    
    return classes.trim();
  };

  // ปรับขนาด vinyl (แผ่นเสียง)
  const getVinylSize = (): string => {
    // คำนวณขนาดตามหน้าจอ - ปรับให้ใหญ่ขึ้นประมาณ 80-85% ของขนาดการ์ด
    if (screenSize === ScreenSize.XS) return '200px';
    else if (screenSize === ScreenSize.SM) return '250px';
    else if (screenSize === ScreenSize.MD) return '300px';
    else if (screenSize === ScreenSize.LG) return '380px';
    else return '420px';
  };
  
  // คำนวณ border-radius ให้เหมาะกับขนาดหน้าจอ
  const getBorderRadius = (): string => {
    if (screenSize === ScreenSize.XS) return '16px';
    else if (screenSize === ScreenSize.SM) return '20px';
    else if (screenSize === ScreenSize.MD) return '24px';
    else if (screenSize === ScreenSize.LG) return '28px';
    else return '32px';
  };

  return (
    <div ref={carouselRef} className={getContainerClasses()}>
      {/* Title Section */}
      <div className="mb-4 sm:mb-6 md:mb-8 text-center vinyl-title">
        <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl text-[#D4AF37] font-semibold mb-2">
          Our Collection
        </h2>
        <div className="flex items-center justify-center space-x-2">
          <div className="h-px w-8 sm:w-10 md:w-12 bg-[#9C6554]"></div>
          <span className="text-xs sm:text-sm text-[#F5F1E6] italic">vintage jazz vinyl records</span>
          <div className="h-px w-8 sm:w-10 md:w-12 bg-[#9C6554]"></div>
        </div>
      </div>

      {/* Vinyl Animation (เมื่อเลือกการ์ด) - ย้ายแผ่นเสียงมาไว้หลังการ์ด (z-index ต่ำกว่า) */}
      {selectedCard && (
        <div 
          className={`vinyl-disc-animation ${
            animationStage === 'vinylAppear' ? 'vinyl-appear' : 
            animationStage === 'vinylRise' || animationStage === 'complete' ? 'vinyl-appear vinyl-rise' : ''
          }`}
        >
          <div className="vinyl-disc">
            {/* Vinyl grooves */}
            <div className="vinyl-groove vinyl-groove-1"></div>
            <div className="vinyl-groove vinyl-groove-2"></div>
            <div className="vinyl-groove vinyl-groove-3"></div>
            
            {/* Center label */}
            <div className="vinyl-label">
              <div className="vinyl-hole"></div>
            </div>
          </div>
        </div>
      )}

      {/* Swiper Carousel */}
      <div className={getSwiperContainerClasses()}>
        <Swiper
          onSwiper={(swiper) => {
            swiperRef.current = swiper;
          }}
          effect={'cards'}
          grabCursor={!hasSelected}
          modules={[EffectCards, Pagination]}
          className="vinyl-swiper"
          pagination={{
            clickable: true,
            bulletClass: 'swiper-pagination-bullet vinyl-bullet',
            bulletActiveClass: 'swiper-pagination-bullet-active vinyl-bullet-active',
          }}
          cardsEffect={{
            slideShadows: true,
            perSlideOffset: 8, 
            perSlideRotate: screenSize <= ScreenSize.SM ? 2 : 3,
            rotate: true,
          }}
        >
          {ORIGINAL_CARDS.map((card) => (
            <SwiperSlide key={card.id} className="vinyl-slide">
              <div 
                ref={selectedCard?.id === card.id ? selectedCardRef : null}
                className={`vinyl-card-container ${selectedCard?.id === card.id ? 'selected-card' : ''}`}
                onClick={() => handleCardClick(card)}
                aria-label={`${card.title} by ${card.artist} (${card.year})`}
                style={{
                  pointerEvents: hasSelected ? 'none' : 'auto'
                }}
              >
                {/* Card Content - รูปภาพเท่านั้น */}
                <div className="vinyl-card">
                  <div className="vinyl-image-container">
                    <img 
                      src={card.imagePath} 
                      alt={`${card.title} by ${card.artist}`}
                      className="vinyl-image"
                      draggable="false"
                      loading="lazy"
                    />
                    
                    {/* Film grain overlay */}
                    <div className="vinyl-grain-overlay"></div>
                    
                    {/* Worn edges effect */}
                    <div className="vinyl-worn-edges"></div>
                  </div>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      {/* Tutorial Message */}
      <div className="mt-4 sm:mt-6 md:mt-8 text-center tutorial-message">
        {!hasSelected && (
          <div className="tutorial-content">
            <div className="flex items-center justify-center">
              <span className="text-[#D4AF37] text-base sm:text-lg mr-2">♪</span>
              <p className="text-base sm:text-lg text-[#F5F1E6]">
                {screenSize <= ScreenSize.MD ? "Tap" : "Click"} to select a record
              </p>
              <span className="text-[#D4AF37] text-base sm:text-lg ml-2">♪</span>
            </div>
          </div>
        )}
      </div>

      {/* CSS */}
      <style jsx global>{`
        /* Base Styles */
        .vinyl-carousel-container {
          width: 100%;
          max-width: 100%;
          margin: 0 auto;
          box-sizing: border-box;
        }
        
        .vinyl-title {
          opacity: 0;
          animation: fadeIn 0.8s ease-out forwards;
        }

        /* Swiper Overrides */
        .vinyl-swiper {
          width: 100%;
          padding-bottom: clamp(30px, 4vw, 50px);
          opacity: 0;
          animation: fadeIn 0.8s ease-out 0.3s forwards;
          position: relative;
          z-index: 10; /* การ์ดอยู่ด้านหน้าของแผ่นเสียง */
        }
        
        .vinyl-slide {
          background-color: transparent;
          display: flex;
          justify-content: center;
          align-items: center;
          aspect-ratio: 1 / 1;
        }
        
        /* Card Styling - เอาแอนิเมชั่นการเลือกการ์ดออก */
        .vinyl-card-container {
          width: 100%;
          height: 100%;
          cursor: pointer;
          perspective: 1000px;
          user-select: none;
          border-radius: ${getBorderRadius()};
          overflow: hidden;
        }
        
        /* เอา hover effect ออก */
        
        .vinyl-card-container.selected-card {
          /* เอาการขยายตัวออก */
          z-index: 20; /* คงไว้เพื่อให้การ์ดที่เลือกอยู่หน้าสุด */
          cursor: default;
        }
        
        .vinyl-card {
          position: relative;
          width: 100%;
          height: 100%;
          border-radius: ${getBorderRadius()};
          overflow: hidden;
          background: #0A0A0A;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(212, 175, 55, 0.2);
        }
        
        .vinyl-image-container {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
          border-radius: ${getBorderRadius()};
        }
        
        .vinyl-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          filter: sepia(10%) contrast(110%) brightness(90%);
          border-radius: ${getBorderRadius()};
        }
        
        .vinyl-grain-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          opacity: 0.2;
          mix-blend-mode: overlay;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
          background-size: 150px;
          background-repeat: repeat;
          border-radius: ${getBorderRadius()};
        }
        
        .vinyl-worn-edges {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          opacity: 0.1;
          background-image: url("data:image/svg+xml,%3Csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cfilter id='scratches' x='0' y='0' width='100%25' height='100%25'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.1' numOctaves='5' stitchTiles='stitch' result='noise'/%3E%3CfeDisplacementMap in='SourceGraphic' in2='noise' scale='5' xChannelSelector='R' yChannelSelector='G'/%3E%3C/filter%3E%3C/defs%3E%3Crect width='100%25' height='100%25' filter='url(%23scratches)' fill='none'/%3E%3C/svg%3E");
          border-radius: ${getBorderRadius()};
        }
        
        /* Pagination Styling */
        .vinyl-bullet {
          width: clamp(6px, 1.5vw, 8px);
          height: clamp(6px, 1.5vw, 8px);
          display: inline-block;
          border-radius: 50%;
          background: rgba(156, 101, 84, 0.5);
          margin: 0 5px;
          transition: all 0.3s ease;
        }
        
        .vinyl-bullet-active {
          background: #D4AF37;
          transform: scale(1.2);
        }
        
        /* Vinyl Animation - ทำให้ช้าลงและอยู่หลังการ์ด */
        .vinyl-disc-animation {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 0;
          height: 0;
          z-index: 1; /* ให้ z-index ต่ำกว่าการ์ด */
          opacity: 0;
          pointer-events: none;
          transition: all 2.4s cubic-bezier(0.34, 1.56, 0.64, 1); /* 0.8s * 3 = 2.4s */
        }
        
        .vinyl-disc-animation.vinyl-appear {
          opacity: 1;
          width: ${getVinylSize()};
          height: ${getVinylSize()};
        }
        
        .vinyl-disc-animation.vinyl-rise {
          transform: translate(-50%, -300%);
          opacity: 0;
          transition: transform 7.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 7.5s ease-in; /* 2.5s * 3 = 7.5s */
        }
        
        .vinyl-disc {
          position: relative;
          width: 100%;
          height: 100%;
          background: #0A0A0A;
          border-radius: 50%;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.4);
          animation: vinylRotate 12s linear infinite; /* 4s * 3 = 12s */
        }
        
        .vinyl-groove {
          position: absolute;
          border-radius: 50%;
          border: 1px solid rgba(156, 101, 84, 0.3);
        }
        
        .vinyl-groove-1 {
          top: 15%;
          left: 15%;
          right: 15%;
          bottom: 15%;
        }
        
        .vinyl-groove-2 {
          top: 30%;
          left: 30%;
          right: 30%;
          bottom: 30%;
        }
        
        .vinyl-groove-3 {
          top: 45%;
          left: 45%;
          right: 45%;
          bottom: 45%;
        }
        
        .vinyl-label {
          position: absolute;
          top: 40%;
          left: 40%;
          right: 40%;
          bottom: 40%;
          background: linear-gradient(145deg, #D4AF37, #9C6554);
          border-radius: 50%;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        
        .vinyl-hole {
          width: 15%;
          height: 15%;
          border-radius: 50%;
          background: #0A0A0A;
        }
        
        .tutorial-message {
          opacity: 0;
          animation: fadeIn 0.8s ease-out 1s forwards;
        }
        
        .tutorial-content {
          animation: float 3s ease-in-out infinite;
        }
        
        /* Animations */
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        
        @keyframes vinylRotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        /* Landscape mode specific for mobile */
        @media (max-width: 767px) and (orientation: landscape) {
          .vinyl-slide {
            aspect-ratio: auto;
            height: 50vh;
          }
        }
      `}</style>
    </div>
  );
};

export default CDCardCarousel;