'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AnimatedSection } from '@/components/AnimatedSection';

const Contact = () => {
  // State สำหรับควบคุมการแสดงแอนิเมชั่น
  const [isVisible, setIsVisible] = useState(false);
  const [animationPhase, setAnimationPhase] = useState(0);
  
  // Ref สำหรับตรวจจับการเลื่อนหน้าจอมาถึง component
  const contactRef = useRef<HTMLDivElement>(null);
  
  // ใช้ Intersection Observer API เพื่อตรวจจับเมื่อ component ปรากฏบนหน้าจอ
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // เมื่อ component เริ่มปรากฏบนหน้าจอ
        if (entry.isIntersecting) {
          setIsVisible(true);
          // หลังจากเริ่มเห็น component จะลบ observer ออก
          if (contactRef.current) {
            observer.unobserve(contactRef.current);
          }
        }
      },
      {
        root: null, // viewport
        rootMargin: '0px',
        threshold: 0.2, // แสดงแอนิเมชั่นเมื่อเห็น component อย่างน้อย 20%
      }
    );
    
    if (contactRef.current) {
      observer.observe(contactRef.current);
    }
    
    return () => {
      if (contactRef.current) {
        observer.unobserve(contactRef.current);
      }
    };
  }, []);
  
  // เมื่อ isVisible เปลี่ยนเป็น true จะเริ่มลำดับแอนิเมชั่น
  useEffect(() => {
    if (isVisible) {
      // เริ่มเฟส 1 ทันที (กรอบมือถือปรากฏ)
      setAnimationPhase(1);
      
      // หลังจาก 1 วินาที เริ่มเฟส 2 (ข้อความสไลด์ออกมาเต็มที่)
      const timer1 = setTimeout(() => {
        setAnimationPhase(2);
      }, 1000);
      
      // หลังจาก 2 วินาที เริ่มเฟส 3 (แยกกรอบและข้อความออกจากกัน)
      const timer2 = setTimeout(() => {
        setAnimationPhase(3);
      }, 2000);
      
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [isVisible]);
  
  // ตรวจสอบขนาดหน้าจอเพื่อปรับแต่งแอนิเมชั่น
  useEffect(() => {
    const handleResize = () => {
      // รีเซ็ตแอนิเมชั่นเมื่อมีการเปลี่ยนขนาดหน้าจอ
      if (isVisible) {
        setAnimationPhase(0);
        setTimeout(() => {
          setAnimationPhase(1);
          
          setTimeout(() => {
            setAnimationPhase(2);
            
            setTimeout(() => {
              setAnimationPhase(3);
            }, 1300);
          }, 1200);
        }, 100);
      }
    };
    
    // เพิ่ม debounce เพื่อไม่ให้ฟังก์ชันทำงานบ่อยเกินไป
    let timeoutId: NodeJS.Timeout;
    const debouncedResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleResize, 500);
    };
    
    window.addEventListener('resize', debouncedResize);
    
    return () => {
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(timeoutId);
    };
  }, [isVisible]);
  
  return (
    <div 
      ref={contactRef}
      className="relative w-full bg-[#0A0A0A] min-h-[90vh] flex flex-col items-center justify-center py-16 sm:py-20 overflow-hidden"
    >
      {/* ปรับจัดวางให้มีพื้นที่แดงสำหรับสไลด์ข้อความออกมา */}
      <div className="relative max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
        {/* ตัว Container หลักที่มีมือถือด้านซ้ายและข้อความด้านขวา */}
        <div className="relative flex flex-col lg:flex-row items-center justify-center gap-6 sm:gap-8 lg:gap-10 xl:gap-16">
          {/* กรอบมือถือ */}
          <div 
            className="relative z-10"
            style={{
              transform: !isVisible 
                ? 'translateY(100px) opacity(0)' 
                : animationPhase >= 3 
                  ? 'translateX(-100px) translateY(0) opacity(1)' 
                  : 'translateY(0) opacity(1)',
              opacity: !isVisible ? 0 : 1,
              transition: 'transform 1.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 1s ease-in-out',
            }}
          >
            <div className="w-[260px] h-[520px] sm:w-[280px] sm:h-[550px] md:w-[300px] md:h-[620px] lg:w-[320px] lg:h-[650px] rounded-[40px] bg-[#222222] p-3 shadow-lg relative overflow-hidden">
              {/* เส้นขอบมือถือ */}
              <div className="absolute inset-0 rounded-[40px] border-4 border-[#333333] pointer-events-none"></div>
              
              {/* เงาด้านในของกรอบ */}
              <div className="absolute inset-0 rounded-[40px] shadow-inner pointer-events-none"></div>
              
              {/* รอยบากด้านบน */}
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-[120px] h-[30px] bg-[#222222] rounded-b-[20px] z-20 flex items-center justify-center">
                {/* กล้อง */}
                <div className="absolute left-1/4 w-3 h-3 rounded-full bg-[#111111] border border-[#333333]"></div>
                {/* ลำโพง */}
                <div className="w-12 h-1.5 rounded-full bg-[#333333]"></div>
              </div>
              
              {/* พื้นที่แสดงภาพหน้าจอ */}
              <div className="w-full h-full rounded-[32px] overflow-hidden">
                {/* ภาพภายในมือถือ - สามารถเปลี่ยนได้ */}
                <div className="w-full h-full relative">
                  <Image 
                    src="/images/ig.webp" 
                    alt="Instagram Feed"
                    fill
                    sizes="(max-width: 768px) 280px, 320px"
                    style={{
                      objectFit: 'cover',
                      objectPosition: 'center'
                    }}
                    priority
                  />
                  
                  {/* โอเวอร์เลย์สีทองโปร่งใส */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent opacity-50"></div>
                </div>
              </div>
              
              {/* ปุ่มด้านล่าง */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-[120px] h-[5px] bg-[#333333] rounded-full"></div>
              
              {/* ปุ่มด้านข้าง */}
              <div className="absolute top-[120px] right-[-5px] h-[60px] w-[5px] bg-[#333333] rounded-l-sm"></div>
              <div className="absolute top-[200px] right-[-5px] h-[60px] w-[5px] bg-[#333333] rounded-l-sm"></div>
              <div className="absolute top-[120px] left-[-5px] h-[40px] w-[5px] bg-[#333333] rounded-r-sm"></div>
            </div>
          </div>
          
          {/* คอนเทนต์ส่วนขวา (ข้อความและปุ่ม) */}
          <div 
            className="relative z-0 lg:ml-0 text-center lg:text-left max-w-md lg:max-w-lg"
            style={{
              transform: !isVisible 
                ? 'translateX(-50px) opacity(0)' 
                : animationPhase === 1 
                  ? 'translateX(-50px) opacity(0.3)'
                  : animationPhase >= 3 
                    ? 'translateX(50px) opacity(1)' 
                    : 'translateX(0) opacity(1)',
              opacity: !isVisible ? 0 : animationPhase === 1 ? 0.3 : 1,
              transition: 'transform 1.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 1s ease-in-out',
            }}
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 text-white">
              Connect <span className="text-[#D4AF37]">with us</span>
            </h2>
            
            <p className="text-base sm:text-lg text-gray-300 mb-6 sm:mb-8 max-w-md mx-auto lg:mx-0">
              Follow us on Instagram for the latest updates, behind-the-scenes content, and special announcements.
            </p>
            
            <div className="flex items-center justify-center lg:justify-start gap-4 mb-6 sm:mb-8">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#D4AF37]/20 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" className="sm:w-7 sm:h-7" fill="none" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
              </div>
              <span className="text-lg sm:text-xl font-medium text-[#D4AF37]">@grandma_jazz</span>
            </div>
            
            <Link
              href="https://instagram.com/grandmajazzphuket"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-[#D4AF37] to-[#C2A14D] rounded-full text-black font-bold text-base sm:text-lg transition-transform hover:scale-105 active:scale-95"
            >
              Follow us on Instagram
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;