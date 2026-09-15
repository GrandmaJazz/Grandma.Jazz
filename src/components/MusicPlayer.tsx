// frontend/src/components/MusicPlayer.tsx
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { getFileUrl } from '@/utils/fileHelper';

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
const MORPH = { type: 'spring' as const, stiffness: 140, damping: 24, mass: 1.1 };

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

  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [heroActive, setHeroActive] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isVolumeDragging, setIsVolumeDragging] = useState<boolean>(false);
  const [allCards, setAllCards] = useState<any[]>([]);
  const [isSm, setIsSm] = useState<boolean>(false);

  const constraintsRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
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

  // Natural height of the controls block. Measured rather than guessed, and
  // observed so a changing fan row or breakpoint keeps the geometry honest.
  const controlsRef = useRef<HTMLDivElement>(null);
  const [controlsH, setControlsH] = useState<number>(0);

  useEffect(() => {
    const el = controlsRef.current;
    if (!el) return;
    const measure = () => setControlsH(el.scrollHeight);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isSm, allCards.length]);

  const collapsedW = isSm ? 80 : 64;
  const expandedW = isSm ? 256 : 230;
  const padMax = isSm ? 20 : 12;

  // Single source of truth for the morph.
  const p = useMotionValue(0);
  useEffect(() => {
    const controls = animate(p, isExpanded ? 1 : 0, MORPH);
    return () => controls.stop();
  }, [isExpanded]);

  const shellW = useTransform(p, (v) => collapsedW + (expandedW - collapsedW) * v);
  const shellH = useTransform(p, (v) => collapsedW + (expandedW - collapsedW) * v + controlsH * v * v);
  const shellPad = useTransform(p, (v) => padMax * v);

  // Content leaves before the box is small, and arrives after it is large.
  const contentOpacity = useTransform(p, [0.42, 0.9], [0, 1]);
  const contentScale = useTransform(p, [0.35, 1], [0.94, 1]);
  const contentY = useTransform(p, [0.42, 1], [10, 0]);

  // Keep the card fully on screen after it expands or window resizes
  useEffect(() => {
    const clamp = () => {
      const el = cardRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const m = 8;
      let nx = x.get();
      let ny = y.get();
      if (r.right > window.innerWidth - m) nx -= r.right - (window.innerWidth - m);
      if (r.left < m) nx += m - r.left;
      if (r.bottom > window.innerHeight - m) ny -= r.bottom - (window.innerHeight - m);
      if (r.top < m) ny += m - r.top;
      if (nx !== x.get()) animate(x, nx, { duration: 0.3, ease: [0.16, 1, 0.3, 1] });
      if (ny !== y.get()) animate(y, ny, { duration: 0.3, ease: [0.16, 1, 0.3, 1] });
    };
    const t = setTimeout(clamp, isExpanded ? 900 : 0);
    window.addEventListener('resize', clamp);
    return () => { clearTimeout(t); window.removeEventListener('resize', clamp); };
  }, [isExpanded]);

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

  // Click outside to collapse
  useEffect(() => {
    if (!isExpanded) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isExpanded]);

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

  if (!isVisible || !currentCard || !currentMusic || heroActive || pathname !== '/') {
    return null;
  }

  return (
    <div ref={constraintsRef} className="fixed inset-0 z-50 pointer-events-none">
      <motion.div
        ref={cardRef}
        drag={!isVolumeDragging}
        dragConstraints={constraintsRef}
        dragMomentum={false}
        dragElastic={0.05}
        onDragStart={() => { draggedRef.current = true; setIsDragging(true); }}
        onDragEnd={() => { setIsDragging(false); }}
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
        style={{ x, y, touchAction: 'none', bottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
        className={`pointer-events-auto absolute right-4 select-none will-change-transform ${isDragging && !isVolumeDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      >
        {/* Single shell that morphs between the two states — never unmounts */}
        <motion.div
          role="button"
          tabIndex={0}
          aria-expanded={isExpanded}
          title={isExpanded ? 'Click to collapse' : 'Click to expand'}
          onClick={(e) => { e.stopPropagation(); handleCardClick(); }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleCardClick(); } }}
          className="overflow-hidden rounded-box border-2 border-[#B49B73]/75 bg-[#181818]/80 backdrop-blur-xl shadow-xl shadow-[#0A0A0A]/40 focus:outline-none focus:ring-2 focus:ring-[#B49B73]/50"
          style={{
            width: shellW,
            height: shellH,
            padding: shellPad,
            willChange: 'width, height',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {/* Album art — the shared element in both states */}
          <div className="w-full aspect-square overflow-hidden rounded-box">
            <img
              src={getFileUrl(currentCard.imagePath)}
              alt={currentCard.title}
              className="w-full h-full object-cover object-center"
              draggable={false}
            />
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

                  {/* Volume slider - Liquid Glass Style */}
                  <div className="w-full flex items-center gap-2 pointer-events-auto px-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 text-[#e3dcd4]/70 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 5L6 9H2v6h4l5 4z"></path>
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                    </svg>

                    <div className="flex-1 bg-gradient-to-r from-[#B49B73]/15 to-[#B49B73]/20 backdrop-blur-sm rounded-box p-3 sm:p-4 border border-[#B49B73]/30 shadow-inner">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={volume}
                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                        onPointerDown={(e) => { setIsVolumeDragging(true); e.stopPropagation(); }}
                        onPointerUp={() => setIsVolumeDragging(false)}
                        onMouseDown={(e) => { setIsVolumeDragging(true); e.stopPropagation(); }}
                        onMouseUp={() => setIsVolumeDragging(false)}
                        onTouchStart={(e) => { setIsVolumeDragging(true); e.stopPropagation(); }}
                        onTouchEnd={() => setIsVolumeDragging(false)}
                        onClick={(e) => e.stopPropagation()}
                        tabIndex={isExpanded ? 0 : -1}
                        className="w-full h-2 appearance-none cursor-pointer accent-[#B49B73] slider-horizontal"
                        style={{
                          WebkitTapHighlightColor: 'transparent',
                          touchAction: 'none',
                        } as any}
                        title="Volume"
                      />
                    </div>

                    <div className="text-xs text-[#e3dcd4]/60 whitespace-nowrap w-8 text-right font-medium">{Math.round(volume * 100)}%</div>
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
                            src={getFileUrl(album.imagePath)}
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

      <style jsx>{`
        input[type='range'].slider-horizontal {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          background: transparent;
          cursor: pointer;
        }

        input[type='range'].slider-horizontal::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 26px;
          height: 18px;
          border-radius: 9px;
          background: linear-gradient(135deg, #B49B73 0%, #C9A975 100%);
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.1);
          transition: background 0.2s ease, box-shadow 0.2s ease;
          /* track is 8px, thumb is 18px -> lift by half the difference */
          margin-top: -5px;
        }

        input[type='range'].slider-horizontal::-webkit-slider-thumb:active {
          width: 28px;
          height: 20px;
          margin-top: -6px;
          box-shadow: 0 4px 12px rgba(180, 155, 115, 0.6), inset 0 1px 2px rgba(255, 255, 255, 0.2);
        }

        input[type='range'].slider-horizontal::-moz-range-thumb {
          width: 26px;
          height: 18px;
          border-radius: 9px;
          background: linear-gradient(135deg, #B49B73 0%, #C9A975 100%);
          cursor: pointer;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.2);
        }

        input[type='range'].slider-horizontal::-moz-range-thumb:active {
          width: 28px;
          height: 20px;
          box-shadow: 0 4px 12px rgba(180, 155, 115, 0.6), inset 0 1px 2px rgba(255, 255, 255, 0.2);
        }

        input[type='range'].slider-horizontal::-webkit-slider-runnable-track {
          background: linear-gradient(to right, #B49B73, rgba(180, 155, 115, 0.3));
          height: 8px;
          border-radius: 4px;
          box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.3);
        }

        input[type='range'].slider-horizontal::-moz-range-track {
          background: transparent;
          border: none;
        }

        input[type='range'].slider-horizontal::-moz-range-progress {
          background: linear-gradient(to right, #B49B73, rgba(180, 155, 115, 0.7));
          height: 8px;
          border-radius: 4px;
          box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.3);
        }
      `}</style>
    </div>
  );
}
