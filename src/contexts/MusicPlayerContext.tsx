// frontend/src/contexts/MusicPlayerContext.tsx
'use client';

import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import { StreamingMusic, clampMusicVolume, unlockMusicAudio } from '@/lib/streamingMusic';
import { getFileUrl } from '@/utils/fileHelper';
import { safeStorage } from '@/lib/safeStorage';
import { getAlbumTitle } from '@/lib/albumArtwork';

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
  const [sound, setSound] = useState<StreamingMusic | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isWaitingForModel, setIsWaitingForModel] = useState<boolean>(false);
  const [isMutedForSelection, setIsMutedForSelection] = useState<boolean>(false);
  const [unmuteTimeout, setUnmuteTimeout] = useState<NodeJS.Timeout | null>(null);
  const [fadeInInterval, setFadeInInterval] = useState<NodeJS.Timeout | null>(null);
  // Fires the "start music when the turntable spins" handoff exactly once per
  // selection (re-armed in setWaitingForModel). Guards against the spin event
  // and the slide-away fallback both starting playback.
  const modelStartedRef = useRef<boolean>(false);
  const modelFadeRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // useEffect สำหรับโหลดข้อมูลจาก localStorage เมื่อเริ่มใช้งาน
  useEffect(() => {
    const loadMusicFromCache = () => {
      try {
        const savedCard = safeStorage.get('selectedMusicCard');
        const savedPlaylist = safeStorage.get('currentPlaylist');
        const savedTrackIndex = safeStorage.get('currentTrackIndex');
        
        if (savedCard && savedPlaylist && savedTrackIndex) {
          const card = JSON.parse(savedCard);
          const playlist = JSON.parse(savedPlaylist);
          const trackIndex = parseInt(savedTrackIndex, 10);
          
          
          setCurrentCard({ ...card, title: getAlbumTitle(card.imagePath, card.title) });
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
        safeStorage.remove('selectedMusicCard');
        safeStorage.remove('currentPlaylist');
        safeStorage.remove('currentTrackIndex');
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
    const unlock = () => unlockMusicAudio();
    document.addEventListener('pointerdown', unlock, { capture: true });
    document.addEventListener('keydown', unlock, { capture: true });
    document.addEventListener('click', unlock, { capture: true });
    return () => {
      document.removeEventListener('pointerdown', unlock, { capture: true });
      document.removeEventListener('keydown', unlock, { capture: true });
      document.removeEventListener('click', unlock, { capture: true });
      if (modelFadeRef.current) clearInterval(modelFadeRef.current);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (sound && isPlaying) {
        setCurrentTime(sound.seek() as number);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [sound, isPlaying]);

  // iOS lock screen / Dynamic Island artwork follows the chosen record.
  // Use the original absolute image URL rather than Next's relative optimizer
  // path, since media controls may fetch the artwork outside the page.
  useEffect(() => {
    if (!('mediaSession' in navigator) || !('MediaMetadata' in window)) return;
    if (!currentMusic) {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = 'none';
      return;
    }

    const cover = currentCard?.imagePath && getFileUrl(currentCard.imagePath);
    const artwork = new URL(cover || '/images/Grandma-Jazz-Logo-Heavier.png', window.location.origin).href;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: getAlbumTitle(currentCard?.imagePath, currentCard?.title),
      artist: 'Grandma Jazz',
      album: getAlbumTitle(currentCard?.imagePath, currentCard?.title),
      artwork: [{ src: artwork }],
    });
  }, [currentCard, currentMusic]);

  useEffect(() => {
    if ('mediaSession' in navigator && currentMusic) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  }, [currentMusic, isPlaying]);

  useEffect(() => {
    if (!currentMusic) return;
    const isSingleTrack = playlist.length === 1;
    const newSound = new StreamingMusic({
      src: `/api/music-stream/?src=${encodeURIComponent(getFileUrl(currentMusic.filePath))}`,
      volume,
      loop: isSingleTrack,
      onend: () => { if (!isSingleTrack) nextTrack(); },
      onload: () => setDuration(newSound.duration()),
      onplay: () => setIsPlaying(true),
      onpause: () => setIsPlaying(false),
      onstop: () => setIsPlaying(false),
      onerror: () => setIsPlaying(false),
    });
    setSound(newSound);
    if (isPlaying && !isWaitingForModel) newSound.play();
    // Dispose the instance owned by this effect, including a pending play.
    return () => newSound.unload();
  }, [currentMusic, playlist.length]);

  // Play the already-buffered sound the instant we're cleared to (the turntable
  // spin), WITHOUT rebuilding the stream. Rebuilding it here — which happened when
  // isWaitingForModel was a dependency of the effect above — reintroduced
  // buffering lag exactly at the sync moment, so the audio trailed the
  // spin. The sound is created and buffered on card selection; here we simply
  // press play on that same instance, so it lands with the record.
  useEffect(() => {
    if (sound && isPlaying && !isWaitingForModel && !sound.playing()) {
      sound.play();
    }
  }, [sound, isPlaying, isWaitingForModel]);

  useEffect(() => {
    sound?.volume(clampMusicVolume(volume));
  }, [sound, volume]);

  // ฟังก์ชันสำหรับเลือกการ์ดชั่วคราว โดยไม่บันทึกแคช
  const selectCardTemporary = (card: Card) => {
    if (!card.music || card.music.length === 0) return;
    
    setCurrentCard({ ...card, title: getAlbumTitle(card.imagePath, card.title) });
    
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
    

    if (isWaitingForModel) {
      setIsPlaying(false);
    } else {
      const currentVolume = volume;
      setIsMutedForSelection(true);
      setVolume(0);
      setIsPlaying(true);

      if (unmuteTimeout) {
        clearTimeout(unmuteTimeout);
      }
      
      const timeout = setTimeout(() => {
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
      safeStorage.set('selectedMusicCard', JSON.stringify(currentCard));
      safeStorage.set('currentPlaylist', JSON.stringify(playlist));
      safeStorage.set('currentTrackIndex', trackIndex.toString());
    } catch (error) {
      console.error('Error saving music to localStorage:', error);
    }
  };

  // ฟังก์ชันเดิมสำหรับการเลือกและบันทึกแคชพร้อมกัน (เก็บไว้ backward compatibility)
  const playCard = (card: Card) => {
    if (!card.music || card.music.length === 0) return;
    
    setCurrentCard({ ...card, title: getAlbumTitle(card.imagePath, card.title) });
    
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
      safeStorage.set('selectedMusicCard', JSON.stringify(card));
      safeStorage.set('currentPlaylist', JSON.stringify(newPlaylist));
      safeStorage.set('currentTrackIndex', '0');
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
      safeStorage.set('currentTrackIndex', nextIndex.toString());
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
      safeStorage.set('currentTrackIndex', prevIndex.toString());
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
    // A manual adjustment owns the volume immediately; an old fade must not
    // turn it back up after the user lowers or mutes it.
    if (unmuteTimeout) clearTimeout(unmuteTimeout);
    if (fadeInInterval) clearInterval(fadeInInterval);
    if (modelFadeRef.current) clearInterval(modelFadeRef.current);
    modelFadeRef.current = null;
    setUnmuteTimeout(null);
    setFadeInInterval(null);
    setIsMutedForSelection(false);
    const volumeValue = clampMusicVolume(newVolume);
    sound?.volume(volumeValue);
    setVolume(volumeValue);
  };

  const toggleMute = () => {
    if (volume > 0) {
      setPreviousVolume(volume);
      changeVolume(0);
    } else {
      changeVolume(previousVolume > 0 ? previousVolume : 0.5);
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
    // Beginning a new wait re-arms the one-shot spin handoff.
    if (waiting) modelStartedRef.current = false;
  };

  const resumeWhenReady = () => {
    // Called the instant the turntable starts spinning, so the music and the
    // spin land together. Guarded so it runs once per selection even if the
    // slide-away fallback also calls it. Clearing isWaitingForModel lets the
    // playback effect (re)create the stream and play it from the start.
    if (modelStartedRef.current) return;
    modelStartedRef.current = true;

    const target = clampMusicVolume(volume);
    setPreviousVolume(target);
    setVolume(0);
    setIsWaitingForModel(false);
    setIsPlaying(true);

    // Gentle fade-in from silence as the record begins to turn.
    let step = 0;
    const steps = 15;
    if (modelFadeRef.current) clearInterval(modelFadeRef.current);
    const fade = setInterval(() => {
      step++;
      setVolume((target * step) / steps);
      if (step >= steps) {
        clearInterval(fade);
        modelFadeRef.current = null;
        setVolume(target);
      }
    }, 90);
    modelFadeRef.current = fade;
  };

  const clearMusicCache = () => {
    if (modelFadeRef.current) clearInterval(modelFadeRef.current);
    modelFadeRef.current = null;
    // ล้างข้อมูลเพลงจาก localStorage
    safeStorage.remove('selectedMusicCard');
    safeStorage.remove('currentPlaylist');
    safeStorage.remove('currentTrackIndex');
    
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
