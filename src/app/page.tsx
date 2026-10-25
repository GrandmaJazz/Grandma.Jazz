// frontend/src/app/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import HeroSection from '@/components/HeroSection';
import ProductStory from '@/components/ProductStory';
import EventBooking from '@/components/evenbooking';
import Featured from '@/components/Featured';
import LandingIntro from '@/components/LandingIntro';
import Review from '@/components/Review';
import Contact from '@/components/Contact';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { getAlbumAccentColor, getAlbumArtworkUrl } from '@/lib/albumArtwork';
import { hasCompletedHomeIntro, completeHomeIntro, restartHomeIntro } from '@/lib/homeIntro';

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
  // Plain black while the chunk loads — NOT a second logo spinner. The hero
  // already shows one spinner; flashing another identical logo here (then the
  // carousel's own data spinner) read as the loader "glitching between loads".
  // Steady black bridges to the carousel with no extra logo remount.
  loading: () => <div className="w-full h-full bg-[#0A0A0A]" />
});

// แยก CSS ที่ใช้กับทั้งหน้าออกมาเพื่อลด layout thrashing
const globalStyles = {
  noiseOverlay: {
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'repeat',
    backgroundSize: '150px 150px'
  }
};

export default function Home() {
  // State สำหรับควบคุมการแสดง HeroSection vs หน้าหลัก
  const [showHeroSection, setShowHeroSection] = useState(() => !hasCompletedHomeIntro());
  const [isSliding, setIsSliding] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // รวม state ที่เกี่ยวข้องกับไว้ด้วยกันเพื่อลด re-render
  const [uiState, setUiState] = useState({
    showCarousel: !hasCompletedHomeIntro(),
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

  // True once CDCardCarousel has loaded its cards + cover images. Used to hold
  // the single hero loading logo open until the albums are actually ready.
  const [carouselReady, setCarouselReady] = useState(false);
  
  // ใช้ context สำหรับเล่นเพลง
  const { selectCardTemporary, saveMusicCache, currentCard, setWaitingForModel, resumeWhenReady, clearMusicCache } = useMusicPlayer();

  // Safari can expose the canvas beside the page on a diagonal swipe even
  // when layout overflow is clipped. Keep those gestures on the vertical
  // page while leaving record, quote and product strips free to swipe.
  useEffect(() => {
    let startX = 0;
    let startY = 0;
    let horizontalStrip = false;
    const onStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;
      startX = event.touches[0].clientX;
      startY = event.touches[0].clientY;
      horizontalStrip = false;
      let element = event.target instanceof Element ? event.target : null;
      if (element?.closest('.gj-album-swipe-area')) {
        horizontalStrip = true;
        return;
      }
      while (element && element !== document.body) {
        const overflow = getComputedStyle(element).overflowX;
        if (element.scrollWidth > element.clientWidth + 1 && /auto|scroll/.test(overflow)) {
          horizontalStrip = true;
          break;
        }
        element = element.parentElement;
      }
    };
    const onMove = (event: TouchEvent) => {
      if (horizontalStrip || event.touches.length !== 1) return;
      const dx = Math.abs(event.touches[0].clientX - startX);
      const dy = Math.abs(event.touches[0].clientY - startY);
      if (dx > 8 && dx > dy && event.cancelable) event.preventDefault();
    };
    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchmove', onMove, { passive: false });
    return () => {
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchmove', onMove);
    };
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Keep the initial mark continuous, but expose the skip control promptly
  // even when the remote music service is waking up.
  useEffect(() => {
    if (!mounted) return;
    const timer = setTimeout(() => {
      (window as typeof window & { __gjHomeReady?: boolean }).__gjHomeReady = true;
      window.dispatchEvent(new Event('gj-home-ready'));
    }, 1200);
    return () => clearTimeout(timer);
  }, [mounted]);

  // Keep the server-rendered mark through the first visit's album request.
  // This prevents a second identical spinner from restarting its trail.
  useEffect(() => {
    if (!mounted || (showHeroSection && !carouselReady)) return;
    const frame = requestAnimationFrame(() => {
      (window as typeof window & { __gjHomeReady?: boolean }).__gjHomeReady = true;
      window.dispatchEvent(new Event('gj-home-ready'));
    });
    return () => cancelAnimationFrame(frame);
  }, [mounted, showHeroSection, carouselReady]);

  // ส่ง state ไปยัง parent (layout) เพื่อซ่อน Header
  useEffect(() => {
    if (!mounted) return; // รอจนกว่า component จะ mount เสร็จ
    
    // Trigger re-render ของ Header
    window.dispatchEvent(new CustomEvent('heroSectionChange', { detail: showHeroSection }));
  }, [showHeroSection, mounted]);

  // ฟัง event เมื่อแคชเพลงถูกล้าง
  useEffect(() => {
    const handleMusicCacheCleared = () => {
      console.log("ได้รับแจ้งว่าแคชเพลงถูกล้าง - รีเซ็ต state");
      setCardSelected(false);
    };

    window.addEventListener('musicCacheCleared', handleMusicCacheCleared);
    
    return () => {
      window.removeEventListener('musicCacheCleared', handleMusicCacheCleared);
    };
  }, []);

  // Replay starts the picker and resets the one-shot turntable in one commit.
  // Safari's back/forward cache restores a document instead of reloading it;
  // treat that external return as a new entry too. Next client navigation does
  // not fire a persisted pageshow, so music continues between site pages.
  useEffect(() => {
    const handleReturnToHero = () => {
      restartHomeIntro();
      clearMusicCache();
      setCardSelected(false);
      setWaitingForModel(true);
      setIsSliding(false);
      setShowHeroSection(true);
      setUiState({ showCarousel: true, showViewer: true, isInteractionLocked: false });
      window.scrollTo({ top: 0, behavior: 'auto' });
    };
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) handleReturnToHero();
    };

    window.addEventListener('returnToHero', handleReturnToHero);
    window.addEventListener('pageshow', handlePageShow);
    if (new URLSearchParams(window.location.search).get('turntable') === '1') {
      handleReturnToHero();
      window.history.replaceState(null, '', '/');
    }
    return () => {
      window.removeEventListener('returnToHero', handleReturnToHero);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [clearMusicCache, setWaitingForModel]);

  // เพิ่ม useEffect เพื่อเริ่มโหลดโมเดลทันทีหลังจากโหลดหน้าเว็บ
  useEffect(() => {
    // เริ่มโหลดโมเดลทันทีหลังจากโหลดหน้าเว็บ (ไม่มีดีเลย์)
    if (process.env.NODE_ENV === 'development') {
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
  
  // Cached music can still hydrate behind the picker. It must never count as
  // a choice for this visit or start the turntable before the visitor chooses.
  useEffect(() => {
    if (showHeroSection && !cardSelected) setWaitingForModel(true);
  }, [showHeroSection, cardSelected, setWaitingForModel]);

  // ฟังก์ชันสำหรับสไลด์ไปหน้าถัดไป
  const handleSlideToMainPage = useCallback(() => {
    // Safety net: if the spin somehow never fired, make sure the music is
    // playing before we leave the hero (guarded — a no-op if it already started).
    resumeWhenReady();
    // บันทึกแคชเพลงก่อนสไลด์
    saveMusicCache();
    completeHomeIntro();
    setIsSliding(true);
    
    // หลังจากเอฟเฟกต์สไลด์เสร็จ ให้ซ่อน HeroSection
    setTimeout(() => {
      setShowHeroSection(false);
      setIsSliding(false);
    }, 800); // ระยะเวลาการสไลด์ 1 วินาที
  }, [saveMusicCache, resumeWhenReady]);

  // The music API is optional. The visitor can explicitly continue without
  // music from the carousel's error state; inactivity must never skip their
  // album choice or the record-player sequence.
  const openMainWithoutMusic = useCallback(() => {
    completeHomeIntro();
    setUiState({ showCarousel: false, showViewer: false, isInteractionLocked: false });
    setShowHeroSection(false);
    setIsSliding(false);
  }, []);

  // ใช้ useCallback สำหรับฟังก์ชันที่ส่งไปยัง child components
  const handleCardSelection = useCallback((card: Card) => {
    // เลือกการ์ดชั่วคราว (ยังไม่บันทึกแคช)
    selectCardTemporary(card);
    
    // ตั้งค่าว่าการ์ดถูกเลือกแล้ว
    setCardSelected(true);
    
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

  const handleCarouselReady = useCallback(() => setCarouselReady(true), []);
  
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
    
    // Only ever touch the VERTICAL axis here. Using the `overflow` shorthand
    // (or `overflow-x`) writes an inline style that overrides the stylesheet's
    // `overflow-x: hidden` on <body>, which silently re-enables horizontal
    // scrolling on the main page — that was the lateral (left/right) drift and
    // the dark strip on the right seen on mobile Safari. Setting only
    // `overflowY` leaves the CSS horizontal clip intact.
    if (showHeroSection || showCarousel || isInteractionLocked) {
      document.body.style.overflowY = 'hidden';
    } else {
      document.body.style.overflowY = '';
    }

    return () => {
      document.body.style.overflowY = '';
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

  // No overflow-hidden/overflow-x-hidden here (deliberately removed): ANY
  // overflow value other than "visible" on an ancestor — including
  // overflow-x-hidden alone, since the CSS spec forces the other axis to
  // compute as "auto" once one axis is non-visible — makes that ancestor
  // the containing block for descendant `position: sticky` elements, even
  // when it never actually scrolls internally itself. That was silently
  // breaking the bamboo section's scroll-pin (it would "unstick"
  // immediately instead of holding through its scroll track) since this
  // div wraps the entire page. If horizontal-bleed protection turns out to
  // be needed again, add `overflow-x: hidden` on <html>/<body> instead —
  // those are exempt from this issue (the UA propagates their overflow to
  // the viewport itself rather than creating a nested scroll container).
  // Every fresh entry gets one loading mark, followed directly by the picker.
  const holdLoader =
    mounted && showHeroSection && !carouselReady;

  return (
    <div className="flex flex-col relative bg-[#0A0A0A] text-[#F5F1E6]">
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

      {/* HeroSection Container - สไลด์ขึ้นบน */}
      {mounted && (
        <div 
          className={`gj-intro-screen fixed inset-0 z-40 ${
            isSliding ? '-translate-y-full' : 'translate-y-0' // isSliding ? '-translate-y-full' : 'translate-y-0'  สไลด์ไปด้านข้าง
          } ${showHeroSection ? 'block' : 'hidden'}`}
          style={{ 
            willChange: 'transform',
            transition: 'transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
          }}
        >
        {/* Carousel Modal */}
        {uiState.showCarousel && (
          <div 
            className="absolute inset-0 z-50 bg-[#0A0A0A] flex items-center justify-center"
            role="dialog"
            aria-modal="true"
            aria-label="Select music card"
          >
            <div className="w-full max-w-6xl min-w-0">

              <CDCardCarousel 
                onCardClick={handleCardSelection} 
                onReady={handleCarouselReady}
                onUnavailable={openMainWithoutMusic}
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
          onRecordSpinStart={resumeWhenReady}
          cardSelected={cardSelected}
          holdLoader={holdLoader}
          onContinueWithoutMusic={openMainWithoutMusic}
          choosingMusic={uiState.showCarousel}
          recordAccent={getAlbumAccentColor(currentCard?.imagePath)}
          recordArtwork={currentCard?.imagePath ? getAlbumArtworkUrl(currentCard.imagePath) : undefined}
        />
        </div>
      )}

      {/* Main Content - แสดงอยู่ข้างหลัง HeroSection ตลอดเวลา
          IMPORTANT: only apply the hero-reveal `transform` while the hero
          overlay is actually in play (showHeroSection). Once dismissed,
          the value is always translateY(0) anyway (a no-op), but leaving
          any inline `transform` on this ancestor — even an identity one —
          creates a new containing block and permanently breaks
          `position: sticky`/`position: fixed` for every descendant on the
          rest of the page for that session. That was silently breaking
          the bamboo scroll-pin section's sticky viewport (it would unstick
          far earlier than intended, cutting its scroll-driven choreography
          short and leaving a long stretch of dead scroll after) — dropping
          the transform key entirely once the hero is gone fixes it. */}
      <div
        className={`relative z-10 ${showHeroSection ? 'pointer-events-none' : 'pointer-events-auto'}`}
        style={{
          ...(showHeroSection ? { transform: isSliding ? 'translateY(0)' : 'translateY(100vh)' } : {}),
          transition: 'transform 0s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          ...(showHeroSection ? { willChange: 'transform' } : {}),
        }}
      >
<h1 className="sr-only">Grandma Jazz — Plastic-Free Cannabis Café in Kamala, Phuket</h1>
        {/* Record player slides away into the first words of the page:
            headline, one CTA, one guest's voice. Product follows. */}
        <LandingIntro />
        <ProductStory kind="space" />
        <ProductStory kind="story" />
        <ProductStory kind="ritual" />
        <Review />
        <EventBooking />
        <Featured />
        <Contact/>

      </div>
    </div>
  );
}
