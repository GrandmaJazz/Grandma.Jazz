'use client';

import { useState, useEffect, useRef } from 'react';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';

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
    setVolume,
    toggleMute
  } = useMusicPlayer();
  
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<string>('0:00');
  const [duration, setDuration] = useState<string>('0:00');
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // ฟังก์ชันแปลงวินาทีเป็นรูปแบบ mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  // สลับการซ่อน/แสดงเครื่องเล่น
  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };
  
  // จัดการเมื่อเพลงจบ
  useEffect(() => {
    const audioElement = audioRef.current;
    if (!audioElement) return;
    
    const handleEnded = () => {
      // เรียกใช้ nextTrack เพื่อเล่นเพลงถัดไป
      nextTrack();
    };
    
    audioElement.addEventListener('ended', handleEnded);
    
    return () => {
      audioElement.removeEventListener('ended', handleEnded);
    };
  }, [nextTrack]);
  
  // อัพเดทแถบแสดงความคืบหน้าและเวลาเล่น
  useEffect(() => {
    if (!currentMusic || !audioRef.current) return;
    
    // ตั้งค่าเวลาเริ่มต้น
    setCurrentTime('0:00');
    setDuration(formatTime(currentMusic.duration));
    
    // อัพเดทความคืบหน้าทุก 1 วินาที
    const updateProgress = () => {
      const audio = audioRef.current;
      if (!audio || !audio.duration) return;
      
      const percent = (audio.currentTime / audio.duration) * 100;
      setProgressPercent(percent);
      setCurrentTime(formatTime(audio.currentTime));
      setDuration(formatTime(audio.duration));
    };
    
    audioRef.current.addEventListener('timeupdate', updateProgress);
    
    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener('timeupdate', updateProgress);
      }
    };
  }, [currentMusic]);
  
  // แสดง Music Player เมื่อมีเพลงเล่น
  useEffect(() => {
    if (currentCard && currentMusic) {
      setIsVisible(true);
    }
  }, [currentCard, currentMusic]);
  
  // ถ้าไม่มีเพลงเล่น ไม่ต้องแสดง
  if (!isVisible || !currentCard || !currentMusic) {
    return null;
  }
  
  // ฟังก์ชันสำหรับเลื่อนแถบความคืบหน้า
  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return;
    
    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newPercentage = (clickX / rect.width) * 100;
    
    // อัพเดทตำแหน่งการเล่น
    audioRef.current.currentTime = (newPercentage / 100) * audioRef.current.duration;
  };
  
  return (
    <div className={`fixed left-0 right-0 bg-[#0A0A0A]/90 backdrop-blur-sm border-t border-[#7c4d33]/30 text-[#F5F1E6] z-50 transition-all duration-300 ${isCollapsed ? 'bottom-[-120px] md:bottom-[-100px]' : 'bottom-0'}`}>
      {/* ติ่งสำหรับซ่อน/แสดงเครื่องเล่น */}
      <div className="absolute top-[-20px] left-1/2 transform -translate-x-1/2">
        <button 
          onClick={toggleCollapse}
          className="w-10 h-5 bg-[#0A0A0A] border-t border-l border-r border-[#7c4d33]/30 rounded-t-lg flex items-center justify-center"
          aria-label={isCollapsed ? "Expand music player" : "Collapse music player"}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="12" 
            height="12" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            className={`transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}
          >
            <polyline points="18 15 12 9 6 15"></polyline>
          </svg>
        </button>
      </div>
      
      <div className="container mx-auto px-2 md:px-4 py-3">
        <div className="flex flex-col md:flex-row items-center">
          {/* แสดงข้อมูลเพลงและการ์ด */}
          <div className="flex items-center w-full md:w-auto mb-3 md:mb-0">
            <div className="w-12 h-12 rounded-md overflow-hidden mr-3 flex-shrink-0">
              <img 
                src={`${process.env.NEXT_PUBLIC_API_URL}${currentCard.imagePath}`}
                alt="Music cover"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0 overflow-hidden">
              <div className="font-semibold truncate relative max-w-[200px] sm:max-w-[250px] md:max-w-[300px]">
                <div className="music-marquee-container">
                  <div className="music-marquee">
                    {currentMusic.title}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* ส่วนควบคุมการเล่น */}
          <div className="flex flex-col items-center justify-center flex-1 w-full md:w-auto">
            <div className="flex items-center justify-center space-x-4 mb-2">
              <button 
                className="focus:outline-none text-[#F5F1E6] hover:text-[#D4AF37] transition-colors"
                onClick={previousTrack}
                aria-label="Previous track"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="19 20 9 12 19 4 19 20"></polygon>
                  <line x1="5" y1="19" x2="5" y2="5"></line>
                </svg>
              </button>
              
              <button 
                className="focus:outline-none w-10 h-10 rounded-full bg-[#D4AF37] text-[#0A0A0A] flex items-center justify-center hover:bg-[#b88c41] transition-colors"
                onClick={isPlaying ? pause : play}
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="6" y="4" width="4" height="16"></rect>
                    <rect x="14" y="4" width="4" height="16"></rect>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                )}
              </button>
              
              <button 
                className="focus:outline-none text-[#F5F1E6] hover:text-[#D4AF37] transition-colors"
                onClick={nextTrack}
                aria-label="Next track"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 4 15 12 5 20 5 4"></polygon>
                  <line x1="19" y1="5" x2="19" y2="19"></line>
                </svg>
              </button>
            </div>
            
            {/* แถบความคืบหน้า */}
            <div className="w-full flex items-center px-2 md:px-8 max-w-md">
              <span className="text-xs text-[#e3dcd4] w-10">{currentTime}</span>
              <div 
                className="flex-1 mx-2 h-1 bg-[#31372b] rounded-full overflow-hidden cursor-pointer"
                onClick={handleProgressBarClick}
              >
                <div 
                  className="h-full bg-[#D4AF37]" 
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
              <span className="text-xs text-[#e3dcd4] w-10 text-right">{duration}</span>
            </div>
          </div>
          
          {/* ส่วนควบคุมเสียง */}
          <div className="flex items-center space-x-2 mt-3 md:mt-0 md:ml-4">
            <button 
              className="focus:outline-none text-[#F5F1E6] hover:text-[#D4AF37] transition-colors"
              onClick={toggleMute}
              aria-label={volume === 0 ? "Unmute" : "Mute"}
            >
              {volume === 0 ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 5L6 9H2v6h4l5 4z"></path>
                  <line x1="23" y1="9" x2="17" y2="15"></line>
                  <line x1="17" y1="9" x2="23" y2="15"></line>
                </svg>
              ) : volume < 0.5 ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 5L6 9H2v6h4l5 4z"></path>
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 5L6 9H2v6h4l5 4z"></path>
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                </svg>
              )}
            </button>
            
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-20 md:w-24 accent-[#D4AF37]"
              aria-label="Volume control"
            />
          </div>
        </div>
      </div>
      
      {/* สร้าง audio element สำหรับเล่นเพลงและวิเคราะห์เสียง */}
      <audio 
        ref={audioRef} 
        src={`${process.env.NEXT_PUBLIC_API_URL}${currentMusic.filePath}`}
        loop={currentCard.music.length === 1} // ถ้ามีเพลงเดียวให้วนลูป
      />
      
      {/* สไตล์สำหรับ marquee effect */}
      <style jsx>{`
        .music-marquee-container {
          overflow: hidden;
          white-space: nowrap;
          width: 100%;
        }
        
        .music-marquee {
          display: inline-block;
          padding-right: 50px;
          animation: marquee 15s linear infinite;
        }
        
        @keyframes marquee {
          0% { transform: translate(0, 0); }
          45% { transform: translate(0, 0); }
          50% { transform: translate(-100%, 0); }
          95% { transform: translate(-100%, 0); }
          100% { transform: translate(0, 0); }
        }
      `}</style>
    </div>
  );
}