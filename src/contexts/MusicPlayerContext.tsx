'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Howl, Howler } from 'howler';

// ประกาศ interface สำหรับเพลง
interface Music {
  _id: string;
  title: string;
  filePath: string;
  duration: number;
}

// ประกาศ interface สำหรับการ์ด
interface Card {
  _id: string;
  title: string;
  description: string;
  imagePath: string;
  music: Music[];
}

// ประกาศ interface สำหรับ context
interface MusicPlayerContextType {
  currentCard: Card | null;
  currentMusic: Music | null;
  isPlaying: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  playCard: (card: Card) => void;
  play: () => void;
  pause: () => void;
  nextTrack: () => void;
  previousTrack: () => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  seek: (position: number) => void;
}

// สร้าง context
const MusicPlayerContext = createContext<MusicPlayerContextType | undefined>(undefined);

// สร้าง provider
export function MusicPlayerProvider({ children }: { children: ReactNode }) {
  const [currentCard, setCurrentCard] = useState<Card | null>(null);
  const [playlist, setPlaylist] = useState<Music[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(-1);
  const [currentMusic, setCurrentMusic] = useState<Music | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.5);
  const [previousVolume, setPreviousVolume] = useState<number>(0.5);
  const [sound, setSound] = useState<Howl | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  
  // Cache keys
  const MUSIC_STATE_KEY = 'grandma_jazz_music_state';
  
  // โหลดสถานะจาก localStorage เมื่อเริ่มต้น
  useEffect(() => {
    try {
      const savedState = localStorage.getItem(MUSIC_STATE_KEY);
      if (savedState) {
        const state = JSON.parse(savedState);
        
        // ตรวจสอบว่าข้อมูลไม่เก่าเกินไป (1 ชั่วโมง)
        const maxAge = 60 * 60 * 1000; // 1 hour
        if (Date.now() - state.timestamp < maxAge) {
          console.log('Restoring music state from cache');
          
          if (state.currentCard) setCurrentCard(state.currentCard);
          if (state.playlist) setPlaylist(state.playlist);
          if (state.currentTrackIndex !== undefined) setCurrentTrackIndex(state.currentTrackIndex);
          if (state.currentMusic) setCurrentMusic(state.currentMusic);
          if (state.volume !== undefined) setVolume(state.volume);
          // ไม่เรียกเล่นเพลงอัตโนมัติ ให้ผู้ใช้กดเล่นเอง
        } else {
          // ลบ cache ที่หมดอายุ
          localStorage.removeItem(MUSIC_STATE_KEY);
          console.log('Removed expired music state cache');
        }
      }
    } catch (error) {
      console.warn('Failed to restore music state:', error);
      localStorage.removeItem(MUSIC_STATE_KEY);
    }
  }, []);
  
  // บันทึกสถานะลง localStorage เมื่อมีการเปลี่ยนแปลง
  useEffect(() => {
    try {
      if (currentMusic && currentCard) {
        const state = {
          currentCard,
          playlist,
          currentTrackIndex,
          currentMusic,
          volume,
          timestamp: Date.now()
        };
        
        localStorage.setItem(MUSIC_STATE_KEY, JSON.stringify(state));
        console.log('Music state saved to cache');
      }
    } catch (error) {
      console.warn('Failed to save music state:', error);
    }
  }, [currentCard, playlist, currentTrackIndex, currentMusic, volume]);

  // สร้าง interval สำหรับอัพเดทเวลาปัจจุบัน
  useEffect(() => {
    const interval = setInterval(() => {
      if (sound && isPlaying) {
        setCurrentTime(sound.seek() as number);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [sound, isPlaying]);

  // เล่นเพลงเมื่อ currentMusic เปลี่ยน
  useEffect(() => {
    if (currentMusic) {
      // ถ้ามีเสียงเก่าอยู่ ทำการหยุดและล้าง
      if (sound) {
        sound.stop();
        sound.unload();
      }
      
      // ตรวจสอบว่ามีเพลงเดียวหรือไม่
      const isSingleTrack = playlist.length === 1;
      
      // สร้าง Howl instance ใหม่สำหรับเพลงปัจจุบัน
      const newSound = new Howl({
        src: [`${process.env.NEXT_PUBLIC_API_URL}${currentMusic.filePath}`],
        html5: true, // ใช้ HTML5 Audio ช่วยในการสตรีมไฟล์ใหญ่
        volume: volume,
        loop: isSingleTrack, // เล่นซ้ำอัตโนมัติถ้ามีเพลงเดียว
        onend: () => {
          // เรียก nextTrack เฉพาะเมื่อมีหลายเพลง (ไม่ได้ตั้ง loop)
          if (!isSingleTrack) {
            console.log('Track ended, playing next track');
            nextTrack();
          } else {
            console.log('Track ended, looping single track');
            // สำหรับเพลงเดียว Howler จะเล่นซ้ำเองโดยอัตโนมัติเพราะเรากำหนด loop: true
          }
        },
        onload: () => {
          setDuration(newSound.duration());
        },
        onplay: () => {
          setIsPlaying(true);
        },
        onpause: () => {
          setIsPlaying(false);
        },
        onstop: () => {
          setIsPlaying(false);
        }
      });
      
      setSound(newSound);
      
      // ถ้า isPlaying เป็น true ให้เล่นเพลงทันที
      if (isPlaying) {
        newSound.play();
      }
    }
    
    // cleanup ตอน unmount
    return () => {
      if (sound) {
        sound.stop();
        sound.unload();
      }
    };
  }, [currentMusic, playlist.length]);

  // อัพเดทระดับเสียงเมื่อ volume เปลี่ยน
  useEffect(() => {
    if (sound) {
      sound.volume(volume);
    }
    
    // ตั้งค่าเสียงเริ่มต้นสำหรับเสียงใหม่ทั้งหมด
    Howler.volume(volume);
  }, [sound, volume]);

  // ฟังก์ชันสำหรับเล่นเพลงเมื่อเลือกการ์ด
  const playCard = (card: Card) => {
    if (!card.music || card.music.length === 0) return;
    
    // เก็บข้อมูลการ์ดปัจจุบัน
    setCurrentCard(card);
    
    // สร้าง playlist จากเพลงในการ์ด
    const newPlaylist = [...card.music];
    
    // สลับลำดับเพลงในรายการเฉพาะเมื่อมีมากกว่า 1 เพลง
    if (newPlaylist.length > 1) {
      for (let i = newPlaylist.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newPlaylist[i], newPlaylist[j]] = [newPlaylist[j], newPlaylist[i]];
      }
    }
    
    setPlaylist(newPlaylist);
    
    // เริ่มเล่นเพลงแรกในรายการ
    setCurrentTrackIndex(0);
    setCurrentMusic(newPlaylist[0]);
    setIsPlaying(true);
  };

  // ฟังก์ชันสำหรับเล่นเพลงถัดไป
  const nextTrack = () => {
    if (playlist.length === 0) return;
    
    // คำนวณ index ของเพลงถัดไป
    const nextIndex = (currentTrackIndex + 1) % playlist.length;
    
    setCurrentTrackIndex(nextIndex);
    setCurrentMusic(playlist[nextIndex]);
    setIsPlaying(true);
  };

  // ฟังก์ชันสำหรับเล่นเพลงก่อนหน้า
  const previousTrack = () => {
    if (playlist.length === 0) return;
    
    // คำนวณ index ของเพลงก่อนหน้า
    const prevIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
    
    setCurrentTrackIndex(prevIndex);
    setCurrentMusic(playlist[prevIndex]);
    setIsPlaying(true);
  };

  // ฟังก์ชันสำหรับเล่นเพลง
  const play = () => {
    if (sound) {
      sound.play();
    }
    setIsPlaying(true);
  };

  // ฟังก์ชันสำหรับหยุดเพลง
  const pause = () => {
    if (sound) {
      sound.pause();
    }
    setIsPlaying(false);
  };

  // ฟังก์ชันสำหรับปรับระดับเสียง
  const changeVolume = (newVolume: number) => {
    const volumeValue = Math.max(0, Math.min(1, newVolume));
    setVolume(volumeValue);
  };

  // ฟังก์ชันสำหรับปิด/เปิดเสียง
  const toggleMute = () => {
    if (volume > 0) {
      setPreviousVolume(volume);
      setVolume(0);
    } else {
      setVolume(previousVolume);
    }
  };

  // ฟังก์ชันสำหรับเลื่อนตำแหน่งเพลง
  const seek = (position: number) => {
    if (sound) {
      sound.seek(position);
      setCurrentTime(position);
    }
  };

  // สร้าง object สำหรับส่งเข้า context
  const value = {
    currentCard,
    currentMusic,
    isPlaying,
    volume,
    currentTime,
    duration,
    playCard,
    play,
    pause,
    nextTrack,
    previousTrack,
    setVolume: changeVolume,
    toggleMute,
    seek
  };

  return <MusicPlayerContext.Provider value={value}>{children}</MusicPlayerContext.Provider>;
}

// Custom hook สำหรับใช้งาน context
export function useMusicPlayer() {
  const context = useContext(MusicPlayerContext);
  if (context === undefined) {
    throw new Error('useMusicPlayer must be used within a MusicPlayerProvider');
  }
  return context;
}