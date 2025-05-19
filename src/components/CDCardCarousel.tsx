'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  onStartLoading?: () => void;
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

// ข้อมูลการ์ด - Jazz theme
const ORIGINAL_CARDS: CardData[] = [
  { id: 1, imagePath: "/images/vinyl7.webp", title: "Beachside Swing", artist: "The Island Crooners", year: "1961" },
  { id: 2, imagePath: "/images/vinyl2.webp", title: "Silky Sax Sessions", artist: "Lady Ella & The Rhythm Kings", year: "1962" },
  { id: 3, imagePath: "/images/vinyl3.webp", title: "Monsoon Blues", artist: "Phuket Jazz Ensemble", year: "1965" },
  { id: 4, imagePath: "/images/vinyl4.webp", title: "Tropical Nocturne", artist: "The Golden Palms Trio", year: "1953" },
  { id: 5, imagePath: "/images/vinyl5.webp", title: "Breezy Melodies", artist: "Grandma's Favorites", year: "1957" },
  { id: 6, imagePath: "/images/vinyl6.webp", title: "Beachside Swing", artist: "The Island Crooners", year: "1961" },
  { id: 7, imagePath: "/images/vinyl1.webp", title: "Midnight in Bangkok", artist: "The Siam Quartet", year: "1958" }
];

// สร้างฟังก์ชันเพื่อ preload รูปภาพ
const preloadImages = async (imageUrls: string[]): Promise<void> => {
  try {
    const imagePromises = imageUrls.map(url => {
      return new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.src = url;
        img.onload = () => resolve();
        img.onerror = () => resolve(); // ทำงานต่อแม้โหลดรูปไม่สำเร็จ
      });
    });
    
    await Promise.all(imagePromises);
  } catch (error) {
    console.error('Error preloading images:', error);
  }
};

// แยก style ที่ใช้บ่อยออกมาเพื่อลดการคำนวณซ้ำ
const COMMON_STYLES = {
  noiseOverlay: {
    backgroundImage: `url('data:image/svg+xml,%3Csvg viewBox=%270 0 200 200%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27noiseFilter%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.8%27 numOctaves=%274%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23noiseFilter)%27/%3E%3C/svg%3E')`,
    backgroundRepeat: 'repeat',
    backgroundSize: '150px 150px'
  }
};

