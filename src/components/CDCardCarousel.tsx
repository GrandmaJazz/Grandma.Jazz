'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCards } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/effect-cards';

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
  const swiperRef = useRef<SwiperType | null>(null);

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
    
    // Debounced screen size update function
    const debounce = (func: Function, delay: number) => {
      let timeoutId: NodeJS.Timeout;
      return (...args: any[]) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
      };
    };
    
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
    
    // Using debounced function for resize events
    const debouncedUpdateScreenDimensions = debounce(updateScreenDimensions, 200);
    
    // ตรวจสอบขนาดหน้าจอตอนโหลดครั้งแรก
    updateScreenDimensions();
    
    // ตรวจสอบทุกครั้งที่มีการเปลี่ยนขนาดหน้าจอ - ใช้ debounce
    window.addEventListener('resize', debouncedUpdateScreenDimensions);
    
    // ตรวจสอบทุกครั้งที่มีการเปลี่ยน orientation
    window.addEventListener('orientationchange', updateScreenDimensions);
    
    return () => {
      window.removeEventListener('resize', debouncedUpdateScreenDimensions);
      window.removeEventListener('orientationchange', updateScreenDimensions);
    };
  }, []);

  // ฟังก์ชันจัดการเมื่อคลิกการ์ด - คงเดิม
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
    }, 0); 
    
  }, [hasSelected, animationStage, onCardClick]);

  // กำหนดขนาด Swiper คอนเทนเนอร์ตามขนาดหน้าจอ
  const getSwiperSize = () => {
    if (screenSize === ScreenSize.XS) return 'w-72 h-72';
    else if (screenSize === ScreenSize.SM) return 'w-80 h-80';
    else if (screenSize === ScreenSize.MD) return 'w-96 h-96';
    else if (screenSize === ScreenSize.LG) return 'w-[450px] h-[450px]';
    else return 'w-[500px] h-[500px]';
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

  return (
    <div className="w-full py-8 px-4 md:px-6 lg:px-8 relative">
      {/* Title Section */}
      <div className="mb-8 text-center opacity-0 animate-[fadeIn_0.8s_ease-out_forwards]">
        <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl text-[#D4AF37] font-semibold mb-2">
          Our Collection
        </h2>
        <div className="flex items-center justify-center space-x-2">
          <div className="h-px w-8 sm:w-10 md:w-12 bg-[#9C6554]"></div>
          <span className="text-xs sm:text-sm text-[#F5F1E6] italic">vintage jazz vinyl records</span>
          <div className="h-px w-8 sm:w-10 md:w-12 bg-[#9C6554]"></div>
        </div>
      </div>

      {/* Vinyl Animation - ตำแหน่งสัมพัทธ์กับ container */}
      {selectedCard && (
        <div 
          className={`vinyl-disc-animation ${
            animationStage === 'vinylAppear' ? 'vinyl-appear' : 
            animationStage === 'vinylRise' || animationStage === 'complete' ? 'vinyl-appear vinyl-rise' : ''
          }`}
          style={{
            width: animationStage === 'idle' ? '0' : getVinylSize(),
            height: animationStage === 'idle' ? '0' : getVinylSize()
          }}
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

      {/* Swiper Carousel - simplified according to the new example */}
      <div className="flex justify-center items-center w-full relative z-10">
        <Swiper
          onSwiper={(swiper) => {
            swiperRef.current = swiper;
          }}
          effect={'cards'}
          grabCursor={!hasSelected}
          modules={[EffectCards]}
          loop={true}
          className={`opacity-0 animate-[fadeIn_0.8s_ease-out_0.3s_forwards] ${getSwiperSize()} vinyl-swiper`}
          cardsEffect={{
            slideShadows: true,
            perSlideOffset: 8, 
            perSlideRotate: screenSize <= ScreenSize.SM ? 2 : 3,
            rotate: true,
          }}
        >
          {ORIGINAL_CARDS.map((card) => (
            <SwiperSlide 
              key={card.id} 
              className="flex items-center justify-center rounded-2xl overflow-hidden bg-[#0A0A0A] shadow-lg border border-[rgba(212,175,55,0.2)]"
              onClick={() => handleCardClick(card)}
            >
              <div 
                className={`relative w-full h-full ${selectedCard?.id === card.id ? 'selected-card' : ''}`}
                style={{ pointerEvents: hasSelected ? 'none' : 'auto' }}
                aria-label={`${card.title} by ${card.artist} (${card.year})`}
              >
                {/* Card Image */}
                <img 
                  src={card.imagePath} 
                  alt={`${card.title} by ${card.artist}`}
                  className="w-full h-full object-cover filter-[sepia(10%)_contrast(110%)_brightness(90%)]"
                  draggable="false"
                  loading="lazy"
                />
                
                {/* Film grain overlay */}
                <div className="absolute inset-0 pointer-events-none opacity-20 mix-blend-overlay bg-[url('data:image/svg+xml,%3Csvg viewBox=%270 0 200 200%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27noiseFilter%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.8%27 numOctaves=%274%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23noiseFilter)%27/%3E%3C/svg%3E')] bg-repeat bg-[size:150px]"></div>
                
                {/* Worn edges effect */}
                <div className="absolute inset-0 pointer-events-none opacity-10 bg-[url('data:image/svg+xml,%3Csvg width=%27100%25%27 height=%27100%25%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cdefs%3E%3Cfilter id=%27scratches%27 x=%270%27 y=%270%27 width=%27100%25%27 height=%27100%25%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.1%27 numOctaves=%275%27 stitchTiles=%27stitch%27 result=%27noise%27/%3E%3CfeDisplacementMap in=%27SourceGraphic%27 in2=%27noise%27 scale=%275%27 xChannelSelector=%27R%27 yChannelSelector=%27G%27/%3E%3C/filter%3E%3C/defs%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23scratches)%27 fill=%27none%27/%3E%3C/svg%3E')]"></div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      {/* Tutorial Message */}
      <div className="mt-8 text-center opacity-0 animate-[fadeIn_0.8s_ease-out_1s_forwards]">
        {!hasSelected && (
          <div className="animate-[float_3s_ease-in-out_infinite]">
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
        .vinyl-swiper {
          z-index: 10; /* การ์ดอยู่ด้านหน้าของแผ่นเสียง */
        }
        
        /* Vinyl Animation - ทำให้ช้าลงและอยู่หลังการ์ด */
        .vinyl-disc-animation {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 1; /* ให้ z-index ต่ำกว่าการ์ด */
          opacity: 0;
          pointer-events: none;
          transition: all 2.4s cubic-bezier(0.34, 1.56, 0.64, 1); /* 0.8s * 3 = 2.4s */
        }
        
        .vinyl-disc-animation.vinyl-appear {
          opacity: 1;
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
      `}</style>
    </div>
  );
};

export default CDCardCarousel;