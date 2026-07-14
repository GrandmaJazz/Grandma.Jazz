// frontend/src/components/MusicProtectedRoute.tsx
'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import CDCardCarousel from '@/components/CDCardCarousel';

interface MusicProtectedRouteProps {
  children: ReactNode;
}

/**
 * ประตูเพลง (Music Gate)
 *
 * เดิม: ถ้าไม่มีแคชเพลง จะ redirect กลับหน้าแรก
 *       ทำให้ Google และคนที่กดลิงก์ตรงเข้าหน้านี้ไม่ได้เลย
 *
 * ใหม่: แสดงเนื้อหาหน้านั้นเสมอ (Google อ่านได้)
 *       แต่ถ้ายังไม่ได้เลือกเพลง จะมี overlay ให้เลือกเพลงก่อน
 *       เลือกเสร็จ overlay หายไป และอยู่หน้าเดิมที่ตั้งใจจะเข้า
 */
export function MusicProtectedRoute({ children }: MusicProtectedRouteProps) {
  const pathname = usePathname();
  const { currentCard, playCard } = useMusicPlayer();

  // ยังไม่ตรวจสอบตอน server-render — กัน hydration mismatch
  // และทำให้ HTML ที่ Google เห็นเป็นเนื้อหาล้วน ไม่มี overlay
  const [hasChecked, setHasChecked] = useState(false);
  const [hasMusicCache, setHasMusicCache] = useState(false);

  useEffect(() => {
    try {
      const savedCard = localStorage.getItem('selectedMusicCard');
      const savedPlaylist = localStorage.getItem('currentPlaylist');
      const savedTrackIndex = localStorage.getItem('currentTrackIndex');
      setHasMusicCache(Boolean(savedCard && savedPlaylist && savedTrackIndex));
    } catch (error) {
      console.error('Error checking music cache:', error);
      setHasMusicCache(false);
    } finally {
      setHasChecked(true);
    }
  }, [pathname]);

  // ถ้าแคชถูกล้าง ให้ประตูกลับมาปิด
  useEffect(() => {
    const handleMusicCacheCleared = () => setHasMusicCache(false);
    window.addEventListener('musicCacheCleared', handleMusicCacheCleared);
    return () => {
      window.removeEventListener('musicCacheCleared', handleMusicCacheCleared);
    };
  }, []);

  // เลือกเพลงแล้ว (จากแคช หรือเพิ่งเลือกใน overlay)
  const isAllowed = hasMusicCache || Boolean(currentCard);
  const showGate = hasChecked && !isAllowed;

  // ล็อกการเลื่อนหน้าจอขณะที่ประตูยังปิดอยู่
  useEffect(() => {
    if (showGate) {
      const previous = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = previous;
      };
    }
  }, [showGate]);

  return (
    <>
      {/* เนื้อหาหน้าเว็บ render เสมอ — Google อ่านได้ */}
      {children}

      {/* ประตูเพลง: ทุกคนยังต้องเลือกเพลงก่อนใช้งาน */}
      {showGate && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-[#0A0A0A]/95 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-label="Choose your music to enter"
        >
          <div className="w-full max-w-3xl py-8">
            <CDCardCarousel onCardClick={(card) => playCard(card)} />
          </div>
        </div>
      )}
    </>
  );
}
