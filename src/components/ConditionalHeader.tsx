// frontend/src/components/ConditionalHeader.tsx
'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Header } from '@/components/Header';

export default function ConditionalHeader() {
  const [showHeader, setShowHeader] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // ฟังก์ชันตรวจสอบสถานะ HeroSection
    const checkHeroSectionStatus = () => {
      // ถ้าไม่ใช่หน้าแรก ให้แสดง Header
      if (pathname !== '/') {
        setShowHeader(true);
        return;
      }

      // ตรวจสอบจาก localStorage หรือ URL parameters
      const heroHidden = localStorage.getItem('heroSectionHidden') === 'true';
      setShowHeader(heroHidden);
    };

    // ตรวจสอบสถานะเริ่มต้น
    checkHeroSectionStatus();

    // ฟัง event จาก page.tsx
    const handleHeroSectionChange = (event: CustomEvent) => {
      const showHeroSection = event.detail;
      setShowHeader(!showHeroSection);
      
      // บันทึกสถานะใน localStorage
      localStorage.setItem('heroSectionHidden', (!showHeroSection).toString());
    };

    // ฟัง event จาก window
    window.addEventListener('heroSectionChange', handleHeroSectionChange as EventListener);

    return () => {
      window.removeEventListener('heroSectionChange', handleHeroSectionChange as EventListener);
    };
  }, [pathname]);

  // แสดง Header เฉพาะเมื่อไม่อยู่ใน HeroSection หรือไม่ใช่หน้าแรก
  if (!showHeader) {
    return null;
  }

  return <Header />;
} 