const CDCardCarousel: React.FC<CDCardCarouselProps> = ({ onCardClick, onStartLoading }) => {
  // State variables
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasSelected, setHasSelected] = useState<boolean>(false);
  const [selectedCard, setSelectedCard] = useState<CardData | null>(null);
  const [screenSize, setScreenSize] = useState<ScreenSize>(ScreenSize.MD);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [animationStage, setAnimationStage] = useState<'idle' | 'vinylAppear' | 'vinylRise' | 'vinylFade' | 'complete'>('idle');
  
  // References
  const swiperRef = useRef<SwiperType | null>(null);
  
  // CSS modules - แยกเพื่อไม่ต้องสร้างใหม่ทุกครั้ง
  const [cssInserted, setCssInserted] = useState(false);
  
  // ใช้ useEffect เพื่อเพิ่ม CSS เพียงครั้งเดียว
  useEffect(() => {
    if (cssInserted) return;
    
    // สร้าง style element สำหรับ animations
    const style = document.createElement('style');
    style.textContent = `
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
    `;
    document.head.appendChild(style);
    setCssInserted(true);
    
    return () => {
      document.head.removeChild(style);
    };
  }, [cssInserted]);

  // ตรวจสอบขนาดหน้าจอและโหลดรูปภาพ
  useEffect(() => {
    // โหลดรูปภาพล่วงหน้า
    const loadResources = async () => {
      try {
        // Preload รูปภาพทั้งหมด
        await preloadImages(ORIGINAL_CARDS.map(card => card.imagePath));
        setTimeout(() => setIsLoading(false), 300);
      } catch (error) {
        console.error('Error loading resources:', error);
        setIsLoading(false);
      }
    };

    loadResources();
    
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
    
    // ตรวจสอบทุกครั้งที่มีการเปลี่ยนขนาดหน้าจอ - ใช้ passive listener
    window.addEventListener('resize', debouncedUpdateScreenDimensions, { passive: true });
    window.addEventListener('orientationchange', updateScreenDimensions, { passive: true });
    
    return () => {
      window.removeEventListener('resize', debouncedUpdateScreenDimensions);
      window.removeEventListener('orientationchange', updateScreenDimensions);
    };
  }, []);

  // ฟังก์ชันจัดการเมื่อคลิกการ์ด - คงแอนิเมชันแบบเดิม
  const handleCardClick = useCallback((card: CardData): void => {
    if (hasSelected || animationStage !== 'idle') return;
    
    setSelectedCard(card);
    setHasSelected(true);
    
    // เรียกใช้ onStartLoading ทันทีหลังจากกดการ์ด เพื่อเริ่มโหลดโมเดล 3D
    if (onStartLoading) {
      onStartLoading();
    }
    
    // แสดงแผ่นเสียงทันที (ไม่มีการขยายการ์ด)
    setAnimationStage('vinylAppear');
    
    // รอให้แผ่นเสียงปรากฏเต็มตัว แล้วค่อยเริ่มยกขึ้น - คงแบบเดิมโดยใช้ setTimeout แยกกัน
    setTimeout(() => {
      setAnimationStage('vinylRise');
      
      // รอให้แผ่นเสียงลอยขึ้นระยะหนึ่ง แล้วเริ่มเฟดเอาท์
      setTimeout(() => {
        setAnimationStage('vinylFade');
        
        // รอให้แผ่นเสียงเฟดเอาท์เสร็จ
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
        }, 500);
      }, 600); 
    }, 0);
    
  }, [hasSelected, animationStage, onCardClick, onStartLoading]);

  // กำหนดขนาด Swiper คอนเทนเนอร์ตามขนาดหน้าจอ - ใช้ useMemo
  const getSwiperSize = useMemo(() => {
    if (screenSize === ScreenSize.XS) return 'w-72 h-72';
    else if (screenSize === ScreenSize.SM) return 'w-80 h-80';
    else if (screenSize === ScreenSize.MD) return 'w-96 h-96';
    else if (screenSize === ScreenSize.LG) return 'w-[450px] h-[450px]';
    else return 'w-[500px] h-[500px]';
  }, [screenSize]);

  // ปรับขนาด vinyl - ใช้ useMemo
  const getVinylSize = useMemo((): string => {
    if (screenSize === ScreenSize.XS) return '200px';
    else if (screenSize === ScreenSize.SM) return '250px';
    else if (screenSize === ScreenSize.MD) return '300px';
    else if (screenSize === ScreenSize.LG) return '380px';
    else return '420px';
  }, [screenSize]);
  
  // ใช้ useMemo สำหรับ cardsEffect options
  const cardsEffectOptions = useMemo(() => ({
    slideShadows: true,
    perSlideOffset: 8, 
    perSlideRotate: screenSize <= ScreenSize.SM ? 2 : 3,
    rotate: true,
  }), [screenSize]);
  
  // สร้าง style สำหรับ vinyl animation - คงแบบเดิม
  const vinylAnimationStyle = useMemo(() => {
    let style: React.CSSProperties = {
      width: animationStage === 'idle' ? '0' : getVinylSize,
      height: animationStage === 'idle' ? '0' : getVinylSize
    };
    
    return style;
  }, [animationStage, getVinylSize]);
  
  // สร้าง vinyl animation classes ด้วย useMemo
  const vinylAnimationClass = useMemo(() => {
    let className = 'vinyl-disc-animation ';
    
    if (animationStage === 'vinylAppear') {
      className += 'vinyl-appear';
    } else if (animationStage === 'vinylRise') {
      className += 'vinyl-appear vinyl-rise';
    } else if (animationStage === 'vinylFade' || animationStage === 'complete') {
      className += 'vinyl-appear vinyl-rise vinyl-fade';
    }
    
    return className;
  }, [animationStage]);

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

      {/* Vinyl Animation - คงค่าแอนิเมชันแบบเดิม */}
      {selectedCard && (
        <div 
          className={vinylAnimationClass}
          style={vinylAnimationStyle}
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
          initialSlide={3} 
          className={`opacity-0 animate-[fadeIn_0.8s_ease-out_0.3s_forwards] ${getSwiperSize} vinyl-swiper`}
          cardsEffect={cardsEffectOptions}
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
                {/* Card Image - ปรับปรุงประสิทธิภาพแต่คงรูปแบบเดิม */}
                <img 
                  src={card.imagePath} 
                  alt={`${card.title} by ${card.artist}`}
                  className="w-full h-full object-cover filter-[sepia(10%)_contrast(110%)_brightness(90%)]"
                  draggable="false"
                  loading="lazy"
                  width={500}
                  height={500}
                />
                
                {/* Film grain overlay */}
                <div 
                  className="absolute inset-0 pointer-events-none opacity-20 mix-blend-overlay"
                  style={COMMON_STYLES.noiseOverlay}
                ></div>
                
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

      {/* CSS - คงค่าแอนิเมชันแบบเดิม */}
      <style jsx global>{`
        /* Base Styles */
        .vinyl-swiper {
          z-index: 10; /* การ์ดอยู่ด้านหน้าของแผ่นเสียง */
          contain: layout; /* ช่วยในการ rendering */
        }
        
        /* Vinyl Animation - คงแบบเดิมเพื่อการเคลื่อนไหวที่เหมือนเดิม */
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
          transform: translate(-50%, -150%);
          transition: transform 3.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 2.4s ease-in; /* ลดเวลาลง */
        }
        
        /* เพิ่ม class ใหม่สำหรับการเฟดเอาท์ */
        .vinyl-disc-animation.vinyl-fade {
          opacity: 0;
          transition: opacity 2.5s ease-out, transform 5s cubic-bezier(0.34, 1.56, 0.64, 1);
          transform: translate(-50%, -300%) scale(0.5); /* เพิ่ม scale ลงเพื่อให้ดูเล็กลงขณะเฟดเอาท์ */
        }
        
        .vinyl-disc {
          position: relative;
          width: 100%;
          height: 100%;
          background: #0A0A0A;
          border-radius: 50%;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.4);
          animation: vinylRotate 12s linear infinite; /* 4s * 3 = 12s */
          contain: content;
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
      `}</style>
    </div>
  );
};

// ใช้ React.memo เพื่อลดการ render ที่ไม่จำเป็น
export default React.memo(CDCardCarousel);