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
  play: () => void;
  pause: () => void;
  nextTrack: () => void;
  previousTrack: () => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  seek: (position: number) => void;
  setWaitingForModel: (waiting: boolean) => void;
  resumeWhenReady: () => void;
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
  };

  const previousTrack = () => {
    if (playlist.length === 0) return;
    
    const prevIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
    
    setCurrentTrackIndex(prevIndex);
    setCurrentMusic(playlist[prevIndex]);
    setIsPlaying(true);
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

  const value = {
    currentCard,
    currentMusic,
    isPlaying,
    volume,
    currentTime,
    duration,
    isWaitingForModel,
    playCard,
    play,
    pause,
    nextTrack,
    previousTrack,
    setVolume: changeVolume,
    toggleMute,
    seek,
    setWaitingForModel,
    resumeWhenReady
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