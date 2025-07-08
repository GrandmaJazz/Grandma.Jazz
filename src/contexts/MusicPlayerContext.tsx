// frontend/src/contexts/MusicPlayerContext.tsx
'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { Howl, Howler } from 'howler';
import { getFileUrl } from '@/utils/fileHelper';

interface Music {
  _id: string;
  title: string;
  filePath: string;
  duration: number;
}

interface Card {
  _id: string;
  title: string;
  description: string;
  imagePath: string;
  music: Music[];
}

interface MusicPlayerContextType {
  currentCard: Card | null;
  currentMusic: Music | null;
  isPlaying: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  isWaitingForModel: boolean;
  playCard: (card: Card) => void;
  selectCardTemporary: (card: Card) => void;
  saveMusicCache: () => void;
  play: () => void;
  pause: () => void;
  nextTrack: () => void;
  previousTrack: () => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  seek: (position: number) => void;
  setWaitingForModel: (waiting: boolean) => void;
  resumeWhenReady: () => void;
  clearMusicCache: () => void;
}

const MusicPlayerContext = createContext<MusicPlayerContextType | undefined>(undefined);

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
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [isWaitingForModel, setIsWaitingForModel] = useState<boolean>(false);
  const [isMutedForSelection, setIsMutedForSelection] = useState<boolean>(false);
  const [unmuteTimeout, setUnmuteTimeout] = useState<NodeJS.Timeout | null>(null);
  const [fadeInInterval, setFadeInInterval] = useState<NodeJS.Timeout | null>(null);

  // useEffect สำหรับโหลดข้อมูลจาก localStorage เมื่อเริ่มใช้งาน
  useEffect(() => {
    const loadMusicFromCache = () => {
      try {
        const savedCard = localStorage.getItem('selectedMusicCard');
        const savedPlaylist = localStorage.getItem('currentPlaylist');
        const savedTrackIndex = localStorage.getItem('currentTrackIndex');
        
        if (savedCard && savedPlaylist && savedTrackIndex) {
          const card = JSON.parse(savedCard);
          const playlist = JSON.parse(savedPlaylist);
          const trackIndex = parseInt(savedTrackIndex, 10);
          
          console.log("โหลดข้อมูลเพลงจากแคช:", card.title);
          
          setCurrentCard(card);
          setPlaylist(playlist);
          setCurrentTrackIndex(trackIndex);
          
          if (playlist[trackIndex]) {
            setCurrentMusic(playlist[trackIndex]);
          }
          
          // ไม่เล่นเพลงทันที ให้ผู้ใช้กดเล่นเอง
          setIsPlaying(false);
        }
      } catch (error) {
        console.error('Error loading music from cache:', error);
        // ถ้าเกิดข้อผิดพลาด ให้ล้างแคชที่เสียหาย
        localStorage.removeItem('selectedMusicCard');
        localStorage.removeItem('currentPlaylist');
        localStorage.removeItem('currentTrackIndex');
      }
    };

    loadMusicFromCache();
  }, []);

  // Cleanup timeout และ interval เมื่อ component unmount
  useEffect(() => {
    return () => {
      if (unmuteTimeout) {
        clearTimeout(unmuteTimeout);
      }
      if (fadeInInterval) {
        clearInterval(fadeInInterval);
      }
    };
  }, [unmuteTimeout, fadeInInterval]);

  useEffect(() => {
    const userAgent = navigator.userAgent;
    const isIOSDevice = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    
    setIsIOS(isIOSDevice);
    setIsMobile(isMobileDevice);
    
    if (isIOSDevice) {
      const unlockAudio = () => {
        Howler.volume(0.5);
        document.removeEventListener('touchstart', unlockAudio);
        document.removeEventListener('click', unlockAudio);
      };
      
      document.addEventListener('touchstart', unlockAudio);
      document.addEventListener('click', unlockAudio);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (sound && isPlaying) {
        setCurrentTime(sound.seek() as number);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [sound, isPlaying]);

  useEffect(() => {
    if (currentMusic) {
      if (sound) {
        sound.stop();
        sound.unload();
      }
      
      const isSingleTrack = playlist.length === 1;
      
      const newSound = new Howl({
        src: [getFileUrl(currentMusic.filePath)],
        html5: true,
        volume: volume,
        loop: isSingleTrack,
        onend: () => {
          if (!isSingleTrack) {
            nextTrack();
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
      
      if (isPlaying && !isWaitingForModel) {
        newSound.play();
      }
    }
    
    return () => {
      if (sound) {
        sound.stop();
        sound.unload();
      }
    };
  }, [currentMusic, playlist.length, isWaitingForModel]);

  useEffect(() => {
    const updateVolume = () => {
      try {
        if (sound) {
          if (isIOS) {
            if (volume === 0) {
              sound.mute(true);
            } else {
              sound.mute(false);
              sound.volume(volume);
            }
          } else {
            sound.volume(volume);
          }
        }
        
        if (!isIOS) {
          Howler.volume(volume);
        }
      } catch (error) {
        console.warn('Volume update failed:', error);
      }
    };
    
    if (isMobile) {
      requestAnimationFrame(updateVolume);
    } else {
      updateVolume();
    }
  }, [sound, volume, isIOS, isMobile]);

  // ฟังก์ชันสำหรับเลือกการ์ดชั่วคราว โดยไม่บันทึกแคช
  const selectCardTemporary = (card: Card) => {
    if (!card.music || card.music.length === 0) return;
    
    setCurrentCard(card);
    
    const newPlaylist = [...card.music];
    
    if (newPlaylist.length > 1) {
      for (let i = newPlaylist.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newPlaylist[i], newPlaylist[j]] = [newPlaylist[j], newPlaylist[i]];
      }
    }
    
    setPlaylist(newPlaylist);
    
    setCurrentTrackIndex(0);
    setCurrentMusic(newPlaylist[0]);
    
    console.log("เลือกการ์ดชั่วคราว (ยังไม่บันทึกแคช):", card.title);
    
    // เริ่มเล่นเพลงแต่ปิดเสียงไว้ก่อน
    if (isWaitingForModel) {
      console.log("รอโมเดล 2 พร้อมก่อนเล่นเพลง");
      setIsPlaying(false);
    } else {
      // ปิดเสียงก่อนเริ่มเล่น
      const currentVolume = volume;
      setIsMutedForSelection(true);
      setVolume(0);
      setIsPlaying(true);
      
      console.log("เริ่มเล่นเพลงแต่ปิดเสียงไว้");
      
      // ล้าง timeout เก่าถ้ามี
      if (unmuteTimeout) {
        clearTimeout(unmuteTimeout);
      }
      
      // ผ่านไป 4 วินาทีแล้วค่อยๆ เพิ่มเสียงกลับมา
      const timeout = setTimeout(() => {
        // ค่อยๆ เพิ่มเสียงจาก 0 ถึง currentVolume ใน 2 วินาที
        const fadeInDuration = 2000; // 2 วินาที
        const steps = 20; // 20 ขั้นตอน
        const stepDuration = fadeInDuration / steps;
        const volumeStep = currentVolume / steps;
        
        let currentStep = 0;
        const interval = setInterval(() => {
          currentStep++;
          const newVolume = volumeStep * currentStep;
          setVolume(newVolume);
          
          if (currentStep >= steps) {
            clearInterval(interval);
            setVolume(currentVolume);
            setIsMutedForSelection(false);
            setUnmuteTimeout(null);
            setFadeInInterval(null);
            console.log("เปิดเสียงกลับมาแล้ว (fade in)");
          }
        }, stepDuration);
        
        setFadeInInterval(interval);
        setUnmuteTimeout(timeout);
      }, 4000);
      
      setUnmuteTimeout(timeout);
    }
  };

  // ฟังก์ชันสำหรับบันทึกแคชเพลงปัจจุบัน
  const saveMusicCache = () => {
    if (!currentCard || playlist.length === 0) {
      console.warn("ไม่มีการ์ดหรือเพลงให้บันทึก");
      return;
    }
    
    // ใช้ค่า track index ปัจจุบัน หรือ 0 ถ้าไม่มี
    const trackIndex = currentTrackIndex >= 0 ? currentTrackIndex : 0;
    
    // ถ้าอยู่ในโหมดปิดเสียง ให้เปิดเสียงกลับมา
    if (isMutedForSelection) {
      // ล้าง timeout และ interval เก่าถ้ามี
      if (unmuteTimeout) {
        clearTimeout(unmuteTimeout);
        setUnmuteTimeout(null);
      }
      if (fadeInInterval) {
        clearInterval(fadeInInterval);
        setFadeInInterval(null);
      }
      
      // เปิดเสียงกลับมา
      setVolume(previousVolume > 0 ? previousVolume : 0.5);
      setIsMutedForSelection(false);
      console.log("เปิดเสียงกลับมาเมื่อบันทึกแคช");
    }
    
    try {
      localStorage.setItem('selectedMusicCard', JSON.stringify(currentCard));
      localStorage.setItem('currentPlaylist', JSON.stringify(playlist));
      localStorage.setItem('currentTrackIndex', trackIndex.toString());
      console.log("บันทึกแคชเพลงแล้ว:", currentCard.title, "- Track:", trackIndex);
    } catch (error) {
      console.error('Error saving music to localStorage:', error);
    }
  };

  // ฟังก์ชันเดิมสำหรับการเลือกและบันทึกแคชพร้อมกัน (เก็บไว้ backward compatibility)
  const playCard = (card: Card) => {
    if (!card.music || card.music.length === 0) return;
    
    setCurrentCard(card);
    
    const newPlaylist = [...card.music];
    
    if (newPlaylist.length > 1) {
      for (let i = newPlaylist.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newPlaylist[i], newPlaylist[j]] = [newPlaylist[j], newPlaylist[i]];
      }
    }
    
    setPlaylist(newPlaylist);
    
    setCurrentTrackIndex(0);
    setCurrentMusic(newPlaylist[0]);
    
    // เก็บข้อมูลการเลือกเพลงใน localStorage (เหมือนเดิม)
    try {
      localStorage.setItem('selectedMusicCard', JSON.stringify(card));
      localStorage.setItem('currentPlaylist', JSON.stringify(newPlaylist));
      localStorage.setItem('currentTrackIndex', '0');
      console.log("เก็บข้อมูลการเลือกเพลงใน localStorage:", card.title);
    } catch (error) {
      console.error('Error saving music to localStorage:', error);
    }
    
    if (isWaitingForModel) {
      console.log("รอโมเดล 2 พร้อมก่อนเล่นเพลง");
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
    }
  };

  const nextTrack = () => {
    if (playlist.length === 0) return;
    
    const nextIndex = (currentTrackIndex + 1) % playlist.length;
    
    setCurrentTrackIndex(nextIndex);
    setCurrentMusic(playlist[nextIndex]);
    setIsPlaying(true);
    
    // อัปเดต localStorage
    try {
      localStorage.setItem('currentTrackIndex', nextIndex.toString());
    } catch (error) {
      console.error('Error updating track index in localStorage:', error);
    }
  };

  const previousTrack = () => {
    if (playlist.length === 0) return;
    
    const prevIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
    
    setCurrentTrackIndex(prevIndex);
    setCurrentMusic(playlist[prevIndex]);
    setIsPlaying(true);
    
    // อัปเดต localStorage
    try {
      localStorage.setItem('currentTrackIndex', prevIndex.toString());
    } catch (error) {
      console.error('Error updating track index in localStorage:', error);
    }
  };

  const play = () => {
    if (sound) {
      sound.play();
    }
    setIsPlaying(true);
  };

  const pause = () => {
    if (sound) {
      sound.pause();
    }
    setIsPlaying(false);
  };

  const changeVolume = (newVolume: number) => {
    const volumeValue = Math.max(0, Math.min(1, newVolume));
    setVolume(volumeValue);
  };

  const toggleMute = () => {
    try {
      if (volume > 0) {
        setPreviousVolume(volume);
        const newVolume = 0;
        setVolume(newVolume);
        
        if (isIOS) {
          setTimeout(() => {
            if (sound) {
              sound.volume(newVolume);
              sound.mute(true);
            }
          }, 50);
        } else {
          setTimeout(() => {
            if (sound) {
              sound.volume(newVolume);
            }
            Howler.volume(newVolume);
          }, 10);
        }
      } else {
        const newVolume = previousVolume > 0 ? previousVolume : 0.5;
        setVolume(newVolume);
        
        if (isIOS) {
          setTimeout(() => {
            if (sound) {
              sound.mute(false);
              sound.volume(newVolume);
            }
          }, 50);
        } else {
          setTimeout(() => {
            if (sound) {
              sound.volume(newVolume);
            }
            Howler.volume(newVolume);
          }, 10);
        }
      }
    } catch (error) {
      console.error('Error in toggleMute:', error);
      
      if (volume > 0) {
        setPreviousVolume(volume);
        setVolume(0);
      } else {
        setVolume(previousVolume > 0 ? previousVolume : 0.5);
      }
    }
  };

  const seek = (position: number) => {
    if (sound) {
      sound.seek(position);
      setCurrentTime(position);
    }
  };

  const setWaitingForModel = (waiting: boolean) => {
    setIsWaitingForModel(waiting);
  };

  const resumeWhenReady = () => {
    if (sound) {
      sound.play();
    }
    setIsPlaying(true);
  };

  const clearMusicCache = () => {
    // ล้างข้อมูลเพลงจาก localStorage
    localStorage.removeItem('selectedMusicCard');
    localStorage.removeItem('currentPlaylist');
    localStorage.removeItem('currentTrackIndex');
    
    // รีเซ็ต state ทั้งหมด
    setCurrentCard(null);
    setCurrentMusic(null);
    setPlaylist([]);
    setCurrentTrackIndex(-1);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    
    // หยุดเสียงปัจจุบัน
    if (sound) {
      sound.stop();
      sound.unload();
      setSound(null);
    }
    
    // ส่ง event เพื่อแจ้งให้ component อื่นๆ รู้ว่าแคชถูกล้างแล้ว
    window.dispatchEvent(new CustomEvent('musicCacheCleared'));
    
    console.log("ล้างแคชการเลือกเพลงแล้ว");
  };

  const value = {
    currentCard,
    currentMusic,
    isPlaying,
    volume,
    currentTime,
    duration,
    isWaitingForModel,
    playCard,
    selectCardTemporary,
    saveMusicCache,
    play,
    pause,
    nextTrack,
    previousTrack,
    setVolume: changeVolume,
    toggleMute,
    seek,
    setWaitingForModel,
    resumeWhenReady,
    clearMusicCache
  };

  return <MusicPlayerContext.Provider value={value}>{children}</MusicPlayerContext.Provider>;
}

export function useMusicPlayer() {
  const context = useContext(MusicPlayerContext);
  if (context === undefined) {
    throw new Error('useMusicPlayer must be used within a MusicPlayerProvider');
  }
  return context;
}