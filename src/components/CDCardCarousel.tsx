// frontend/src/components/CDCardCarousel.tsx
'use client';

import type React from 'react';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCards } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';
import { getAlbumAccentColor, getAlbumArtworkUrl } from '@/lib/albumArtwork';
import { createAlbumSwipeArea } from './albumSwipeArea';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { loadMusicCatalogue } from '@/lib/musicCatalogue';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/effect-cards';

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
  /** Fired once cards + cover images are loaded, so the parent can retire
   *  the single hero loading logo and reveal the albums (no 2nd logo here). */
  onReady?: () => void;
  onUnavailable?: () => void;
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

const CDCardCarousel: React.FC<CDCardCarouselProps> = ({ onCardClick, onReady, onUnavailable }) => {
  // State variables
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasSelected, setHasSelected] = useState<boolean>(false);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [screenSize, setScreenSize] = useState<ScreenSize>(ScreenSize.MD);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [cards, setCards] = useState<Card[]>([]);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [failedCovers, setFailedCovers] = useState<Set<string>>(() => new Set());
  const [stackReady, setStackReady] = useState(false);

  // Swiper's cards-effect + loop combo has a confirmed upstream bug: with
  // fewer than 7 real slides, reverse-direction dragging runs out of
  // correctly-positioned loop clones after a handful of swipes and
  // glitches/resets (forward direction looks fine, which is what made
  // this easy to miss during initial testing). Padding the rendered slide
  // list to at least 7 — by repeating the real cards round-robin — keeps
  // Swiper safely above that threshold regardless of how many cards exist
  // in the admin panel, without changing which card actually gets
  // selected on click (each duplicate still points at the same real Card
  // object).
  const loopSafeCards = useMemo(() => {
    if (cards.length === 0 || cards.length >= 7) return cards;
    const padded: Card[] = [];
    while (padded.length < 7) padded.push(...cards);
    return padded;
  }, [cards]);
  const initialSlide = Math.min(Math.floor(loopSafeCards.length / 2), 3);
  const openingCards = useMemo(() => new Set([-1, 0, 1].map(offset =>
    loopSafeCards[(initialSlide + offset + loopSafeCards.length) % loopSafeCards.length]?._id
  )), [loopSafeCards, initialSlide]);

  // Animation state tracking
  const [animationStage, setAnimationStage] = useState<'idle' | 'vinylAppear' | 'vinylRise' | 'vinylFade' | 'complete'>('idle');
  
  // References
  const swiperRef = useRef<SwiperType | null>(null);
  const stackFrame = useRef(0);
  // Swiper can measure before its dynamic CSS/visible parent has settled,
  // leaving the normal horizontal slide layout in Safari. Re-measure in a
  // laid-out frame and reveal only the finished cards effect, never that row.
  const settleStack = useCallback((swiper: SwiperType) => {
    cancelAnimationFrame(stackFrame.current);
    stackFrame.current = requestAnimationFrame(() => {
      if (swiper.destroyed) return;
      swiper.update();
      stackFrame.current = requestAnimationFrame(() => {
        if (!swiper.destroyed && swiper.width > 0) setStackReady(true);
      });
    });
  }, []);
  useEffect(() => () => cancelAnimationFrame(stackFrame.current), []);
  const selectionTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => selectionTimers.current.forEach(clearTimeout), []);
  const selectionLock = useRef(hasSelected);selectionLock.current=hasSelected;
  const swipeArea = useMemo(()=>createAlbumSwipeArea(()=>swiperRef.current,()=>selectionLock.current),[]);

  // If the music service is slow or unavailable, reveal the homepage.
  useEffect(() => {
    if (!isLoading) {
      if (cards.length && stackReady) onReady?.();
      else if (!cards.length) onUnavailable?.();
    }
  }, [isLoading, cards.length, stackReady, onReady, onUnavailable]);

  // โหลดข้อมูลการ์ดจาก API
  useEffect(() => {
    let active = true;
    const fetchCards = async () => {
      try {
        const sortedCards = await loadMusicCatalogue(loadAttempt > 0);
        if (!active) return;
        setCards(sortedCards);
        if (sortedCards.length === 0) setIsLoading(false);
      } catch (error) {
        if (active) {
          console.error('Error fetching cards:', error);
          setIsLoading(false);
        }
      }
    };
    
    fetchCards();
    return () => {
      active = false;
    };
  }, [loadAttempt]);

  // ตรวจสอบขนาดหน้าจอและโหลดรูปภาพ
  useEffect(() => {
    let active = true;
    const images: HTMLImageElement[] = [];
    let readyTimer: ReturnType<typeof setTimeout> | undefined;
    const preloadImages = async (): Promise<void> => {
      try {
        if (cards.length === 0) return;

        const load = (card: Card) =>
          new Promise<void>(resolve => {
            const img = new Image();
            images.push(img);
            img.fetchPriority = openingCards.has(card._id) ? 'high' : 'low';
            img.onload = () => {
              if (active) setFailedCovers(previous => {
                if (!previous.has(card._id)) return previous;
                const next = new Set(previous); next.delete(card._id); return next;
              });
              resolve();
            };
            img.onerror = () => {
              if (active) setFailedCovers(previous => previous.has(card._id) ? previous : new Set(previous).add(card._id));
              resolve();
            };
            img.src = getAlbumArtworkUrl(card.imagePath);
          });

        // PERF: the old code awaited Promise.all() over EVERY cover before
        // handing off from the hero loading logo, so the slowest cover gated
        // the whole reveal. The cards-effect carousel only ever shows the
        // centre slide plus two neighbours, so gate on those three and let the
        // rest stream in behind — same animation, it just starts sooner.
        // The opening slide is index 3, not index 0. Safari can defer a lazy
        // image inside a transformed slide even when its frame is visible.
        const firstPaint = cards.filter(card => openingCards.has(card._id)).map(load);
        const rest = cards.filter(card => !openingCards.has(card._id)).map(load);

        // A stalled cover must not trap visitors behind the loading mark.
        await Promise.race([
          Promise.all(firstPaint),
          new Promise<void>(resolve => { readyTimer = setTimeout(resolve, 5000); }),
        ]);
        clearTimeout(readyTimer);
        if (active) setIsLoading(false);
        void Promise.all(rest);
      } catch (error) {
        console.error('Error preloading images:', error);
        if (active) setIsLoading(false);
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
      active = false;
      clearTimeout(readyTimer);
      images.forEach(image => { image.onload = null; image.onerror = null; });
      window.removeEventListener('resize', debouncedUpdateScreenDimensions);
      window.removeEventListener('orientationchange', updateScreenDimensions);
    };
  }, [cards, openingCards]);

  // ฟังก์ชันจัดการเมื่อคลิกการ์ด - เพิ่มการเฟดของแผ่นเสียง
  const handleCardClick = useCallback((card: Card): void => {
    if (hasSelected || animationStage !== 'idle') return;
    const schedule = (callback: () => void, delay: number) => {
      selectionTimers.current.push(setTimeout(callback, delay));
    };
    
    setSelectedCard(card);
    setHasSelected(true);
    
    // แสดงแผ่นเสียงทันที
    setAnimationStage('vinylAppear');
    
    // รอให้แผ่นเสียงปรากฏเต็มตัว แล้วค่อยเริ่มยกขึ้น
    schedule(() => {
      setAnimationStage('vinylRise');
      
      // รอให้แผ่นเสียงลอยขึ้นระยะหนึ่ง แล้วเริ่มเฟดเอาท์
      schedule(() => {
        setAnimationStage('vinylFade');
        
        // รอให้แผ่นเสียงเฟดเอาท์เสร็จ
        schedule(() => {
          setAnimationStage('complete');
          
          // ปิดหน้าจอและส่งข้อมูลการ์ดไปยัง parent component
          if (onCardClick) {
            onCardClick(card);
          }
          
          // รีเซ็ตสถานะ
          schedule(() => {
            setHasSelected(false);
            setSelectedCard(null);
            setAnimationStage('idle');
          }, 100);
        }, 800);
      }, 600); 
    }, 0); 
    
  }, [hasSelected, animationStage, onCardClick]);

  // กำหนดขนาด Swiper คอนเทนเนอร์ตามขนาดหน้าจอ
  // ปรับขนาด vinyl (แผ่นเสียง)
  const getVinylSize = (): string => {
    // คำนวณขนาดตามหน้าจอ - ปรับให้ใหญ่ขึ้นประมาณ 80-85% ของขนาดการ์ด
    if (screenSize === ScreenSize.XS) return '200px';
    else if (screenSize === ScreenSize.SM) return '250px';
    else if (screenSize === ScreenSize.MD) return '300px';
    else if (screenSize === ScreenSize.LG) return '380px';
    else return '420px';
  };

  // While loading, render NOTHING visible. The single hero logo (held open
  // by page.tsx until onReady fires) covers this moment, so there is never a
  // second loading logo starting up here.
  if (isLoading) {
    return loadAttempt > 0
      ? <p className="text-center text-[#F5F1E6]" role="status">Finding the records…</p>
      : <div className="h-full w-full" aria-hidden="true" />;
  }

  // The parent reveals the homepage if the music service is unavailable.
  if (cards.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center gap-5 px-6 text-center text-[#F5F1E6]" role="status">
        <p className="text-[#B49B73] text-xl">The records aren’t ready just yet.</p>
        <p className="text-sm">Try again, or come on in without the music.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <button type="button" className="gj-cta" onClick={() => {
            setIsLoading(true);
            setLoadAttempt(attempt => attempt + 1);
          }}>Try again</button>
          <button type="button" className="gj-cta gj-cta--quiet" onClick={onUnavailable}>Continue without music</button>
        </div>
      </div>
    );
  }

  return (
    <div className="gj-album-picker w-full px-4 md:px-6 lg:px-8 relative">
      {/* Title Section */}
      <div className="gj-album-heading text-center opacity-0 animate-[fadeIn_0.45s_ease-out_forwards]">
        <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl text-[#B49B73] font-semibold mb-2">
          Set the mood with me, dear.
        </h2>
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
          <div className="vinyl-disc" style={{ color: getAlbumAccentColor(selectedCard.imagePath) }}>
            {/* Vinyl grooves */}
            <div className="vinyl-groove vinyl-groove-1"></div>
            <div className="vinyl-groove vinyl-groove-2"></div>
            <div className="vinyl-groove vinyl-groove-3"></div>
            
            {/* Center label */}
            <div className="vinyl-label">
              <img src={getAlbumArtworkUrl(selectedCard.imagePath)} alt="" aria-hidden="true" draggable={false} decoding="async" />
              <div className="vinyl-hole"></div>
            </div>
          </div>
        </div>
      )}

      {/* Swiper Carousel */}
      <div className="gj-album-swipe-area" onPointerDown={swipeArea.onPointerDown}>
      <div className="flex justify-center items-center w-full relative z-10">
        <Swiper
          onSwiper={(swiper) => {
            swiperRef.current = swiper;
            settleStack(swiper);
          }}
          onResize={settleStack}
          effect={'cards'}
          touchEventsTarget="container"
          grabCursor={!hasSelected}
          modules={[EffectCards]}
          // Endless flicking in either direction — matches the "keep going
          // forever" swipe feel used by the quotes carousel elsewhere on
          // the page, applied here via Swiper's own loop mode (this
          // carousel's fanned/rotated "cards" visual comes from Swiper's
          // EffectCards module, not a native-scroll container, so the loop
          // lives in Swiper rather than a tripled-content/rewind trick).
          //
          // CONFIRMED upstream Swiper bug, not a config tweak: effect:
          // 'cards' + loop: true glitches specifically when there are
          // fewer than 7 real slides — reverse-direction dragging runs out
          // of correctly-positioned loop clones after a few swipes and
          // resets/skips, while the forward direction (which this repo's 6
          // real cards happened to exercise first) looks fine. Confirmed
          // via Swiper's own realIndex through repeated slidePrev() calls
          // on the un-padded 6-card array: the sequence was already
          // non-monotonic/erratic, not a clean wraparound. Same root cause
          // as the "tripled content" padding the quotes carousel uses for
          // its own loop illusion — pad the slide COUNT (not just enable
          // loop) so Swiper always has enough real DOM slides to loop
          // cleanly, regardless of how many cards are configured in the
          // admin panel later.
          loop={cards.length > 1}
          initialSlide={initialSlide}
          className="gj-album-stack opacity-0 animate-[fadeIn_0.45s_ease-out_0.08s_forwards] vinyl-swiper"
          style={{ visibility: stackReady ? 'visible' : 'hidden' }}
          cardsEffect={{
            slideShadows: true,
            perSlideOffset: 8,
            perSlideRotate: screenSize === ScreenSize.XS || screenSize === ScreenSize.SM ? 2 : 3,
            rotate: true,
          }}
        >
          {loopSafeCards.map((card, i) => (
            <SwiperSlide
              key={`${card._id}-${i}`}
              className="flex items-center justify-center rounded-[18px] overflow-hidden bg-[#0A0A0A] shadow-lg border-[3px] border-white"
              role="button"
              tabIndex={hasSelected ? -1 : 0}
              aria-label={card.title === 'Music Card' ? `Play record ${i % cards.length + 1}` : `Play ${card.title}`}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); handleCardClick(card); }
              }}
              onClick={() => handleCardClick(card)}
            >
              <div 
                className={`relative w-full h-full ${selectedCard?._id === card._id ? 'selected-card' : ''}`}
                style={{ pointerEvents: hasSelected ? 'none' : 'auto' }}
              >
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#0A0A0A] px-6 text-center text-[#B49B73]" aria-hidden="true">
                  <span className="font-editorial-ultralight text-3xl">{card.title === 'Music Card' ? 'A little music.' : card.title}</span>
                  <span className="font-label-mono text-xs tracking-[.15em]">Tap to play</span>
                </div>
                {/* Card Image */}
                {/* Eager images avoid Safari deferring transformed covers.
                    Prioritise the actual opening record and its neighbours;
                    decode asynchronously so a swipe never waits on decoding. */}
                <img 
                  src={getAlbumArtworkUrl(card.imagePath)}
                  alt={card.title}
                  className="relative w-full h-full object-cover filter-[sepia(10%)_contrast(110%)_brightness(90%)]"
                  style={{ visibility: failedCovers.has(card._id) ? 'hidden' : 'visible' }}
                  onError={() => setFailedCovers(previous => previous.has(card._id) ? previous : new Set(previous).add(card._id))}
                  draggable="false"
                  loading="eager"
                  fetchPriority={openingCards.has(card._id) ? 'high' : 'low'}
                  decoding="async"
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

      {/* A small motion cue makes the card stack's swipe behavior clear. */}
      <div className="gj-album-cue text-center opacity-0 animate-[fadeIn_0.45s_ease-out_0.4s_forwards]">
        {!hasSelected && (
          <div className="flex flex-col items-center gap-2 text-[#B49B73]" aria-label="Swipe the album covers left or right, then tap one to play">
            <div className="flex items-center gap-3 text-xl" aria-hidden="true">
              <ArrowLeft className="h-5 w-5" strokeWidth={1.5} />
              <span className="gj-swipe-cue inline-flex h-4 w-4 items-center justify-center rounded-full border-[1.5px] border-current animate-[gjSwipeCue_2.6s_ease-in-out_infinite]"><span className="h-2.5 w-2.5 rounded-full bg-current" /></span>
              <ArrowRight className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <span className="font-label-mono text-xs tracking-[.15em] text-[#F5F1E6]/70">Swipe · tap to play</span>
          </div>
        )}
      </div>
      </div>

      {/* CSS */}
      <style jsx global>{`
        /* Base Styles */
        .vinyl-swiper {
          z-index: 10; /* การ์ดอยู่ด้านหน้าของแผ่นเสียง */
        }
        .gj-album-picker {
          display:flex; flex-direction:column; align-items:center;
          justify-content:center; gap:clamp(24px,5svh,48px);
          min-height: min(84svh,850px); padding-block:24px;
        }
        .gj-album-heading { flex-shrink:0; }
        .gj-album-heading h2 { margin:0; }
        .gj-album-stack {
          width:min(500px,80vw,calc(100svh - 240px)); height:min(500px,80vw,calc(100svh - 240px));
        }
        .gj-album-cue { margin-top:clamp(24px,4svh,40px); }
        .gj-album-swipe-area {
          width:calc(100% + 32px); margin:-32px -16px -40px;
          padding:32px 16px 40px; box-sizing:border-box;
          touch-action:pan-y; -webkit-user-select:none; user-select:none;
        }
        @media (prefers-reduced-motion:reduce) {
          .gj-album-heading,.gj-album-stack,.gj-album-cue { animation:none; opacity:1; }
          .gj-album-picker .swiper-wrapper,.gj-album-picker .swiper-slide { transition-duration:0ms !important; }
          .vinyl-disc-animation,.vinyl-disc { animation:none; transition:none; }
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
          transition: opacity 0.18s ease-out;
        }
        
        .vinyl-disc-animation.vinyl-appear {
          opacity: 1;
        }
        
        .vinyl-disc-animation.vinyl-rise {
          transform: translate(-50%, -150%);
          transition: transform 0.6s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.18s ease-out;
        }
        
        /* เพิ่ม class ใหม่สำหรับการเฟดเอาท์ */
        .vinyl-disc-animation.vinyl-fade {
          opacity: 0;
          transition: opacity 0.75s ease-out, transform 0.75s cubic-bezier(0.4, 0, 0.2, 1);
          transform: translate(-50%, -200%) scale(0.82);
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
          border: 1px solid currentColor;
          opacity: 0.2;
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
          top: 34%;
          left: 34%;
          right: 34%;
          bottom: 34%;
          background: #0A0A0A;
          border: 1px solid currentColor;
          border-radius: 50%;
          overflow: hidden;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .vinyl-label img {
          display: block;
          width: 80%;
          height: 80%;
          object-fit: contain;
          /* Keep the cover's printed name, with the label's circular frame.
             The square sleeve border is outside this printed-title window. */
          clip-path: inset(20% 10%);
        }
        
        .vinyl-hole {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 7%;
          height: 7%;
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
