// frontend/src/components/MusicPlayer.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'; // เพิ่ม import
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { motion, AnimatePresence } from 'framer-motion';
import { getFileUrl } from '@/utils/fileHelper';

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
  
  const router = useRouter(); // เพิ่ม router
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  
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
  
  // แปลงชื่อเพลงให้สั้นลงถ้ายาวเกินไป
  const formatTitle = (title: string, maxLength = 20) => {
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength - 3) + '...';
  };

  // ฟังก์ชันสำหรับไปหน้า Home และ Refresh
  const handleGoHomeAndRefresh = () => {
    router.push('/'); // ไปหน้า Home
    setTimeout(() => {
      window.location.reload(); // Refresh หน้าเว็บ
    }, 100); // เพิ่ม delay เล็กน้อยเพื่อให้การนำทางเสร็จก่อน
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
            {/* Album art - เปลี่ยนเป็นปุ่มไปหน้า Home */}
            <div className="relative flex-shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation(); // ป้องกันไม่ให้ trigger การขยาย/ย่อ player
                  handleGoHomeAndRefresh();
                }}
                className={`
                  w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full overflow-hidden border-2 border-[#7c4d33]/40
                  ${isPlaying ? 'ring-4 ring-[#b88c41]/20 animate-pulse-slow' : ''}
                  transition-all duration-300 ease-in-out transform hover:scale-105 cursor-pointer
                  hover:ring-4 hover:ring-[#b88c41]/30
                `}
                title="Playlist"
              >
                <img 
                  src={getFileUrl(currentCard.imagePath)}
                  alt={currentCard.title}
                  className="w-full h-full object-cover"
                />
                
                {/* Refresh icon overlay - แสดงเมื่อ hover */}
                <div className="absolute inset-0 flex items-center justify-center bg-[#0A0A0A]/70 rounded-full opacity-0 hover:opacity-100 transition-opacity">
                  <svg 
                    className="w-4 h-4 sm:w-5 sm:h-5 text-[#e3dcd4]" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  >
                    <path d="M1 4v6h6"/>
                    <path d="M23 20v-6h-6"/>
                    <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
                  </svg>
                </div>
              </button>
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
                title="Expand player controls"
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
                    title="Previous track"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="19 20 9 12 19 4 19 20"></polygon>
                      <line x1="5" y1="19" x2="5" y2="5"></line>
                    </svg>
                  </button>
                  
                  {/* Main Play/Pause Button */}
                  <button 
                    className="p-1.5 sm:p-2 text-[#0A0A0A] bg-[#b88c41] hover:bg-[#7c4d33] rounded-full transition-colors flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10"
                    onClick={isPlaying ? pause : play}
                    title={isPlaying ? "Pause" : "Play"}
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
                  
                  <button 
                    className="p-1 md:p-2 text-[#e3dcd4]/80 hover:text-[#e3dcd4] transition-colors rounded-full hover:bg-[#7c4d33]/20"
                    onClick={nextTrack}
                    title="Next track"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="5 4 15 12 5 20 5 4"></polygon>
                      <line x1="19" y1="5" x2="19" y2="19"></line>
                    </svg>
                  </button>
                  
                  {/* Volume Toggle Button */}
                  <button 
                    className="p-1 sm:p-1.5 text-[#e3dcd4]/80 hover:text-[#e3dcd4] transition-colors rounded-full hover:bg-[#7c4d33]/20"
                    onClick={toggleMute}
                    title={volume === 0 ? "Unmute" : "Mute"}
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
                  
                  {/* Minimize button (visible only in expanded mode) */}
                  <button 
                    className="ml-1 sm:ml-2 p-1 md:p-1.5 text-[#e3dcd4]/70 hover:text-[#e3dcd4] transition-colors rounded-full hover:bg-[#7c4d33]/20"
                    onClick={() => setIsExpanded(false)}
                    title="Minimize player"
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
      `}</style>
    </motion.div>
  );
}