// frontend/src/components/MusicPlayer.tsx
'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { getOptimizedImageUrl } from '@/utils/fileHelper';

// The whole morph runs off ONE progress value, 0 (square) to 1 (card).
//
// Animating width and height as two independent springs was the mistake: two
// springs mean the width/height ratio at any given frame is whatever the two
// happen to be doing, so the shape wanders and the album art (square, sized off
// the width) can briefly outgrow the shell and get clipped. Driving both from a
// single value makes the shape deterministic at every frame.
//
// Geometry, with p the progress value:
//   width  = Wc + (We - Wc) * p
//   height = width + controlsHeight * p * p
//
// The padding cancels out exactly (the album art is a square sized off the
// content width, so height = 2*pad + (width - 2*pad) + controls). Two things
// fall out of the p*p on the controls term:
//   - height is never less than width, so the art can never be clipped
//   - the extra height is gone by ~p=0.25, so the last quarter of the collapse
//     is a square shrinking into a smaller square, which is what it should look
//     like. Expanding, it grows as a square and then opens downward.
const MORPH = { type: 'tween' as const, duration: 0.42, ease: [0.22, 1, 0.36, 1] as const };

export default function MusicPlayer() {
  const {
    currentCard,
    currentMusic,
    isPlaying,
    volume,
    play,
    pause,
    setVolume,
    playCard,
  } = useMusicPlayer();

  const pathname = usePathname();
  const router = useRouter();

  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [heroActive, setHeroActive] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isVolumeDragging, setIsVolumeDragging] = useState<boolean>(false);
  const [allCards, setAllCards] = useState<any[]>([]);
  const [isSm, setIsSm] = useState<boolean>(false);

  const [viewport, setViewport] = useState({ left: 0, top: 0, width: 390, height: 700, clearance: 100 });
  const collapsedPosition = useRef<{ x: number; y: number } | null>(null);
  const userPlaced = useRef(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const volumeTrackRef = useRef<HTMLDivElement>(null);
  const volumePointerId = useRef<number | null>(null);
  const draggedRef = useRef<boolean>(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Track the sm breakpoint so the morph can animate real pixel values
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)');
    const sync = () => setIsSm(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  // The same condition as the early return below. Held in a variable so the
  // measure effect can depend on it — see the comment there.
  const renderable =
    isVisible && !!currentCard && !!currentMusic && !heroActive && !pathname?.startsWith('/admin');

  // Natural height of the controls block. Measured rather than guessed, and
  // observed so a changing fan row or breakpoint keeps the geometry honest.
  const controlsRef = useRef<HTMLDivElement>(null);
  const [controlsH, setControlsH] = useState<number>(0);

  useEffect(() => {
    if (!renderable) return;
    const el = controlsRef.current;
    if (!el) return;

    let raf = 0;
    const measure = () => {
      const h = el.scrollHeight;
      // Fonts and the fan's cover images can land a frame late; a zero here
      // would silently pin the card to a square, so retry rather than accept it.
      if (h > 0) setControlsH(h);
      else raf = requestAnimationFrame(measure);
    };
    measure();

    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => measure());
      ro.observe(el);
    }
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
    };
  }, [renderable, isSm, allCards.length]);

  const collapsedW = isSm ? 80 : 64;
  const expandedW = Math.min(isSm ? 256 : 230, viewport.width - 32);
  const padMax = isSm ? 20 : 12;
  const expandedArt = isSm ? 144 : 128;
  const expandedBase = expandedArt + padMax * 2 + 4;

  // Single source of truth for the morph.
  const p = useMotionValue(0);
  useEffect(() => {
    const controls = animate(p, isExpanded ? 1 : 0, MORPH);
    return () => controls.stop();
  }, [isExpanded]);

  const shellW = useTransform(p, (v) => collapsedW + (expandedW - collapsedW) * v);
  const shellH = useTransform(p, (v) => collapsedW + (expandedBase - collapsedW) * v + Math.min(controlsH * v * v, Math.max(0, viewport.height - viewport.clearance - 80 - expandedBase)));
  const artW = useTransform(p, v => collapsedW - 4 + (expandedArt - collapsedW + 4) * v);
  const shellPad = useTransform(p, (v) => padMax * v);

  // Content leaves before the box is small, and arrives after it is large.
  const contentOpacity = useTransform(p, [0.42, 0.9], [0, 1]);
  const contentScale = useTransform(p, [0.35, 1], [0.94, 1]);
  const contentY = useTransform(p, [0.42, 1], [10, 0]);
  const volumeRailOpacity = useTransform(p, [0.58, 0.88], [0, 1]);
  const volumeRailWidth = useTransform(p, [0.48, 0.92], [0, 44]);
  const volumeRailGap = useTransform(p, [0.48, 0.92], [0, 10]);

  // Use the visible viewport: Safari's browser bars can cover the layout viewport.
  // Expansion travels to the centre, then collapse returns to the user's dock.
  const safePosition = useCallback((px: number, py: number, width: number, height: number) => {
    const vv = window.visualViewport;
    const left = (vv?.offsetLeft ?? 0) + 16;
    const headerHeight = [...document.querySelectorAll('header')].map(el => el.getBoundingClientRect().height).find(height => height > 0) ?? 80;
    const top = (vv?.offsetTop ?? 0) + headerHeight + 20;
    const right = (vv?.offsetLeft ?? 0) + (vv?.width ?? window.innerWidth) - 16;
    const bottom = (vv?.offsetTop ?? 0) + (vv?.height ?? window.innerHeight) - 64;
    return { x: Math.max(left, Math.min(px, right - width)), y: Math.max(top, Math.min(py, bottom - height)) };
  }, []);

  const findDock = useCallback(() => {
    const vv = window.visualViewport;
    const width = vv?.width ?? window.innerWidth;
    const top = vv?.offsetTop ?? 0;
    const height = vv?.height ?? window.innerHeight;
    const header = [...document.querySelectorAll('header')].map(el => el.getBoundingClientRect()).find(rect => rect.height > 0 && rect.top < top + height);
    const preferredY = Math.max(top + (header?.height ?? 80) + 20, (header?.bottom ?? top) + 20);
    // Try the quiet area beside the bamboo first, then other clear spaces.
    const obstacles = [...document.querySelectorAll('main a, main button, main h1, main h2, main p, main img')]
      .filter(el => !el.closest('[data-gj-player]'))
      .map(el => {
        const rect = el.getBoundingClientRect();
        if (el instanceof HTMLImageElement && /bamboo joint holder/i.test(el.alt)) {
          const centre = rect.left + rect.width / 2;
          return { left: centre - 45, right: centre + 45, top: rect.top, bottom: rect.bottom };
        }
        return rect;
      });
    for (const px of [width - collapsedW - 20, 20]) {
      for (let py = preferredY; py < top + height - collapsedW - 80; py += 16) {
        if (obstacles.every(r => r.right <= px - 8 || r.left >= px + collapsedW + 8 || r.bottom <= py - 8 || r.top >= py + collapsedW + 8)) {
          return safePosition(px, py, collapsedW, collapsedW);
        }
      }
    }
    return safePosition(width - collapsedW - 20, preferredY, collapsedW, collapsedW);
  }, [collapsedW, safePosition]);

  useEffect(() => {
    if (!renderable) return;
    let timer: ReturnType<typeof setTimeout>;
    const place = () => {
      const vv = window.visualViewport;
      const next = { left: vv?.offsetLeft ?? 0, top: vv?.offsetTop ?? 0, width: vv?.width ?? window.innerWidth, height: vv?.height ?? window.innerHeight, clearance: ([...document.querySelectorAll('header')].map(el => el.getBoundingClientRect().height).find(height => height > 0) ?? 80) + 20 };
      setViewport(old => Object.keys(next).every(key => old[key as keyof typeof old] === next[key as keyof typeof next]) ? old : next);
      const firstPlacement = !collapsedPosition.current;
      if (!collapsedPosition.current || (!userPlaced.current && !isExpanded)) collapsedPosition.current = findDock();
      const fullHeight = Math.min(expandedBase + controlsH, next.height - next.clearance - 80);
      const target = isExpanded
        ? safePosition(next.left + (next.width - expandedW) / 2, next.top + next.clearance + (next.height - next.clearance - 64 - fullHeight) / 2, expandedW, fullHeight)
        : safePosition(collapsedPosition.current.x, collapsedPosition.current.y, collapsedW, collapsedW);
      if (!isExpanded) collapsedPosition.current = target;
      if (firstPlacement) { x.set(target.x); y.set(target.y); return; }
      animate(x, target.x, MORPH);
      animate(y, target.y, MORPH);
    };
    const schedule = () => { clearTimeout(timer); timer = setTimeout(place, 150); };
    place();
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, { passive: true });
    window.visualViewport?.addEventListener('resize', schedule);
    window.visualViewport?.addEventListener('scroll', schedule);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule);
      window.visualViewport?.removeEventListener('resize', schedule);
      window.visualViewport?.removeEventListener('scroll', schedule);
    };
  }, [renderable, isExpanded, controlsH, expandedW, expandedBase, collapsedW, safePosition, findDock, x, y]);

  // Show the player once music has been selected
  useEffect(() => {
    if (currentCard && currentMusic) setIsVisible(true);
  }, [currentCard, currentMusic]);

  // Hide the player while the hero section is on screen (homepage only)
  useEffect(() => {
    const check = () => {
      if (pathname !== '/') { setHeroActive(false); return; }
      const heroHidden = localStorage.getItem('heroSectionHidden') === 'true';
      setHeroActive(!heroHidden);
    };
    check();
    const handleHeroChange = (e: Event) => setHeroActive(!!(e as CustomEvent).detail);
    window.addEventListener('heroSectionChange', handleHeroChange as EventListener);
    return () => window.removeEventListener('heroSectionChange', handleHeroChange as EventListener);
  }, [pathname]);

  // Fetch all available albums
  useEffect(() => {
    const loadCards = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/cards`);
        if (response.ok) {
          const data = await response.json();
          setAllCards(data.cards || []);
        }
      } catch (error) {
        console.error('Failed to load cards:', error);
      }
    };
    loadCards();
  }, []);

  // Toggle expand on card click (ignore if dragging)
  const handleCardClick = () => {
    if (draggedRef.current) { draggedRef.current = false; return; }
    setIsExpanded((v) => !v);
  };

  // Back to the hero — turntable + album picker. page.tsx listens for this and
  // flips the hero overlay back on; the track keeps playing underneath.
  const handleBackToTurntable = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(false);
    if (pathname !== '/') { router.push('/?turntable=1'); return; }
    window.dispatchEvent(new Event('returnToHero'));
  };

  // Handle album selection from fan
  const handleSelectAlbum = (card: any) => {
    playCard(card);
    setIsExpanded(false);
  };

  // Which albums appear in the fan
  const fanAlbums = useMemo(() => {
    if (allCards.length === 0) return [];
    const maxFanAlbums = 5;
    const currentIndex = currentCard ? allCards.findIndex(c => c._id === currentCard._id) : -1;

    if (allCards.length <= maxFanAlbums) {
      return allCards;
    }

    let start = Math.max(0, currentIndex - 2);
    let end = Math.min(allCards.length, start + maxFanAlbums);
    if (end - start < maxFanAlbums) start = Math.max(0, end - maxFanAlbums);

    return allCards.slice(start, end);
  }, [allCards, currentCard]);

  // Fan geometry: shallow arc, edges lifted, laid out in flow so nothing spills
  const getFan = (index: number) => {
    const total = fanAlbums.length;
    const angle = (index - (total - 1) / 2) * 16;
    const rad = (angle * Math.PI) / 180;
    return { angle, y: -(1 - Math.cos(rad)) * 55 };
  };

  // Direct vertical touch control. This avoids the rotated/native range-input
  // behaviour that was hard to grab reliably on iOS.
  const setVolumeFromClientY = useCallback((clientY: number) => {
    const track = volumeTrackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    if (!rect.height) return;
    const next = Math.max(0, Math.min(1, (rect.bottom - clientY) / rect.height));
    setVolume(next);
  }, [setVolume]);

  const handleVolumeKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = 0.05;
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
      e.preventDefault();
      setVolume(Math.min(1, volume + step));
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
      e.preventDefault();
      setVolume(Math.max(0, volume - step));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setVolume(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setVolume(1);
    }
  }, [setVolume, volume]);

  if (!renderable || !currentCard || !currentMusic) {
    return null;
  }

  return (
    <div data-gj-player className={`fixed inset-0 z-50 ${isExpanded ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      {/* Expanded state owns the touch layer. An outside tap lands here, closes
          the player, and never reaches whatever sits underneath on the page. */}
      <div
        aria-hidden="true"
        className={`absolute inset-0 z-0 ${isExpanded ? 'pointer-events-auto' : 'pointer-events-none'}`}
        style={{ touchAction: 'none', WebkitTapHighlightColor: 'transparent' }}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsExpanded(false);
        }}
      />
      <motion.div
        ref={cardRef}
        drag={!isVolumeDragging && !isExpanded}
        dragConstraints={{ left: viewport.left + 16, top: viewport.top + viewport.clearance, right: viewport.left + viewport.width - collapsedW - 16, bottom: viewport.top + viewport.height - collapsedW - 64 }}
        dragMomentum={false}
        dragElastic={0}
        onDragStart={() => { x.stop(); y.stop(); draggedRef.current = true; userPlaced.current = true; setIsDragging(true); }}
        onDragEnd={() => { setIsDragging(false); const dock = safePosition(x.get(), y.get(), collapsedW, collapsedW); collapsedPosition.current = dock; x.set(dock.x); y.set(dock.y); requestAnimationFrame(() => { draggedRef.current = false; }); }}
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
        style={{ x, y, touchAction: 'none', left: 0, top: 0 }}
        className={`pointer-events-auto absolute z-10 select-none will-change-transform ${isDragging && !isVolumeDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      >
        {/* Single shell that morphs between the two states — never unmounts */}
        <motion.div
          role={isExpanded ? "group" : "button"}
          aria-label={isExpanded ? "Music controls" : `Open ${currentCard.title} music controls`}
          tabIndex={0}
          aria-expanded={isExpanded}
          title={isExpanded ? 'Click to collapse' : 'Click to expand'}
          onClick={(e) => { e.stopPropagation(); handleCardClick(); }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleCardClick(); } }}
          className={`relative overflow-hidden rounded-box border-2 border-[#B49B73]/75 bg-[#181818]/80 backdrop-blur-xl shadow-xl shadow-[#0A0A0A]/40 focus:outline-none focus:ring-2 focus:ring-[#B49B73]/50 ${isPlaying && !isExpanded ? "gj-player-playing" : ""}`}
          style={{
            width: shellW,
            height: shellH,
            padding: shellPad,
            willChange: 'width, height, padding, transform',
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            contain: 'layout paint style',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <motion.button
            type="button"
            aria-label="Collapse music player"
            tabIndex={isExpanded ? 0 : -1}
            className="absolute right-2 top-2 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-[#B49B73]/60 bg-[#181818]/95 text-[#B49B73] focus:outline-none focus:ring-2 focus:ring-[#B49B73]/50"
            style={{ opacity: contentOpacity, pointerEvents: isExpanded ? 'auto' : 'none' }}
            onPointerDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); setIsExpanded(false); }}
          >
            ×
          </motion.button>

          {/* Cover + vertical volume rail share one row. Both stay mounted so
              the shell never has to reflow between separate component trees. */}
          <div className="flex items-center justify-center">
            <motion.div className="aspect-square flex-shrink-0 overflow-hidden rounded-box" style={{ width: artW, maxWidth: "100%" }}>
              <img
                src={getOptimizedImageUrl(currentCard.imagePath, { width: 640 })}
                alt={currentCard.title}
                className="w-full h-full object-cover object-center"
                draggable={false}
              />
            </motion.div>

            <motion.div
              aria-hidden={!isExpanded}
              className="relative flex-shrink-0 overflow-hidden"
              style={{
                width: volumeRailWidth,
                marginLeft: volumeRailGap,
                height: artW,
                opacity: volumeRailOpacity,
                pointerEvents: isExpanded ? 'auto' : 'none',
              }}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div
                ref={volumeTrackRef}
                role="slider"
                aria-label="Volume"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(volume * 100)}
                aria-valuetext={`${Math.round(volume * 100)} percent`}
                tabIndex={isExpanded ? 0 : -1}
                className="absolute inset-y-0 right-0 w-11 rounded-[999px] border border-white/15 bg-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.18),inset_0_-10px_24px_rgba(0,0,0,0.16),0_8px_24px_rgba(0,0,0,0.22)] backdrop-blur-2xl focus:outline-none focus:ring-2 focus:ring-[#B49B73]/55"
                style={{ touchAction: 'none', WebkitTapHighlightColor: 'transparent' }}
                onKeyDown={handleVolumeKeyDown}
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  volumePointerId.current = e.pointerId;
                  setIsVolumeDragging(true);
                  e.currentTarget.setPointerCapture(e.pointerId);
                  setVolumeFromClientY(e.clientY);
                }}
                onPointerMove={(e) => {
                  if (volumePointerId.current !== e.pointerId) return;
                  e.preventDefault();
                  e.stopPropagation();
                  setVolumeFromClientY(e.clientY);
                }}
                onPointerUp={(e) => {
                  if (volumePointerId.current !== e.pointerId) return;
                  e.preventDefault();
                  e.stopPropagation();
                  setVolumeFromClientY(e.clientY);
                  volumePointerId.current = null;
                  setIsVolumeDragging(false);
                  if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
                }}
                onPointerCancel={(e) => {
                  if (volumePointerId.current === e.pointerId) volumePointerId.current = null;
                  setIsVolumeDragging(false);
                }}
              >
                <div className="absolute inset-x-[9px] bottom-3 top-3 rounded-full bg-black/25 shadow-inner">
                  <div
                    className="absolute inset-x-0 bottom-0 rounded-full bg-gradient-to-t from-[#B49B73]/75 to-[#D9C6A5]/90"
                    style={{ height: `${volume * 100}%` }}
                  />
                  <div
                    className={`absolute left-1/2 h-6 w-7 -translate-x-1/2 rounded-full border border-white/20 bg-gradient-to-b from-[#E3DCD4]/95 to-[#B49B73]/95 shadow-[0_3px_10px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.65)] ${isVolumeDragging ? 'scale-105' : 'scale-100'} transition-transform duration-100`}
                    style={{ bottom: `calc(${volume * 100}% - 12px)` }}
                  />
                </div>
              </div>
            </motion.div>
          </div>

          {/* Controls. Always mounted — unmounting them mid-collapse was the
              other half of the jitter, because the shell's own height target
              moved while it was animating toward it. */}
          <motion.div
            ref={controlsRef}
            aria-hidden={!isExpanded}
            className="pt-3 sm:pt-4"
            style={{
              opacity: contentOpacity,
              scale: contentScale,
              y: contentY,
              pointerEvents: isExpanded ? 'auto' : 'none',
            }}
          >
                <div className="flex flex-col items-center gap-3 sm:gap-4">
                  {/* Play / Pause */}
                  <div className="flex items-center justify-center">
                    <button
                      className="w-14 h-14 sm:w-16 sm:h-16 bg-[#B49B73] hover:bg-[#A98D60] rounded-full transition-all duration-150 flex items-center justify-center hover:scale-105 active:scale-90 shadow-lg shadow-[#0A0A0A]/30 flex-shrink-0"
                      onClick={(e) => { e.stopPropagation(); isPlaying ? pause() : play(); }}
                      onPointerDown={(e) => e.stopPropagation()}
                      tabIndex={isExpanded ? 0 : -1}
                      title={isPlaying ? 'Pause' : 'Play'}
                      style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                    >
                      {isPlaying ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-7 sm:w-7" viewBox="0 0 24 24" fill="currentColor" strokeWidth="0">
                          <rect x="7" y="6" width="3" height="12" rx="1" />
                          <rect x="14" y="6" width="3" height="12" rx="1" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-7 sm:w-7 ml-0.5" viewBox="0 0 24 24" fill="currentColor" strokeWidth="0">
                          <path d="M6 4l15 8-15 8z" />
                        </svg>
                      )}
                    </button>
                  </div>

                </div>

                {/* Album fan carousel — laid out in flow, no absolute spill */}
                {fanAlbums.length > 1 && (
                  <div className="h-24 sm:h-28 flex items-center justify-center mt-1">
                    {fanAlbums.map((album, idx) => {
                      const { angle, y: fanY } = getFan(idx);
                      const isSelected = album._id === currentCard._id;
                      return (
                        <motion.button
                          key={album._id}
                          onClick={(e) => { e.stopPropagation(); handleSelectAlbum(album); }}
                          onPointerDown={(e) => e.stopPropagation()}
                          tabIndex={isExpanded ? 0 : -1}
                          initial={{ opacity: 0, scale: 0.6, y: 0, rotateZ: 0 }}
                          animate={{ opacity: 1, scale: 1, y: fanY, rotateZ: angle }}
                          transition={{ duration: 0.3, delay: 0.2 + idx * 0.04, ease: [0.16, 1, 0.3, 1] }}
                          whileHover={{ scale: 1.12, y: fanY - 6 }}
                          whileTap={{ scale: 0.95 }}
                          className={`w-10 h-10 sm:w-12 sm:h-12 -mx-1 sm:-mx-1.5 rounded-lg overflow-hidden border-2 flex-shrink-0 ${
                            isSelected ? 'border-[#B49B73] shadow-lg shadow-[#B49B73]/50' : 'border-[#B49B73]/40 hover:border-[#B49B73]/70'
                          }`}
                          style={{
                            zIndex: isSelected ? 10 : 1,
                            WebkitTapHighlightColor: 'transparent',
                            touchAction: 'manipulation',
                          }}
                        >
                          <img
                            src={getOptimizedImageUrl(album.imagePath, { width: 640 })}
                            alt={album.title}
                            className="w-full h-full object-cover object-center"
                            draggable={false}
                          />
                        </motion.button>
                      );
                    })}
                  </div>
                )}

                {/* Back to the turntable */}
                <button
                  onClick={handleBackToTurntable}
                  onPointerDown={(e) => e.stopPropagation()}
                  tabIndex={isExpanded ? 0 : -1}
                  className="mt-1 w-full py-1 text-center text-[11px] tracking-wide text-[#B49B73]/75 hover:text-[#B49B73] transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[#B49B73]/50 rounded-box"
                  style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                >
                  Back to the turntable
                </button>
          </motion.div>
        </motion.div>
      </motion.div>

    </div>
  );
}
