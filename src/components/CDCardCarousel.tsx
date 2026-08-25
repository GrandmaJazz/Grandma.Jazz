// frontend/src/components/CDCardCarousel.tsx
'use client';

import type React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { getFileUrl } from '@/utils/fileHelper';
import { cleanDisplayTitle } from '@/utils/helpers';
import LogoLoadingSpinner from './LogoLoadingSpinner';

// Define types
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

interface CDCardCarouselProps {
  onCardClick?: (card: Card) => void;
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

const CDCardCarousel: React.FC<CDCardCarouselProps> = ({ onCardClick }) => {
  // State variables
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasSelected, setHasSelected] = useState<boolean>(false);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [screenSize, setScreenSize] = useState<ScreenSize>(ScreenSize.MD);
  const [cards, setCards] = useState<Card[]>([]);

  // Which real card sits at the front of the fan. Everything else is a
  // signed distance from this index (see `delta` below), wrapped around
  // the card count — so cycling forward/back is just modulo arithmetic,
  // with nothing that can run out of sync the way a padded/looped Swiper
  // instance could (see the replaced implementation's history for what
  // that looked like: effect:'cards' + loop:true is a confirmed-fragile
  // upstream combo — a slide's "active" transform could land fully off
  // -canvas mid-gesture while a stale neighbor kept rendering in its
  // place, especially after a direction change mid-swipe. No loop
  // bookkeeping here means no failure mode shaped like that one).
  const [activeIndex, setActiveIndex] = useState(0);

  // Distinguishes a drag release from a real click on the same pointer
  // sequence, same pattern MusicPlayer.tsx uses for its own draggable
  // card.
  const draggedRef = useRef(false);

  // Animation state tracking
  const [animationStage, setAnimationStage] = useState<'idle' | 'vinylAppear' | 'vinylRise' | 'vinylFade' | 'complete'>('idle');

