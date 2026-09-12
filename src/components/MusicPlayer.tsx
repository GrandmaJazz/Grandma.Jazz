// frontend/src/components/MusicPlayer.tsx
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { motion, AnimatePresence, useMotionValue, animate } from 'framer-motion';
import { getFileUrl } from '@/utils/fileHelper';

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
  const [allCards, setAllCards] = useState<any[]>([]);

  const constraintsRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const draggedRef = useRef<boolean>(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

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
    const t = setTimeout(clamp, isExpanded ? 340 : 0);
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
        const response = await fetch('/api/cards');
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

  // Navigate back to albums (scroll to top to trigger hero)
  const handleBackToAlbums = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle album selection from fan
  const handleSelectAlbum = (card: any) => {
    playCard(card);
    setIsExpanded(false);
  };

  // Calculate fan positions for album carousel
  const fanAlbums = useMemo(() => {
    if (allCards.length === 0) return [];
    const maxFanAlbums = 5;
    const currentIndex = currentCard ? allCards.findIndex(c => c._id === currentCard._id) : -1;
    
    if (allCards.length <= maxFanAlbums) {
      return allCards;
    }
    
    // Show current album + 2 before and 2 after
    let start = Math.max(0, currentIndex - 2);
    let end = Math.min(allCards.length, start + maxFanAlbums);
    if (end - start < maxFanAlbums) start = Math.max(0, end - maxFanAlbums);
    
    return allCards.slice(start, end);
  }, [allCards, currentCard]);

  // Calculate position for each album in fan
  const getAlbumFanPosition = (index: number) => {
    const total = fanAlbums.length;
    const angle = (index - (total - 1) / 2) * 25; // 25 degrees between albums
    const radius = 90;
    const x = Math.sin((angle * Math.PI) / 180) * radius;
    const y = Math.cos((angle * Math.PI) / 180) * radius - radius * 0.3;
    return { x, y, angle };
  };

  if (!isVisible || !currentCard || !currentMusic || heroActive || pathname !== '/') {
    return null;
  }

  return (
    <div ref={constraintsRef} className="fixed inset-0 z-50 pointer-events-none">
      <motion.div
        ref={cardRef}
        drag
        dragConstraints={constraintsRef}
        dragMomentum={false}
        dragElastic={0.05}
        onDragStart={() => { draggedRef.current = true; setIsDragging(true); }}
        onDragEnd={() => { setIsDragging(false); }}
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        whileTap={{ scale: 0.98 }}
        style={{ x, y, touchAction: 'none', bottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
        className={`pointer-events-auto absolute right-4 select-none will-change-transform ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      >
        {/* Collapsed state: Small square with album art - CLICKABLE BUTTON */}
        <AnimatePresence mode="wait">
          {!isExpanded && (
            <motion.div
              key="collapsed"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              className="relative"
            >
              <button
                onClick={(e) => { e.stopPropagation(); handleCardClick(); }}
                onPointerDown={(e) => e.stopPropagation()}
                className="group w-16 h-16 sm:w-20 sm:h-20 rounded-box overflow-hidden border-2 border-[#B49B73]/75 shadow-lg shadow-[#0A0A0A]/40 transition-all duration-200 hover:border-[#B49B73] focus:outline-none focus:ring-2 focus:ring-[#B49B73]/50 cursor-pointer"
                title="Click to expand"
                style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
              >
                <img
                  src={getFileUrl(currentCard.imagePath)}
                  alt={currentCard.title}
                  className="w-full h-full object-cover object-center"
                  draggable={false}
                />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Expanded state: Larger square with controls (20% smaller) */}
        <AnimatePresence mode="wait">
          {isExpanded && (
            <motion.div
              key="expanded"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              className="relative"
            >
              <div className="w-[230px] sm:w-64 backdrop-blur-xl bg-[#181818]/80 border-2 border-[#B49B73]/75 rounded-box p-3 sm:p-5 shadow-xl shadow-[#0A0A0A]/40">
                {/* Album art */}
                <div className="w-full aspect-square overflow-hidden rounded-box border-[1.5px] border-[#B49B73]/70 mb-3 sm:mb-4 transition-all duration-200 hover:border-[#B49B73] hover:bg-[#B49B73]/5">
                  <img
                    src={getFileUrl(currentCard.imagePath)}
                    alt={currentCard.title}
                    className="w-full h-full object-cover object-center"
                    draggable={false}
                  />
                </div>

                {/* Controls layout: Back button + Play button in row, Volume slider below */}
                <div className="flex flex-col items-center gap-3 sm:gap-4">
                  {/* Button row: Back + Play */}
                  <div className="flex items-center justify-center gap-4">
                    {/* Back/Close button to go back to albums */}
                    <button
                      className="w-11 h-11 sm:w-12 sm:h-12 bg-[#B49B73]/20 hover:bg-[#B49B73]/30 rounded-full transition-all duration-150 flex items-center justify-center hover:scale-105 active:scale-90 shadow-sm flex-shrink-0"
                      onClick={handleBackToAlbums}
                      onPointerDown={(e) => e.stopPropagation()}
                      title="Back to albums"
                      style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 text-[#B49B73]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 12H5M12 19l-7-7 7-7"/>
                      </svg>
                    </button>

                    {/* Play/Pause button */}
                    <button
                      className="w-14 h-14 sm:w-16 sm:h-16 bg-[#B49B73] hover:bg-[#A98D60] rounded-full transition-all duration-150 flex items-center justify-center hover:scale-105 active:scale-90 shadow-lg shadow-[#0A0A0A]/30 flex-shrink-0"
                      onClick={(e) => { e.stopPropagation(); isPlaying ? pause() : play(); }}
                      onPointerDown={(e) => e.stopPropagation()}
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

                  {/* Horizontal Volume slider */}
                  <div className="w-full flex items-center gap-2 pointer-events-auto">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4 text-[#e3dcd4]/60 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 5L6 9H2v6h4l5 4z"></path>
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                    </svg>

                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={volume}
                      onChange={(e) => setVolume(parseFloat(e.target.value))}
                      onClick={(e) => e.stopPropagation()}
                      onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                      onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                      onTouchStart={(e) => { e.stopPropagation(); e.preventDefault(); }}
                      className="flex-1 h-1 bg-[#B49B73]/20 rounded-full appearance-none cursor-pointer accent-[#B49B73] slider-horizontal"
                      style={{
                        WebkitTapHighlightColor: 'transparent',
                        touchAction: 'none',
                      } as any}
                      title="Volume"
                    />

                    <div className="text-xs text-[#e3dcd4]/50 whitespace-nowrap w-7 text-right">{Math.round(volume * 100)}%</div>
                  </div>
                </div>

                {/* Album fan carousel */}
                {fanAlbums.length > 1 && (
                  <div className="relative h-20 sm:h-28 flex items-center justify-center mt-2 sm:mt-3">
                    <div className="relative w-full h-full">
                      {fanAlbums.map((album, idx) => {
                        const { x, y, angle } = getAlbumFanPosition(idx);
                        const isSelected = album._id === currentCard._id;
                        return (
                          <motion.button
                            key={album._id}
                            onClick={(e) => { e.stopPropagation(); handleSelectAlbum(album); }}
                            onPointerDown={(e) => e.stopPropagation()}
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1, x, y, rotateZ: angle }}
                            exit={{ opacity: 0, scale: 0 }}
                            transition={{ duration: 0.3, delay: idx * 0.05 }}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            className={`absolute w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden border-2 transition-all duration-150 ${
                              isSelected ? 'border-[#B49B73] shadow-lg shadow-[#B49B73]/50' : 'border-[#B49B73]/40 hover:border-[#B49B73]/70'
                            }`}
                            style={{
                              left: '50%',
                              top: '50%',
                              transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) rotateZ(${angle}deg)`,
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
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <style jsx>{`
        input[type='range'].slider-horizontal {
          -webkit-appearance: none;
          appearance: none;
        }
        input[type='range'].slider-horizontal::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #B49B73;
          cursor: pointer;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
        }
        input[type='range'].slider-horizontal::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #B49B73;
          cursor: pointer;
          border: none;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
        }
        input[type='range'].slider-horizontal::-webkit-slider-runnable-track {
          background: #B49B73/20;
          height: 4px;
          border-radius: 2px;
        }
        input[type='range'].slider-horizontal::-moz-range-track {
          background: transparent;
          border: none;
        }
        input[type='range'].slider-horizontal::-moz-range-progress {
          background: #B49B73;
          height: 4px;
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}
