// frontend/src/hooks/useRequireMusic.ts
'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export function useRequireMusic() {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [hasMusicCache, setHasMusicCache] = useState(false);

  useEffect(() => {
    // ตรวจสอบว่าเป็นหน้าที่ไม่ต้องตรวจสอบหรือไม่
    const exemptPaths = [
      '/',           // หน้า home
      '/admin',      // หน้าแอดมินทั้งหมด
    ];

    // ตรวจสอบว่าเป็นหน้าแอดมินหรือหน้าที่ยกเว้น
    const isExemptPath = exemptPaths.some(path => 
      pathname === path || pathname.startsWith('/admin')
    );

    if (isExemptPath) {
      setIsChecking(false);
      setHasMusicCache(true); // ไม่ต้องตรวจสอบ
      return;
    }

    // ตรวจสอบแคชเพลง
    const checkMusicCache = () => {
      try {
        const savedCard = localStorage.getItem('selectedMusicCard');
        const savedPlaylist = localStorage.getItem('currentPlaylist');
        const savedTrackIndex = localStorage.getItem('currentTrackIndex');

        if (savedCard && savedPlaylist && savedTrackIndex) {
          // มีแคชเพลง - อนุญาตให้เข้าหน้านี้
          setHasMusicCache(true);
          setIsChecking(false);
          console.log('มีแคชเพลง - อนุญาตให้เข้าหน้า:', pathname);
        } else {
          // ไม่มีแคชเพลง - redirect กลับหน้า home
          console.log('ไม่มีแคชเพลง - redirect กลับหน้า home จากหน้า:', pathname);
          
          // ล้างแคช HeroSection เพื่อให้กลับไปเลือกเพลงใหม่
          localStorage.removeItem('heroSectionHidden');
          
          // redirect กลับหน้า home
          router.replace('/');
          return;
        }
      } catch (error) {
        console.error('Error checking music cache:', error);
        // ถ้าเกิดข้อผิดพลาด ให้ redirect กลับหน้า home
        localStorage.removeItem('heroSectionHidden');
        router.replace('/');
        return;
      }
    };

    checkMusicCache();
  }, [pathname, router]);

  // ฟัง event เมื่อแคชเพลงถูกล้าง
  useEffect(() => {
    const handleMusicCacheCleared = () => {
      console.log('แคชเพลงถูกล้าง - ตรวจสอบใหม่');
      setHasMusicCache(false);
      
      // ถ้าอยู่ในหน้าที่ต้องมีเพลง ให้ redirect กลับหน้า home
      const exemptPaths = ['/', '/admin'];
      const isExemptPath = exemptPaths.some(path => 
        pathname === path || pathname.startsWith('/admin')
      );

      if (!isExemptPath) {
        localStorage.removeItem('heroSectionHidden');
        router.replace('/');
      }
    };

    window.addEventListener('musicCacheCleared', handleMusicCacheCleared);
    
    return () => {
      window.removeEventListener('musicCacheCleared', handleMusicCacheCleared);
    };
  }, [pathname, router]);

  return {
    isChecking,
    hasMusicCache,
    isAllowed: hasMusicCache && !isChecking
  };
}