  // โหลดข้อมูลการ์ดจาก API
  useEffect(() => {
    const fetchCards = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/cards`);
        const data = await response.json();

        if (data.success) {
          // เรียงลำดับตาม order
          const sortedCards = data.cards.sort((a: Card, b: Card) => a.order - b.order);
          setCards(sortedCards);
        } else {
          console.error('Error fetching cards:', data.message);
        }
      } catch (error) {
        console.error('Error fetching cards:', error);
      }
    };

    fetchCards();
  }, []);

  // ตรวจสอบขนาดหน้าจอและโหลดรูปภาพ
  useEffect(() => {
    const preloadImages = async (): Promise<void> => {
      try {
        if (cards.length === 0) return;

        const imagePromises = cards.map(card => {
          return new Promise<void>((resolve, reject) => {
            const img = new Image();
            img.src = getFileUrl(card.imagePath);
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

    // หลังจากโหลดข้อมูลการ์ดเสร็จแล้วจึงเริ่ม preload รูปภาพ
    if (cards.length > 0) {
      preloadImages();
    }

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

      // กำหนดขนาดหน้าจอ
      if (width < 375) setScreenSize(ScreenSize.XS);
      else if (width < 640) setScreenSize(ScreenSize.SM);
      else if (width < 768) setScreenSize(ScreenSize.MD);
      else if (width < 1024) setScreenSize(ScreenSize.LG);
      else if (width < 1280) setScreenSize(ScreenSize.XL);
      else setScreenSize(ScreenSize.XXL);
    };

    // Using debounced function for resize events
    const debouncedUpdateScreenDimensions = debounce(updateScreenDimensions, 200);

    // ตรวจสอบขนาดหน้าจอตอนโหลดครั้งแรก
    updateScreenDimensions();

    // ตรวจสอบทุกครั้งที่มีการเปลี่ยนขนาดหน้าจอ - ใช้ debounce
    window.addEventListener('resize', debouncedUpdateScreenDimensions);

    return () => {
      window.removeEventListener('resize', debouncedUpdateScreenDimensions);
    };
  }, [cards]);

  // Move the fan forward/back by one card, wrapping around either end.
  const advance = useCallback((dir: 1 | -1) => {
    if (cards.length < 2) return;
    setActiveIndex((prev) => (prev + dir + cards.length) % cards.length);
  }, [cards.length]);

  // ฟังก์ชันจัดการเมื่อคลิกการ์ด - เพิ่มการเฟดของแผ่นเสียง
  const handleCardClick = useCallback((card: Card): void => {
    if (hasSelected || animationStage !== 'idle') return;

    setSelectedCard(card);
    setHasSelected(true);

    // แสดงแผ่นเสียงทันที
    setAnimationStage('vinylAppear');

    // รอให้แผ่นเสียงปรากฏเต็มตัว แล้วค่อยเริ่มยกขึ้น
    setTimeout(() => {
      setAnimationStage('vinylRise');

      // รอให้แผ่นเสียงลอยขึ้นระยะหนึ่ง แล้วเริ่มเฟดเอาท์
      setTimeout(() => {
        setAnimationStage('vinylFade');

        // รอให้แผ่นเสียงเฟดเอาท์เสร็จ
        setTimeout(() => {
          setAnimationStage('complete');

          // ปิดหน้าจอและส่งข้อมูลการ์ดไปยัง parent component
          if (onCardClick) {
            onCardClick(card);
          }

          // รีเซ็ตสถานะ
          setTimeout(() => {
            setHasSelected(false);
            setSelectedCard(null);
            setAnimationStage('idle');
          }, 100);
        }, 800);
      }, 600);
    }, 0);

  }, [hasSelected, animationStage, onCardClick]);

  // กำหนดขนาด container ตามขนาดหน้าจอ
  const getStackSize = () => {
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
        <LogoLoadingSpinner width={200} />
      </div>
    );
  }

  // ถ้าไม่มีการ์ด แสดงข้อความแจ้งเตือน
  if (cards.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center h-full w-full">
        <div className="text-[#B49B73] text-xl mb-4">ไม่พบการ์ดเพลง</div>
        <div className="text-[#F5F1E6] text-sm">
          กรุณาเพิ่มการ์ดเพลงในระบบแอดมิน
        </div>
      </div>
    );
  }

  const rotateStep = screenSize <= ScreenSize.SM ? 2 : 3;

  return (
    <div className="w-full py-8 px-4 md:px-6 lg:px-8 relative">
      {/* Title Section */}
      <div className="mb-8 text-center opacity-0 animate-[fadeIn_0.8s_ease-out_forwards]">
        <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl text-[#B49B73] font-semibold mb-2">
          Set the mood with me, dear.
        </h2>
        <div className="flex items-center justify-center space-x-2">
          <div className="h-px w-8 sm:w-10 md:w-12 bg-[#9C6554]"></div>
          <span className="text-xs sm:text-sm text-[#F5F1E6] italic">A different feeling behind each card.</span>
          <div className="h-px w-8 sm:w-10 md:w-12 bg-[#9C6554]"></div>
        </div>
      </div>

      {/* Vinyl Animation - ตำแหน่งสัมพัทธ์กับ container */}
      {selectedCard && (
        <div
          className={`vinyl-disc-animation ${
            animationStage === 'vinylAppear' ? 'vinyl-appear' :
            animationStage === 'vinylRise' ? 'vinyl-appear vinyl-rise' :
            animationStage === 'vinylFade' || animationStage === 'complete' ? 'vinyl-appear vinyl-rise vinyl-fade' : ''
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

      {/* Card fan — a hand-of-cards stack driven entirely by activeIndex,
          not a carousel library. Every card is always mounted (stable
          key = card._id) so Framer Motion's `animate` prop smoothly
          interpolates each one from its old fan position to its new one
          whenever activeIndex changes, in either direction, including
          wraparound — there's no separate "loop mode" to fall out of
          sync with what's rendered. */}
      <div className="flex justify-center items-center w-full relative z-10">
        <div className={`opacity-0 animate-[fadeIn_0.8s_ease-out_0.3s_forwards] relative ${getStackSize()}`}>
          {cards.map((card, i) => {
            let delta = i - activeIndex;
            const n = cards.length;
            if (delta > n / 2) delta -= n;
            if (delta < -n / 2) delta += n;

            const absDelta = Math.abs(delta);
            const isFront = delta === 0;
            const isEdge = absDelta === 1;
            const interactive = !hasSelected && (isFront || isEdge);

            return (
              <motion.div
                key={card._id}
                className={`absolute inset-0 flex items-center justify-center rounded-box overflow-hidden bg-[#0A0A0A] shadow-lg border-[1.5px] border-[rgba(216,192,138,0.4)] ${
                  isFront && !hasSelected ? 'cursor-grab active:cursor-grabbing' : isEdge && !hasSelected ? 'cursor-pointer' : ''
                }`}
                style={{
                  zIndex: 100 - absDelta,
                  pointerEvents: interactive ? 'auto' : 'none',
                }}
                initial={false}
                animate={{
                  x: delta * 8,
                  rotate: delta * rotateStep,
                  scale: 1 - absDelta * 0.03,
                }}
                transition={{ type: 'spring', damping: 26, stiffness: 260 }}
                drag={isFront && !hasSelected ? 'x' : false}
                dragElastic={0.6}
                dragMomentum={false}
                onDragStart={() => { draggedRef.current = true; }}
                onDragEnd={(_e, info) => {
                  const OFFSET_THRESHOLD = 80;
                  const VELOCITY_THRESHOLD = 500;
                  if (info.offset.x < -OFFSET_THRESHOLD || info.velocity.x < -VELOCITY_THRESHOLD) {
                    advance(1);
                  } else if (info.offset.x > OFFSET_THRESHOLD || info.velocity.x > VELOCITY_THRESHOLD) {
                    advance(-1);
                  }
                  setTimeout(() => { draggedRef.current = false; }, 0);
                }}
                onClick={() => {
                  if (hasSelected) return;
                  if (isFront) {
                    if (draggedRef.current) { draggedRef.current = false; return; }
                    handleCardClick(card);
                  } else if (isEdge) {
                    advance(delta > 0 ? 1 : -1);
                  }
                }}
                whileHover={isFront && !hasSelected ? { scale: 1.05 } : undefined}
                whileTap={isFront && !hasSelected ? { scale: 0.95 } : undefined}
              >
                <div className="relative w-full h-full">
                  {/* Card Image */}
                  <img
                    src={getFileUrl(card.imagePath)}
                    alt={cleanDisplayTitle(card.title)}
                    className="w-full h-full object-cover filter-[sepia(10%)_contrast(110%)_brightness(90%)]"
                    draggable="false"
                    loading="lazy"
                  />

                  {/* Film grain overlay */}
                  <div className="absolute inset-0 pointer-events-none opacity-20 mix-blend-overlay bg-[url('data:image/svg+xml,%3Csvg viewBox=%270 0 200 200%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27noiseFilter%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.8%27 numOctaves=%274%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23noiseFilter)%27/%3E%3C/svg%3E')] bg-repeat bg-[size:150px]"></div>

                  {/* Worn edges effect */}
                  <div className="absolute inset-0 pointer-events-none opacity-10 bg-[url('data:image/svg+xml,%3Csvg width=%27100%25%27 height=%27100%25%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cdefs%3E%3Cfilter id=%27scratches%27 x=%270%27 y=%270%27 width=%27100%25%27 height=%27100%25%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.1%27 numOctaves=%275%27 stitchTiles=%27stitch%27 result=%27noise%27/%3E%3CfeDisplacementMap in=%27SourceGraphic%27 in2=%27noise%27 scale=%275%27 xChannelSelector=%27R%27 yChannelSelector=%27G%27/%3E%3C/filter%3E%3C/defs%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23scratches)%27 fill=%27none%27/%3E%3C/svg%3E')]"></div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Tutorial Message */}
      <div className="mt-8 text-center opacity-0 animate-[fadeIn_0.8s_ease-out_1s_forwards]">
        {!hasSelected && (
          <div className="animate-[float_3s_ease-in-out_infinite]">
            <div className="flex items-center justify-center">
              <span className="text-[#B49B73] text-base sm:text-lg mr-2">♪</span>
              <p className="text-base sm:text-lg text-[#F5F1E6]">
                Flip till something feels right.
              </p>
              <span className="text-[#B49B73] text-base sm:text-lg ml-2">♪</span>
            </div>
          </div>
        )}
      </div>

      {/* CSS */}
      <style jsx global>{`
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
          background: linear-gradient(145deg, #B49B73, #9C6554);
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
