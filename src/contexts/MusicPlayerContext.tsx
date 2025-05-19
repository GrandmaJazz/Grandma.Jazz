'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// ประกาศ interface สำหรับเพลง
interface Music {
  _id: string;
  title: string;
  artist: string;
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
  playCard: (card: Card) => void;
  play: () => void;
  pause: () => void;
  nextTrack: () => void;
  previousTrack: () => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
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
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [previousVolume, setPreviousVolume] = useState<number>(0.5);
  const [playedTracks, setPlayedTracks] = useState<Set<number>>(new Set());

  // สร้าง element audio เมื่อ component โหลด
  useEffect(() => {
    const audioElement = new Audio();
    audioElement.volume = volume;
    audioElement.addEventListener('ended', handleTrackEnded);
    setAudio(audioElement);

    return () => {
      if (audioElement) {
        audioElement.pause();
        audioElement.removeEventListener('ended', handleTrackEnded);
      }
    };
  }, []);

  // เล่นเพลงเมื่อ currentMusic เปลี่ยน
  useEffect(() => {
    if (audio && currentMusic) {
      audio.src = `${process.env.NEXT_PUBLIC_API_URL}${currentMusic.filePath}`;
      audio.load();
      
      if (isPlaying) {
        const playPromise = audio.play();
        
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.error('Error playing audio:', error);
          });
        }
      }
    }
  }, [audio, currentMusic]);

  // อัพเดทปุ่มเล่น/หยุดเมื่อ isPlaying เปลี่ยน
  useEffect(() => {
    if (audio) {
      if (isPlaying) {
        const playPromise = audio.play();
        
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.error('Error playing audio:', error);
            setIsPlaying(false);
          });
        }
      } else {
        audio.pause();
      }
    }
  }, [audio, isPlaying]);

  // อัพเดทระดับเสียงเมื่อ volume เปลี่ยน
  useEffect(() => {
    if (audio) {
      audio.volume = volume;
    }
  }, [audio, volume]);

  // ฟังก์ชันสำหรับเล่นเพลงเมื่อเลือกการ์ด
  const playCard = (card: Card) => {
    if (!card.music || card.music.length === 0) return;
    
    // เก็บข้อมูลการ์ดปัจจุบัน
    setCurrentCard(card);
    
    // สร้าง playlist จากเพลงในการ์ด
    const newPlaylist = [...card.music];
    
    // สลับลำดับเพลงในรายการ (เพื่อเล่นแบบสุ่ม)
    for (let i = newPlaylist.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newPlaylist[i], newPlaylist[j]] = [newPlaylist[j], newPlaylist[i]];
    }
    
    setPlaylist(newPlaylist);
    setPlayedTracks(new Set()); // รีเซ็ตประวัติการเล่น
    
    // เริ่มเล่นเพลงแรกในรายการ
    setCurrentTrackIndex(0);
    setCurrentMusic(newPlaylist[0]);
    setIsPlaying(true);
  };

  // ฟังก์ชันสำหรับเล่นเพลงถัดไปเมื่อเพลงปัจจุบันจบ
  const handleTrackEnded = () => {
    nextTrack();
  };

  // ฟังก์ชันสำหรับเล่นเพลงถัดไป
  const nextTrack = () => {
    if (!playlist || playlist.length === 0) return;
    
    // ถ้าเป็นเพลงเดียวในรายการ
    if (playlist.length === 1) {
      if (audio) {
        audio.currentTime = 0; // เริ่มต้นเพลงใหม่
        audio.play();
      }
      return;
    }
    
    // เพิ่มเพลงปัจจุบันเข้าไปในประวัติเพลงที่เล่นแล้ว
    const updatedPlayedTracks = new Set(playedTracks);
    if (currentTrackIndex >= 0) {
      updatedPlayedTracks.add(currentTrackIndex);
    }
    
    // ถ้าเล่นครบทุกเพลงแล้ว ให้รีเซ็ตและสลับเพลงใหม่
    if (updatedPlayedTracks.size >= playlist.length) {
      // สลับลำดับเพลงใหม่
      const newPlaylist = [...playlist];
      for (let i = newPlaylist.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newPlaylist[i], newPlaylist[j]] = [newPlaylist[j], newPlaylist[i]];
      }
      
      setPlaylist(newPlaylist);
      setPlayedTracks(new Set([0])); // เริ่มนับใหม่ โดยถือว่าเพลงแรกเล่นแล้ว
      setCurrentTrackIndex(0);
      setCurrentMusic(newPlaylist[0]);
    } else {
      // หาเพลงที่ยังไม่ได้เล่น
      let nextIndex = 0;
      
      // ลองหาเพลงถัดไปตามลำดับก่อน
      const potentialNext = (currentTrackIndex + 1) % playlist.length;
      if (!updatedPlayedTracks.has(potentialNext)) {
        nextIndex = potentialNext;
      } else {
        // ถ้าเพลงถัดไปเล่นไปแล้ว ให้หาเพลงที่ยังไม่ได้เล่นแบบสุ่ม
        const unplayedTracks = Array.from(Array(playlist.length).keys())
          .filter(i => !updatedPlayedTracks.has(i));
        
        if (unplayedTracks.length > 0) {
          // สุ่มเลือกเพลงจากเพลงที่ยังไม่ได้เล่น
          const randomIndex = Math.floor(Math.random() * unplayedTracks.length);
          nextIndex = unplayedTracks[randomIndex];
        }
      }
      
      setCurrentTrackIndex(nextIndex);
      setCurrentMusic(playlist[nextIndex]);
      setPlayedTracks(updatedPlayedTracks);
    }
    
    setIsPlaying(true);
  };

  // ฟังก์ชันสำหรับเล่นเพลงก่อนหน้า
  const previousTrack = () => {
    if (!playlist || playlist.length === 0) return;
    
    // ถ้าเป็นเพลงเดียว จะให้เล่นซ้ำเพลงเดิม
    if (playlist.length === 1) {
      if (audio) {
        audio.currentTime = 0; // เริ่มต้นเพลงใหม่
        audio.play();
      }
      return;
    }
    
    // เลือกเพลงแบบสุ่มจากเพลงที่เล่นไปแล้ว (ยกเว้นเพลงปัจจุบัน)
    const previousPlayedTracks = Array.from(playedTracks)
      .filter(index => index !== currentTrackIndex);
    
    if (previousPlayedTracks.length > 0) {
      // สุ่มเลือกเพลงจากประวัติ
      const randomIndex = Math.floor(Math.random() * previousPlayedTracks.length);
      const prevIndex = previousPlayedTracks[randomIndex];
      
      // ลบเพลงนี้ออกจากประวัติ (เพื่อจะได้ไม่ซ้ำเมื่อกดย้อนกลับหลายๆ ครั้ง)
      const updatedPlayedTracks = new Set(playedTracks);
      updatedPlayedTracks.delete(prevIndex);
      
      setCurrentTrackIndex(prevIndex);
      setCurrentMusic(playlist[prevIndex]);
      setPlayedTracks(updatedPlayedTracks);
    } else {
      // ถ้าไม่มีประวัติ ให้สุ่มเพลงใหม่ที่ไม่ใช่เพลงปัจจุบัน
      let newIndex = currentTrackIndex;
      while (newIndex === currentTrackIndex) {
        newIndex = Math.floor(Math.random() * playlist.length);
      }
      
      setCurrentTrackIndex(newIndex);
      setCurrentMusic(playlist[newIndex]);
    }
    
    setIsPlaying(true);
  };

  // ฟังก์ชันสำหรับเล่นเพลง
  const play = () => {
    setIsPlaying(true);
  };

  // ฟังก์ชันสำหรับหยุดเพลง
  const pause = () => {
    setIsPlaying(false);
  };

  // ฟังก์ชันสำหรับปรับระดับเสียง
  const changeVolume = (newVolume: number) => {
    setVolume(Math.max(0, Math.min(1, newVolume)));
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

  // สร้าง object สำหรับส่งเข้า context
  const value = {
    currentCard,
    currentMusic,
    isPlaying,
    volume,
    playCard,
    play,
    pause,
    nextTrack,
    previousTrack,
    setVolume: changeVolume,
    toggleMute
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