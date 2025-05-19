'use client';

import { useState, useEffect, useRef } from 'react';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function MusicPlayer() {
  const {
    currentCard,
    currentMusic,
    isPlaying,
    volume,
    currentTime,
    duration,
    play,
    pause,
    nextTrack,
    previousTrack,
    setVolume,
    toggleMute,
  } = useMusicPlayer();
  
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [showVolumeSlider, setShowVolumeSlider] = useState<boolean>(false);
  
  // ยังคงการคำนวณเปอร์เซ็นต์ความคืบหน้าไว้แต่ไม่แสดงผล
  useEffect(() => {
    if (duration > 0) {
      const percent = (currentTime / duration) * 100;
      setProgressPercent(percent);
    }
  }, [currentTime, duration]);
  
  // Show player when music is selected
  useEffect(() => {
    if (currentCard && currentMusic) {
      setIsVisible(true);
    }
  }, [currentCard, currentMusic]);
  
  // Handle click outside volume slider to close it
  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      const target = event.target as HTMLElement;
      if (showVolumeSlider && !target.closest('#volume-control')) {
        setShowVolumeSlider(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showVolumeSlider]);
  
  // แปลงชื่อเพลงให้สั้นลงถ้ายาวเกินไป
  const formatTitle = (title: string, maxLength: number = 20) => {
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength - 3) + '...';
  };

  if (!isVisible || !currentCard || !currentMusic) {
    return null;
  }
  
  return (
    <motion.div 
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", damping: 20, stiffness: 100 }}
      className="fixed bottom-4 left-0 right-0 z-50 flex justify-center px-2 sm:px-4"
    >
      <div className={`relative ${isExpanded ? 'w-full max-w-xl' : 'w-auto'}`}>
        {/* Glass effect background */}
        <div className={`
          absolute inset-0 backdrop-blur-xl bg-[#0A0A0A]/80 border border-[#7c4d33]/40
          shadow-lg shadow-[#0A0A0A]/30 transition-all duration-300 overflow-hidden
          ${isExpanded ? 'rounded-2xl' : 'rounded-full'}
        `}>
          {/* Ambient gradient background */}
          <div className="absolute inset-0 opacity-20 bg-gradient-to-r from-[#7c4d33] via-[#b88c41] to-[#7c4d33] animate-gradient-shift"></div>
          
          {/* Noise texture */}
          <div 
            className="absolute inset-0 opacity-20 mix-blend-overlay"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
              backgroundSize: '150px',
              backgroundRepeat: 'repeat'
            }}
          />
        </div>
        
        <div className={`
          relative flex items-center transition-all duration-300 ease-out
          ${isExpanded ? 'p-3 sm:p-4 rounded-2xl' : 'p-2 rounded-full'}
        `}>
          {/* Mini player (always visible) */}
          <div className="flex items-center flex-shrink-0" onClick={() => setIsExpanded(!isExpanded)}>
            {/* Album art with pulse animation when playing */}
            <div className="relative flex-shrink-0">
              <div className={`
                w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full overflow-hidden border-2 border-[#7c4d33]/40
                ${isPlaying ? 'ring-4 ring-[#b88c41]/20 animate-pulse-slow' : ''}
                transition-all duration-300 ease-in-out transform hover:scale-105
              `}>
                <img 
                  src={`${process.env.NEXT_PUBLIC_API_URL}${currentCard.imagePath}`}
                  alt={currentCard.title}
                  className="w-full h-full object-cover"
                />
              </div>
              
              {/* Play/Pause overlay on small screens */}
              {!isExpanded && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    isPlaying ? pause() : play();
                  }}
                  className="absolute inset-0 flex items-center justify-center bg-[#0A0A0A]/50 rounded-full opacity-0 hover:opacity-100 transition-opacity"
                >
                  {isPlaying ? (
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[#e3dcd4]" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="6" y="4" width="4" height="16" rx="1" />
                      <rect x="14" y="4" width="4" height="16" rx="1" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[#e3dcd4]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>
              )}
            </div>
            
            {/* Song info - ป้องกันข้อความล้น */}
            <div className="ml-2 sm:ml-3 overflow-hidden max-w-[90px] sm:max-w-[140px] md:max-w-[180px]">
              <div className="truncate text-[#e3dcd4] font-medium text-xs sm:text-sm">
                {formatTitle(currentMusic.title)}
              </div>
              <div className="truncate text-[#e3dcd4]/70 text-xs">
                {formatTitle(currentCard.title, 16)}
              </div>
            </div>
            
            {/* Expanding button for mobile */}
            {!isExpanded && (
              <button 
                className="ml-1 sm:ml-2 text-[#e3dcd4]/70 hover:text-[#e3dcd4]"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(true);
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
          
          {/* Expanded player controls */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex flex-1 items-center ml-2 sm:ml-4 justify-end"
              >
                {/* Playback controls */}
                <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-3">
                  <button 
                    className="p-1 md:p-2 text-[#e3dcd4]/80 hover:text-[#e3dcd4] transition-colors rounded-full hover:bg-[#7c4d33]/20"
                    onClick={previousTrack}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="19 20 9 12 19 4 19 20"></polygon>
                      <line x1="5" y1="19" x2="5" y2="5"></line>
                    </svg>
                  </button>
                  
                  <button 
                    className="p-1.5 sm:p-2 text-[#0A0A0A] bg-[#b88c41] hover:bg-[#7c4d33] rounded-full transition-colors"
                    onClick={isPlaying ? pause : play}
                  >
                    {isPlaying ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="6" y="4" width="4" height="16"></rect>
                        <rect x="14" y="4" width="4" height="16"></rect>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                      </svg>
                    )}
                  </button>
                  
                  <button 
                    className="p-1 md:p-2 text-[#e3dcd4]/80 hover:text-[#e3dcd4] transition-colors rounded-full hover:bg-[#7c4d33]/20"
                    onClick={nextTrack}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="5 4 15 12 5 20 5 4"></polygon>
                      <line x1="19" y1="5" x2="19" y2="19"></line>
                    </svg>
                  </button>
                  
                  {/* ส่วนควบคุมเสียงแบบใหม่ (แนวตั้ง) */}
                  <div id="volume-control" className="relative ml-1 sm:ml-2">
                    <button 
                      className="p-1 sm:p-1.5 text-[#e3dcd4]/80 hover:text-[#e3dcd4] transition-colors rounded-full hover:bg-[#7c4d33]/20"
                      onClick={() => {
                        if (showVolumeSlider) {
                          setShowVolumeSlider(false);
                        } else {
                          toggleMute();
                          // แสดงตัวเลื่อนเมื่อกดค้างหรือแตะนาน
                          const longPressTimer = setTimeout(() => {
                            setShowVolumeSlider(true);
                          }, 500);
                          
                          // ยกเลิกการแสดงตัวเลื่อนเมื่อปล่อยปุ่มเร็วเกินไป
                          const clearTimer = () => clearTimeout(longPressTimer);
                          document.addEventListener('mouseup', clearTimer, { once: true });
                          document.addEventListener('touchend', clearTimer, { once: true });
                        }
                      }}
                      onContextMenu={(e) => {
                        // ป้องกันเมนูคลิกขวา
                        e.preventDefault();
                        setShowVolumeSlider(true);
                      }}
                      onMouseEnter={() => setShowVolumeSlider(true)}
                    >
                      {volume === 0 ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 5L6 9H2v6h4l5 4z"></path>
                          <line x1="23" y1="9" x2="17" y2="15"></line>
                          <line x1="17" y1="9" x2="23" y2="15"></line>
                        </svg>
                      ) : volume < 0.5 ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 5L6 9H2v6h4l5 4z"></path>
                          <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 5L6 9H2v6h4l5 4z"></path>
                          <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                          <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                        </svg>
                      )}
                    </button>
                    
                    {/* ตัวเลื่อนปรับเสียงแนวตั้ง */}
                    <AnimatePresence>
                      {showVolumeSlider && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          transition={{ duration: 0.15 }}
// เพิ่มระยะห่างด้านบน
className="absolute bottom-full left-1/1 transform -translate-x-1/2  p-3 bg-[#0A0A0A]/90 backdrop-blur-lg rounded-lg shadow-xl border border-[#7c4d33]/40"
                          onMouseLeave={() => setShowVolumeSlider(false)}
                        >
                          <div className="h-24 flex flex-col items-center justify-center">
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.01"
                              value={volume}
                              onChange={(e) => setVolume(parseFloat(e.target.value))}
                              className="vertical-volume-slider"
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  
                  {/* Minimize button (visible only in expanded mode) */}
                  <button 
                    className="ml-1 sm:ml-2 p-1 md:p-1.5 text-[#e3dcd4]/70 hover:text-[#e3dcd4] transition-colors rounded-full hover:bg-[#7c4d33]/20"
                    onClick={() => setIsExpanded(false)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
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
          0%, 100% { box-shadow: 0 0 0 0 rgba(184, 140, 65, 0.3); }
          50% { box-shadow: 0 0 0 8px rgba(184, 140, 65, 0); }
        }
        
        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        .animate-pulse-slow {
          animation: pulse-slow 2s infinite;
        }
        
        .animate-gradient-shift {
          background-size: 200% 200%;
          animation: gradient-shift 8s ease infinite;
        }
        
        .shadow-glow {
          box-shadow: 0 0 8px 2px rgba(184, 140, 65, 0.3);
        }
        
        /* Custom styles for vertical range slider */
        .vertical-volume-slider {
          -webkit-appearance: none;
          width: 8px;
          height: 100%;
          background: rgba(124, 77, 51, 0.3);
          border-radius: 999px;
          transform: rotate(180deg);
        }
        
        .vertical-volume-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #b88c41;
          cursor: pointer;
          box-shadow: 0 0 5px rgba(184, 140, 65, 0.5);
        }
        
        .vertical-volume-slider::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #b88c41;
          cursor: pointer;
          border: none;
          box-shadow: 0 0 5px rgba(184, 140, 65, 0.5);
        }
      `}</style>
    </motion.div>
  );
}