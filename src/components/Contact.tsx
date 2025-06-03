'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AnimatedSection } from '@/components/AnimatedSection';

const Contact = () => {
  // State สำหรับควบคุมการแสดงแอนิเมชั่น
  const [isVisible, setIsVisible] = useState(false);
  const [animationPhase, setAnimationPhase] = useState(0);
  const [isLargeScreen, setIsLargeScreen] = useState(false);
  
  // Ref สำหรับตรวจจับการเลื่อนหน้าจอมาถึง component
  const contactRef = useRef<HTMLDivElement>(null);
  
  // ใช้ Intersection Observer API เพื่อตรวจจับเมื่อ component ปรากฏบนหน้าจอ
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // เมื่อ component เริ่มปรากฏบนหน้าจอ
          setIsVisible(true);
        } else {
          // เมื่อ component หายไปจากหน้าจอ - รีเซ็ตแอนิเมชั่น
          setIsVisible(false);
          setAnimationPhase(0);
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
    
    // ไม่ unobserve เพื่อให้สามารถตรวจจับการเข้า-ออกได้ต่อเนื่อง
    return () => {
      if (contactRef.current) {
        observer.unobserve(contactRef.current);
      }
    };
  }, []);
  
  // เมื่อ isVisible เปลี่ยนเป็น true จะเริ่มลำดับแอนิเมชั่น (เฉพาะหน้าจอใหญ่)
  useEffect(() => {
    if (isVisible && isLargeScreen) {
      // รีเซ็ตก่อนเริ่มแอนิเมชั่นใหม่
      setAnimationPhase(0);
      
      // เริ่มเฟส 1 ทันที (กรอบมือถือปรากฏ)
      const startTimer = setTimeout(() => {
        setAnimationPhase(1);
      }, 100);
      
      // หลังจาก 1 วินาที เริ่มเฟส 2 (ข้อความสไลด์ออกมาเต็มที่)
      const timer1 = setTimeout(() => {
        setAnimationPhase(2);
      }, 1100);
      
      // หลังจาก 2 วินาที เริ่มเฟส 3 (แยกกรอบและข้อความออกจากกัน)
      const timer2 = setTimeout(() => {
        setAnimationPhase(3);
      }, 2100);
      
      return () => {
        clearTimeout(startTimer);
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    } else if (!isLargeScreen) {
      // บนมือถือไม่มีแอนิเมชั่น
      setAnimationPhase(0);
    }
  }, [isVisible, isLargeScreen]);
  
  // ตรวจสอบขนาดหน้าจอเพื่อปรับแต่งแอนิเมชั่น
  useEffect(() => {
    // ฟังก์ชันตรวจสอบขนาดหน้าจอ
    const checkScreenSize = () => {
      setIsLargeScreen(window.innerWidth >= 1024); // lg breakpoint
    };

    // ตรวจสอบขนาดหน้าจอครั้งแรก
    checkScreenSize();

    const handleResize = () => {
      // อัพเดทขนาดหน้าจอ
      checkScreenSize();
      
      // รีเซ็ตแอนิเมชั่นเมื่อมีการเปลี่ยนขนาดหน้าจอ (เฉพาะหน้าจอใหญ่)
      if (isVisible && isLargeScreen) {
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
    <>
      {/* Custom CSS สำหรับซ่อน scrollbar */}
      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;  /* Internet Explorer 10+ */
          scrollbar-width: none;  /* Firefox */
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;  /* Safari and Chrome */
        }
      `}</style>
      
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
              transform: !isLargeScreen 
                ? 'translateY(0)' // Mobile: ไม่มีแอนิเมชั่น
                : !isVisible || animationPhase === 0
                  ? 'translateY(100px)' 
                  : animationPhase >= 3 
                    ? 'translateX(-100px) translateY(0)'
                    : 'translateY(0)',
              opacity: !isLargeScreen ? 1 : (!isVisible || animationPhase === 0 ? 0 : 1), // Mobile: แสดงเต็มที่
              transition: !isLargeScreen ? 'none' : 'transform 1.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 1s ease-in-out', // Mobile: ไม่มี transition
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
              <div className="w-full h-full rounded-[32px] overflow-hidden bg-black">
                {/* ภาพภายในมือถือ - สามารถปัดดูได้ */}
                <div className="w-full h-full overflow-y-auto scrollbar-hide" style={{ scrollBehavior: 'smooth' }}>
                  <div className="relative w-full min-h-full">
                    <Image 
                      src="/images/ig.webp" 
                      alt="Instagram Feed"
                      width={320}
                      height={1200}
                      className="w-full h-auto object-contain"
                      style={{
                        minHeight: '100%',
                        objectFit: 'contain',
                        objectPosition: 'top center'
                      }}
                      priority
                    />
                    
                    {/* โอเวอร์เลย์สีทองโปร่งใส - เฉพาะด้านล่าง */}
                    <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent opacity-60 pointer-events-none"></div>
                  </div>
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
              transform: !isLargeScreen 
                ? 'translateX(0)' // Mobile: ไม่มีแอนิเมชั่น
                : !isVisible || animationPhase === 0
                  ? 'translateX(-50px)' 
                  : animationPhase === 1 
                    ? 'translateX(-50px)'
                    : animationPhase >= 3 
                      ? 'translateX(50px)'
                      : 'translateX(0)',
              opacity: !isLargeScreen ? 1 : (!isVisible || animationPhase === 0 ? 0 : animationPhase === 1 ? 0.3 : 1), // Mobile: แสดงเต็มที่
              transition: !isLargeScreen ? 'none' : 'transform 1.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 1s ease-in-out', // Mobile: ไม่มี transition
            }}
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 text-white">
              Connect <span className="text-[#D4AF37]">with us</span>
            </h2>
            
            <p className="text-base sm:text-lg text-gray-300 mb-6 sm:mb-8 max-w-md mx-auto lg:mx-0">
              Follow us on Instagram for the latest updates, behind-the-scenes content, and special announcements.
            </p>
            
            
            <Link
              href="https://instagram.com/grandmajazzphuket"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-[#D4AF37] to-[#C2A14D] rounded-full text-black font-bold text-base sm:text-lg transition-transform hover:scale-105 active:scale-95 mb-8"
            >
              Follow us on Instagram
            </Link>

            {/* Contact Icons Section */}
            <div className="w-full">
              <h3 className="text-xl sm:text-2xl font-semibold text-white mb-6 text-center lg:text-left">
                Get in Touch
              </h3>
              
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 justify-items-center lg:justify-items-start max-w-md mx-auto lg:mx-0">
                {/* WhatsApp */}
                <Link
                  href="https://wa.me/66948605652"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#25D366]/20 hover:bg-[#25D366]/30 transition-all duration-300 hover:scale-110"
                  title="WhatsApp: +66 94 860 5652"
                >
                  <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="#25D366">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893A11.821 11.821 0 0020.893 3.106"/>
                  </svg>
                </Link>

                {/* YouTube */}
                <Link
                  href="https://www.youtube.com/@GrandmaJazzphuket"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#FF0000]/20 hover:bg-[#FF0000]/30 transition-all duration-300 hover:scale-110"
                  title="YouTube Channel"
                >
                  <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="#FF0000">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </Link>

                {/* Email */}
                <Link
                  href="mailto:grandmajazzphuket@gmail.com"
                  className="group flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#EA4335]/20 hover:bg-[#EA4335]/30 transition-all duration-300 hover:scale-110"
                  title="Email: grandmajazzphuket@gmail.com"
                >
                  <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="#EA4335">
                    <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-.887.716-1.615 1.615-1.615L12 12.728l10.385-8.886A1.636 1.636 0 0 1 24 5.457z"/>
                  </svg>
                </Link>

                {/* Phone */}
                <Link
                  href="tel:+66948605652"
                  className="group flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#4285F4]/20 hover:bg-[#4285F4]/30 transition-all duration-300 hover:scale-110"
                  title="Phone: 094-860-5652"
                >
                  <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="#4285F4">
                    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                  </svg>
                </Link>

                {/* Spotify */}
                <Link
                  href="https://open.spotify.com/user/n25klmg82g2xwnuq1eu5824bg?si=QP2vN3TATVKg4TWokjEVKg"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#1DB954]/20 hover:bg-[#1DB954]/30 transition-all duration-300 hover:scale-110"
                  title="Spotify Playlist"
                >
                  <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="#1DB954">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
                  </svg>
                </Link>

                {/* Google Maps */}
                <Link
                  href="https://maps.app.goo.gl/TwovCmqCYRTSkmtu7?g_st=com.google.maps.preview.copy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#4285F4]/20 hover:bg-[#4285F4]/30 transition-all duration-300 hover:scale-110"
                  title="Find us on Google Maps"
                >
                  <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="#4285F4">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                </Link>
              </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Contact;