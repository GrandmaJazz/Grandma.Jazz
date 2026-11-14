// frontend/src/app/page.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import ProductStory from '@/components/ProductStory';
import EventBooking from '@/components/evenbooking';
import Featured from '@/components/Featured';
import GarmentsTeaser from '@/components/GarmentsTeaser';
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

const RecordFlight = dynamic(() => import('@/components/RecordFlightPreview'), {
  ssr: false,
});

// ใช้ dynamic import เพื่อลดขนาด bundle หลัก

const CDCardCarousel = dynamic(() => import('@/components/CDCardCarousel'), {
  ssr: false,
  // Plain black while the chunk loads — NOT a second logo spinner. The hero
  // already shows one spinner; flashing another identical logo here (then the
  // carousel's own data spinner) read as the loader "glitching between loads".
  // Steady black bridges to the carousel with no extra logo remount.
  loading: () => <div className="w-full h-full bg-[#0A0A0A]" />
});

export default function Home() {
  // State สำหรับควบคุมการแสดง HeroSection vs หน้าหลัก
  const [showHeroSection, setShowHeroSection] = useState(() => !hasCompletedHomeIntro());
  const [isRevealing, setIsRevealing] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // รวม state ที่เกี่ยวข้องกับไว้ด้วยกันเพื่อลด re-render
  const [uiState, setUiState] = useState({
    showCarousel: !hasCompletedHomeIntro(),
    showViewer: false,
    isInteractionLocked: false
  });
  
  // State สำหรับติดตามการเลือกการ์ด
  const [cardSelected, setCardSelected] = useState(false);
  const [flightReady, setFlightReady] = useState(false);
  const [flightStarted, setFlightStarted] = useState(false);
  const [pickerFading, setPickerFading] = useState(false);
  const [prepareFlight, setPrepareFlight] = useState(false);
  const [reduceFlight, setReduceFlight] = useState(false);
  const [focusAfterSkip, setFocusAfterSkip] = useState(false);
  const introScreen = useRef<HTMLDivElement>(null);
  const homeContent = useRef<HTMLDivElement>(null);

  // Keep the loading mark until the album picker has settled.
  const [carouselReady, setCarouselReady] = useState(false);
  
  // ใช้ context สำหรับเล่นเพลง
  const { selectCardTemporary, saveMusicCache, currentCard, setWaitingForModel, resumeWhenReady, clearMusicCache } = useMusicPlayer();

  // Safari can expose the canvas beside the page on a diagonal swipe even
  // when layout overflow is clipped. Keep those gestures on the vertical
  // page at normal scale. Leave native pinch and zoomed panning to the browser.
  useEffect(() => {
    let startX = 0;
    let startY = 0;
    let horizontalStrip = false;
    let canGuardSwipe = false;
    const isZoomed = () => (window.visualViewport?.scale ?? 1) > 1.01;
    const onStart = (event: TouchEvent) => {
      canGuardSwipe = event.touches.length === 1 && !isZoomed();
      if (!canGuardSwipe) return;
      startX = event.touches[0].clientX;
      startY = event.touches[0].clientY;
      horizontalStrip = false;
      let element = event.target instanceof Element ? event.target : null;
      if (element?.closest('.gj-album-swipe-area, [data-carousel-speed]')) {
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
      if (!canGuardSwipe || horizontalStrip || event.touches.length !== 1 || isZoomed()) return;
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

  useEffect(() => {
    homeContent.current?.toggleAttribute('inert', mounted && showHeroSection);
    if (!showHeroSection && focusAfterSkip) {
      homeContent.current?.focus({ preventScroll: true });
      setFocusAfterSkip(false);
    }
  }, [mounted, showHeroSection, focusAfterSkip]);

  // The hydrated shell can be used while the catalogue is still loading.
  useEffect(() => {
    if (!mounted) return;
    const frame = requestAnimationFrame(() => {
      (window as typeof window & { __gjHomeReady?: boolean }).__gjHomeReady = true;
      window.dispatchEvent(new Event('gj-home-ready'));
    });
    return () => cancelAnimationFrame(frame);
  }, [mounted]);

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
      setFlightStarted(false); setPickerFading(false); setFlightReady(false);
      setPrepareFlight(false);
      setReduceFlight(false);
      setCarouselReady(false);
      clearMusicCache();
      setCardSelected(false);
      setWaitingForModel(true);
      setIsRevealing(false);
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

  // Cached music can still hydrate behind the picker. It must never count as
  // a choice for this visit or start the turntable before the visitor chooses.
  useEffect(() => {
    if (showHeroSection && !cardSelected) setWaitingForModel(true);
  }, [showHeroSection, cardSelected, setWaitingForModel]);

  const revealHomepage = useCallback((immediate = false) => {
    // Safety net: if the spin somehow never fired, make sure the music is
    // playing before we leave the hero (guarded — a no-op if it already started).
    resumeWhenReady();
    // บันทึกแคชเพลงก่อนสไลด์
    saveMusicCache();
    completeHomeIntro();
    if (immediate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setUiState({ showCarousel: false, showViewer: true, isInteractionLocked: false });
      setShowHeroSection(false);
      setIsRevealing(false);
      setFocusAfterSkip(true);
      return;
    }
    setIsRevealing(true);
  }, [saveMusicCache, resumeWhenReady]);

  const finishReveal = useCallback(() => {
    setUiState({ showCarousel: false, showViewer: true, isInteractionLocked: false });
    setShowHeroSection(false);
    setIsRevealing(false);
  }, []);

  useEffect(() => {
    const screen = introScreen.current;
    if (!isRevealing || !screen) return;
    // A rotation can cancel the transition. Still release the homepage.
    const duration = Number.parseFloat(getComputedStyle(screen).transitionDuration) * 1000;
    const timer = window.setTimeout(finishReveal, duration + 80);
    return () => window.clearTimeout(timer);
  }, [isRevealing, finishReveal]);

  // The music API is optional. The visitor can explicitly continue without
  // music from the carousel's error state; inactivity must never skip their
  // album choice or the record-player sequence.
  const openMainWithoutMusic = useCallback((moveFocus = false) => {
    if (cardSelected) clearMusicCache();
    completeHomeIntro();
    setUiState({ showCarousel: false, showViewer: false, isInteractionLocked: false });
    setShowHeroSection(false);
    setIsRevealing(false);
    setFocusAfterSkip(moveFocus);
  }, [cardSelected, clearMusicCache]);

  const musicUnavailable = useCallback(() => openMainWithoutMusic(), [openMainWithoutMusic]);

  // ใช้ useCallback สำหรับฟังก์ชันที่ส่งไปยัง child components
  const handleSelectionStart = useCallback((card: Card) => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    setFlightReady(false);
    selectCardTemporary(card);
    setCardSelected(true);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setReduceFlight(reduce);
    setPrepareFlight(!reduce);
  }, [selectCardTemporary]);
  const handleRevealStart = useCallback(() => {
    if (reduceFlight) {
      revealHomepage(true);
      return;
    }
    setFlightStarted(true);
    setPickerFading(true);
  }, [revealHomepage, reduceFlight]);
  const handleCardSelection = useCallback(() => {
    setUiState(prev => ({ ...prev, showCarousel: false, showViewer: true, isInteractionLocked: false }));
  }, []);
  const finishIntro = useRef(revealHomepage);
  finishIntro.current = revealHomepage;
  useEffect(() => {
    if (!showHeroSection || !cardSelected || flightStarted || isRevealing) return;
    // Bound the wait after a choice even if WebGL preparation never settles.
    const timer = window.setTimeout(() => finishIntro.current(), 8500);
    return () => window.clearTimeout(timer);
  }, [showHeroSection, cardSelected, flightStarted, isRevealing]);

  const handleFlightReady = useCallback((ready: boolean) => setFlightReady(ready), []);

  const handleCarouselReady = useCallback(() => setCarouselReady(true), []);

  useEffect(() => {
    if (!showHeroSection || !carouselReady || cardSelected || prepareFlight) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // Give the opening covers a chance to paint before downloading the scene.
    // Selection starts preparation immediately if it happens first.
    const timer = window.setTimeout(() => setPrepareFlight(true), 500);
    return () => window.clearTimeout(timer);
  }, [showHeroSection, carouselReady, cardSelected, prepareFlight]);
  
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
      {mounted && (
        <div
          ref={introScreen}
          className={`gj-intro-screen fixed inset-0 z-40 ${showHeroSection ? 'block' : 'hidden'}`}
          data-revealing={isRevealing}
          onTransitionEnd={event => {
            if (isRevealing && event.target === event.currentTarget &&
              ['opacity', 'transform', 'mask-position', '-webkit-mask-position'].includes(event.propertyName)) finishReveal();
          }}
        >
        <div className="gj-intro-stage relative h-full">
        {/* Carousel Modal */}
        {uiState.showCarousel && (
          <div 
            className={`absolute inset-0 z-50 bg-[#0A0A0A] flex items-center justify-center transition-opacity duration-700 ${pickerFading ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
            role="dialog"
            aria-modal="true"
            aria-label="Select music card"
          >
            <div className="w-full max-w-6xl min-w-0">

              <CDCardCarousel 
                onCardClick={handleCardSelection}
                onSelectionStart={handleSelectionStart}
                onRevealStart={handleRevealStart}
                readyToReveal={flightReady || reduceFlight}
                onReady={handleCarouselReady}
                onUnavailable={musicUnavailable}
              />
            </div>
            {holdLoader && (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-[#0A0A0A]" role="status" aria-label="Finding the records">
                <img src="/images/Grandma-Jazz-Logo-Heavier.webp" alt="" width={220} height={72} className="w-[min(220px,55vw)] h-auto opacity-40 grayscale" />
              </div>
            )}
            {!flightStarted && (
              <div className="pointer-events-none absolute inset-x-0 top-[max(0.5rem,env(safe-area-inset-top))] z-20 flex justify-center">
                <button
                  type="button"
                  onClick={() => openMainWithoutMusic(true)}
                  className="gj-cta gj-cta--quiet gj-intro-skip pointer-events-auto relative whitespace-nowrap"
                >Skip intro</button>
              </div>
            )}
          </div>
        )}
        
        {/* Interaction lock overlay */}
        {uiState.isInteractionLocked && (
          <div className="absolute inset-0 z-[90] bg-transparent cursor-not-allowed" aria-hidden="true" />
        )}
        
        {showHeroSection && prepareFlight && !reduceFlight && <RecordFlight
          homepage
          start={flightStarted}
          selectionKey={cardSelected ? currentCard?._id : undefined}
          onReady={handleFlightReady}
          onComplete={revealHomepage}
          onRecordSpinStart={resumeWhenReady}
          accentColor={getAlbumAccentColor(currentCard?.imagePath)}
          artworkSrc={currentCard?.imagePath ? getAlbumArtworkUrl(currentCard.imagePath) : undefined}
        />}

        </div>
        </div>
      )}

      {/* Only the desktop slide positions the homepage offscreen. */}
      <div
        id="gj-home-content"
        ref={homeContent}
        tabIndex={-1}
        data-intro-active={showHeroSection}
        data-revealing={isRevealing}
        className={`relative z-10 ${showHeroSection ? 'pointer-events-none' : 'pointer-events-auto'}`}
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
        <GarmentsTeaser />
        <Contact homepage />

      </div>
    </div>
  );
}
