// frontend/src/components/MusicPlayer.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { motion, AnimatePresence } from 'framer-motion';
import { getFileUrl } from '@/utils/fileHelper';
import { cleanDisplayTitle } from '@/utils/helpers';

export default function MusicPlayer() {
  const {
    currentCard,
    currentMusic,
    isPlaying,
    volume,
    play,
    pause,
    nextTrack,
    previousTrack,
    toggleMute,
    clearMusicCache,
  } = useMusicPlayer();

  const router = useRouter();
  const pathname = usePathname();

  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [heroActive, setHeroActive] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const constraintsRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const draggedRef = useRef<boolean>(false);

  // Show the player once music has been selected.
  useEffect(() => {
    if (currentCard && currentMusic) setIsVisible(true);
  }, [currentCard, currentMusic]);

  // Hide the player while the hero record-player + centred logo are on screen
  // so it never covers them (esp. on mobile). Mirrors ConditionalHeader.
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

  // Clicking anywhere outside the card collapses it back to the mini bar.
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

  const formatTitle = (title: string, maxLength = 20) => {
    if (!title) return '';
    const clean = cleanDisplayTitle(title);
    if (clean.length <= maxLength) return clean;
    return clean.substring(0, maxLength - 3) + '...';
  };

  const handleGoHomeAndRefresh = () => {
    clearMusicCache();
    localStorage.removeItem('heroSectionHidden');
    router.push('/');
    setTimeout(() => window.location.reload(), 100);
  };

  // A real click on the card body (not a drag, not a control) toggles expand.
  const handleCardClick = () => {
    if (draggedRef.current) { draggedRef.current = false; return; }
    setIsExpanded((v) => !v);
  };

  if (!isVisible || !currentCard || !currentMusic || heroActive) return null;

  return (
    <div ref={constraintsRef} className="fixed inset-0 z-50 pointer-events-none">
      <motion.div
        ref={cardRef}
        drag
        dragConstraints={constraintsRef}
        dragMomentum={false}
        dragElastic={0.12}
        onDragStart={() => { draggedRef.current = true; setIsDragging(true); }}
        onDragEnd={() => { setIsDragging(false); }}
        onClick={handleCardClick}
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        whileHover={{ scale: 1.015 }}
        whileTap={{ scale: 0.985 }}
        style={{ touchAction: 'none', bottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
        className={`pointer-events-auto absolute right-4 select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} ${isExpanded ? 'w-[min(36rem,calc(100vw-2rem))]' : 'w-auto'}`}
      >
        <div className="relative">
          {/* Glass background */}
          <div className="absolute inset-0 backdrop-blur-xl bg-[#181818]/80 border border-[#B49B73]/30 shadow-lg shadow-[#0A0A0A]/30 rounded-box overflow-hidden">
            <div className="absolute inset-0 opacity-20 bg-gradient-to-r from-[#B49B73] via-[#e3dcd4] to-[#B49B73] animate-gradient-shift"></div>
            <div
              className="absolute inset-0 opacity-20 mix-blend-overlay"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                backgroundSize: '150px',
                backgroundRepeat: 'repeat',
              }}
            />
          </div>

          <div className={`relative flex items-center transition-all duration-300 ease-out rounded-box ${isExpanded ? 'p-3 sm:p-4' : 'p-2'}`}>
            {/* Mini section (album art + names) — clicking anywhere here expands */}
            <div className="flex items-center flex-shrink-0">
              {/* Album art (visual only — pulses while playing) */}
              <div className="relative flex-shrink-0">
                <div
                  className={`w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-control overflow-hidden border-2 border-[#B49B73]/40 flex items-center justify-center ${isPlaying ? 'ring-4 ring-[#B49B73]/20 animate-pulse-slow' : ''} transition-transform duration-300 ease-out`}
                >
                  <img
                    src={getFileUrl(currentCard.imagePath)}
                    alt={currentCard.title}
                    className="w-full h-full object-cover object-center pointer-events-none"
                    draggable={false}
                  />
                </div>
              </div>

              {/* Names — album leads (matches the cover), track sits dim below */}
              <div className="ml-2 sm:ml-3 overflow-hidden max-w-[120px] sm:max-w-[170px] md:max-w-[200px]">
                <div className="truncate text-[#e3dcd4] font-medium text-xs sm:text-sm">
                  {formatTitle(currentCard.title)}
                </div>
                <div className="truncate text-[#e3dcd4]/70 text-xs">
                  {formatTitle(currentMusic.title, 18)}
                </div>
              </div>
            </div>

            {/* Expanded controls */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-1 items-center ml-2 sm:ml-4 justify-end"
                >
                  <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-3">
                    {/* Previous */}
                    <button
                      className="p-1 md:p-2 text-[#e3dcd4]/80 hover:text-[#e3dcd4] transition-all duration-150 rounded-full hover:bg-[#B49B73]/20 active:bg-[#B49B73]/40 hover:scale-110 active:scale-90"
                      onClick={(e) => { e.stopPropagation(); previousTrack(); }}
                      onPointerDown={(e) => e.stopPropagation()}
                      title="Previous track"
                      style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="19 20 9 12 19 4 19 20"></polygon>
                        <line x1="5" y1="19" x2="5" y2="5"></line>
                      </svg>
                    </button>

                    {/* Play / Pause */}
                    <button
                      className="p-1.5 sm:p-2 text-[#0A0A0A] bg-[#B49B73] hover:bg-[#A98D60] rounded-full transition-all duration-150 flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 hover:scale-105 active:scale-90 shadow-sm shadow-[#0A0A0A]/30"
                      onClick={(e) => { e.stopPropagation(); isPlaying ? pause() : play(); }}
                      onPointerDown={(e) => e.stopPropagation()}
                      title={isPlaying ? 'Pause' : 'Play'}
                      style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                    >
                      {isPlaying ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" viewBox="0 0 24 24" fill="currentColor" strokeWidth="0">
                          <rect x="7" y="6" width="3" height="12" rx="1" />
                          <rect x="14" y="6" width="3" height="12" rx="1" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 ml-0.5" viewBox="0 0 24 24" fill="currentColor" strokeWidth="0">
                          <path d="M6 4l15 8-15 8z" />
                        </svg>
                      )}
                    </button>

                    {/* Next */}
                    <button
                      className="p-1 md:p-2 text-[#e3dcd4]/80 hover:text-[#e3dcd4] transition-all duration-150 rounded-full hover:bg-[#B49B73]/20 active:bg-[#B49B73]/40 hover:scale-110 active:scale-90"
                      onClick={(e) => { e.stopPropagation(); nextTrack(); }}
                      onPointerDown={(e) => e.stopPropagation()}
                      title="Next track"
                      style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="5 4 15 12 5 20 5 4"></polygon>
                        <line x1="19" y1="5" x2="19" y2="19"></line>
                      </svg>
                    </button>

                    {/* Volume */}
                    <button
                      className="p-1 sm:p-1.5 text-[#e3dcd4]/80 hover:text-[#e3dcd4] transition-all duration-150 rounded-full hover:bg-[#B49B73]/20 active:bg-[#B49B73]/40 hover:scale-110 active:scale-90"
                      onClick={(e) => { e.stopPropagation(); toggleMute(); }}
                      onPointerDown={(e) => e.stopPropagation()}
                      title={volume === 0 ? 'Unmute' : 'Mute'}
                      style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                    >
                      {volume === 0 ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 5L6 9H2v6h4l5 4z"></path>
                          <line x1="23" y1="9" x2="17" y2="15"></line>
                          <line x1="17" y1="9" x2="23" y2="15"></line>
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 5L6 9H2v6h4l5 4z"></path>
                          <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                          <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                        </svg>
                      )}
                    </button>

                    {/* Back to playlist */}
                    <button
                      className="ml-1 sm:ml-2 pl-2 sm:pl-3 border-l border-[#B49B73]/25 p-1 sm:p-1.5 text-[#e3dcd4]/70 hover:text-[#e3dcd4] transition-all duration-150 rounded-full hover:bg-[#B49B73]/20 active:bg-[#B49B73]/40 hover:scale-110 active:scale-90"
                      onClick={(e) => { e.stopPropagation(); handleGoHomeAndRefresh(); }}
                      onPointerDown={(e) => e.stopPropagation()}
                      title="Back to playlist"
                      style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                        <polyline points="9 22 9 12 15 12 15 22"></polyline>
                      </svg>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Global styles */}
        <style jsx global>{`
          @keyframes pulse-slow {
            0%, 100% { box-shadow: 0 0 0 0 rgba(180, 155, 115, 0.3); }
            50% { box-shadow: 0 0 0 8px rgba(180, 155, 115, 0); }
          }
          @keyframes gradient-shift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          .animate-pulse-slow { animation: pulse-slow 2s infinite; }
          .animate-gradient-shift { background-size: 200% 200%; animation: gradient-shift 8s ease infinite; }
        `}</style>
      </motion.div>
    </div>
  );
}
