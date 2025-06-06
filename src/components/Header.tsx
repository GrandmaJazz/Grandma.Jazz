//src/components/Header.tsx (แก้ไขส่วนของ Login)
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useUI } from '@/contexts/UIContext';

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMenuTransitioning, setIsMenuTransitioning] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  const { isAuthenticated, user, isAdmin, logout } = useAuth();
  const { totalItems, setIsCartOpen } = useCart();
  const { openLoginModal } = useUI();
  const router = useRouter();
  const pathname = usePathname();
  
  // Create refs for dropdown
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const profileButtonRef = useRef<HTMLButtonElement>(null);

  // Handle responsive view detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 950);
    };
    
    // Initial check
    handleResize();
    
    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle scroll events for header hide/show
  useEffect(() => {
    const handleScroll = () => {
      // Don't hide header if not mobile, mobile menu is open, or on /blogs page
      if (!isMobile || isMobileMenuOpen || pathname.startsWith('/blogs')) return;
      
      const currentScrollY = window.scrollY;
      const scrollThreshold = 50; // Only hide header after scrolling down 50px from top
      
      // At the top of the page or within threshold - always show
      if (currentScrollY <= scrollThreshold) {
        setIsHeaderVisible(true);
      } 
      // Not at the top and scrolling down - hide immediately
      else if (currentScrollY > lastScrollY) {
        setIsHeaderVisible(false);
      } 
      // Scrolling up - show header
      else {
        setIsHeaderVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [lastScrollY, isMobile, isMobileMenuOpen, pathname]);

  // Close mobile menu when switching to desktop
  useEffect(() => {
    if (!isMobile) {
      setIsMobileMenuOpen(false);
    }
  }, [isMobile]);

  // ตรวจสอบ URL hash เมื่อโหลดหน้าเสร็จ เพื่อเลื่อนไปที่ event-booking section
  useEffect(() => {
    // ตรวจสอบว่าอยู่ที่หน้าหลักและมี hash #event-booking
    if (pathname === '/' && typeof window !== 'undefined' && window.location.hash === '#event-booking') {
      // รอให้ DOM โหลดเสร็จแล้วเลื่อนไปที่ event-booking section
      const timer = setTimeout(() => {
        const eventSection = document.getElementById('event-booking');
        if (eventSection) {
          eventSection.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
          });
          // ลบ hash ออกจาก URL หลังจากเลื่อนเสร็จ
          window.history.replaceState(null, '', '/');
        }
      }, 1000); // รอ 1 วินาทีให้หน้าโหลดเสร็จ
      
      return () => clearTimeout(timer);
    }
  }, [pathname]);

  // Handle menu transitions
  const handleToggleMenu = () => {
    if (isMobileMenuOpen) {
      setIsMenuTransitioning(true);
      // Start closing animation
      setTimeout(() => {
        setIsMobileMenuOpen(false);
        setIsMenuTransitioning(false);
      }, 400); // Match this timing with your CSS transition
    } else {
      setIsMobileMenuOpen(true);
    }
  };

  // Improved click outside handler for profile dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Only close if click wasn't on the dropdown or the button
      if (
        isProfileDropdownOpen && 
        profileDropdownRef.current && 
        !profileDropdownRef.current.contains(event.target as Node) &&
        profileButtonRef.current &&
        !profileButtonRef.current.contains(event.target as Node)
      ) {
        setIsProfileDropdownOpen(false);
      }
    };
    
    // Add the event listener to detect clicks outside
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileDropdownOpen]);

  // Toggle profile dropdown
  const handleProfileClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event bubbling
    setIsProfileDropdownOpen(!isProfileDropdownOpen);
  };

  // Handle dropdown menu item click
  const handleMenuItemClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event bubbling
    setIsProfileDropdownOpen(false);
  };

  // ฟังก์ชั่นสำหรับการแสดง login modal
  const handleLoginClick = (e: React.MouseEvent) => {
    e.preventDefault();
    openLoginModal();
    if (isMobileMenuOpen) {
      handleToggleMenu();
    }
  };

  // ฟังก์ชั่นสำหรับการนำทางไปยัง EVENT section
  const handleEventClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // ปิด mobile menu ถ้าเปิดอยู่
    if (isMobileMenuOpen) {
      handleToggleMenu();
    }
    
    // ตรวจสอบว่าอยู่ที่หน้าหลักหรือไม่
    if (pathname === '/') {
      // ถ้าอยู่ที่หน้าหลักแล้ว ให้เลื่อนไปที่ event-booking section
      const eventSection = document.getElementById('event-booking');
      if (eventSection) {
        eventSection.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        });
      }
    } else {
      // ถ้าอยู่ที่หน้าอื่น ให้นำทางไปหน้าหลักพร้อม hash
      router.push('/#event-booking');
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center">
      {/* Regular header - hidden when mobile menu is open */}
      {!isMobileMenuOpen && (
        <header 
          className={`flex items-center justify-between max-w-6xl w-11/12 py-5 px-10 rounded-b-3xl bg-gradient-to-r from-[#0A0A0A]/95 via-[#1a1a1a]/95 to-[#0A0A0A]/95 backdrop-blur-xl border border-[#D4AF37]/20 text-white transition-all duration-500 ease-out shadow-2xl shadow-[#D4AF37]/10 ${
            isMobile && !isHeaderVisible ? 'opacity-0 -translate-y-full' : 'opacity-100 translate-y-0'
          }`}
          style={{
            background: 'linear-gradient(135deg, rgba(10, 10, 10, 0.95) 0%, rgba(26, 26, 26, 0.95) 50%, rgba(10, 10, 10, 0.95) 100%)',
            boxShadow: '0 25px 50px -12px rgba(212, 175, 55, 0.15), 0 0 0 1px rgba(212, 175, 55, 0.1), inset 0 1px 0 rgba(212, 175, 55, 0.1)'
          }}
        >
          {isMobile ? (
            // Mobile Header
            <>
              <button 
                className="z-10 p-2 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 transition-all duration-300 ease-out hover:bg-[#D4AF37]/20 hover:scale-110 hover:rotate-180 active:scale-95"
                onClick={handleToggleMenu}
                aria-label="Toggle menu"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#D4AF37]">
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
              </button>

              {/* Center Logo - Mobile */}
              <div className="absolute left-1/2 transform -translate-x-1/2">
                <Link href="/" className="flex items-center group">
                  <Image 
                    src="/images/Grandma-Jazz-Logo.png" 
                    alt="Grandma Jazz Logo"
                    width={160}
                    height={80}
                    className="h-12 w-auto transition-all duration-300 group-hover:scale-105"
                    priority
                  />
                </Link>
              </div>

              {/* Mobile Cart - Hide profile, show only cart */}
              <div className="z-10 flex items-center">
                <button 
                  onClick={() => setIsCartOpen(true)}
                  className="group relative"
                >
                  <div className="relative p-2 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 transition-all duration-300 group-hover:bg-[#D4AF37]/20 group-hover:scale-110 group-active:scale-95">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#D4AF37]">
                      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                      <line x1="3" y1="6" x2="21" y2="6"></line>
                      <path d="M16 10a4 4 0 0 1-8 0"></path>
                    </svg>
                    {totalItems > 0 && (
                      <div className="absolute -top-1 -right-1 bg-gradient-to-r from-[#FF6B6B] to-[#FF8E53] text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold shadow-lg animate-pulse">
                        {totalItems}
                      </div>
                    )}
                  </div>
                </button>
              </div>
            </>
          ) : (
            // Desktop Header
            <>
              {/* Desktop Nav Left */}
              <nav className="flex items-center space-x-8">
                <Link href="/products" className="group relative">
                  <span className="text-sm font-roboto-light uppercase tracking-wider text-[#F5F1E6] transition-all duration-300 group-hover:text-[#D4AF37]">
                    Shop All
                  </span>
                  <div className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-[#D4AF37] to-[#F5D76E] transition-all duration-300 group-hover:w-full"></div>
                </Link>
                <button onClick={handleEventClick} className="group relative">
                  <span className="text-sm font-roboto-light uppercase tracking-wider text-[#F5F1E6] transition-all duration-300 group-hover:text-[#D4AF37]">
                    EVENT
                  </span>
                  <div className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-[#D4AF37] to-[#F5D76E] transition-all duration-300 group-hover:w-full"></div>
                </button>
                <Link href="/blogs" className="group relative">
                  <span className="text-sm font-roboto-light uppercase tracking-wider text-[#F5F1E6] transition-all duration-300 group-hover:text-[#D4AF37]">
                    Blogs
                  </span>
                  <div className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-[#D4AF37] to-[#F5D76E] transition-all duration-300 group-hover:w-full"></div>
                </Link>
              </nav>

              {/* Desktop Center Logo */}
              <div className="absolute left-1/2 transform -translate-x-1/2">
                <Link href="/" className="flex items-center group">
                  <Image 
                    src="/images/Grandma-Jazz-Logo.png" 
                    alt="Grandma Jazz Logo"
                    width={200}
                    height={100}
                    className="h-14 w-auto transition-all duration-300 group-hover:scale-105"
                    priority
                  />
                </Link>
              </div>

              {/* Desktop Right Nav */}
              <div className="flex items-center space-x-6">
                {isAuthenticated ? (
                  <div className="relative">
                    <button 
                      ref={profileButtonRef}
                      onClick={handleProfileClick}
                      className="group flex items-center space-x-3 px-4 py-2 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 transition-all duration-300 hover:bg-[#D4AF37]/20 hover:scale-105 hover:shadow-lg hover:shadow-[#D4AF37]/20"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#B8860B] text-[#0A0A0A] flex items-center justify-center font-bold text-sm">
                        {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <span className="text-sm font-roboto-light text-[#F5F1E6] group-hover:text-[#D4AF37] transition-colors">
                        {user?.name || 'Account'}
                      </span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#D4AF37] transition-transform duration-300 group-hover:rotate-180">
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </button>
                    
                    {/* Profile Dropdown - Enhanced styling */}
                    {isProfileDropdownOpen && (
                      <div 
                        ref={profileDropdownRef}
                        className="absolute right-0 mt-3 w-56 bg-gradient-to-br from-[#0A0A0A]/95 to-[#1a1a1a]/95 backdrop-blur-xl border border-[#D4AF37]/20 rounded-2xl shadow-2xl shadow-[#D4AF37]/10 py-2 z-50 animate-in slide-in-from-top-2 duration-200"
                        style={{
                          boxShadow: '0 25px 50px -12px rgba(212, 175, 55, 0.25), 0 0 0 1px rgba(212, 175, 55, 0.1)'
                        }}
                      >
                        <div className="px-4 py-3 border-b border-[#D4AF37]/10">
                          <p className="text-sm font-roboto-light text-[#F5F1E6]">{user?.name}</p>
                          <p className="text-xs font-roboto-light text-[#D4AF37]/80">{user?.email}</p>
                        </div>
                        
                        <Link 
                          href="/profile" 
                          className="flex items-center px-4 py-3 text-sm font-roboto-light text-[#F5F1E6] hover:bg-[#D4AF37]/10 hover:text-[#D4AF37] transition-all duration-200 group"
                          onClick={handleMenuItemClick}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3 group-hover:scale-110 transition-transform">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                          </svg>
                          Profile
                        </Link>
                        
                        <Link 
                          href="/my-tickets" 
                          className="flex items-center px-4 py-3 text-sm font-roboto-light text-[#F5F1E6] hover:bg-[#D4AF37]/10 hover:text-[#D4AF37] transition-all duration-200 group"
                          onClick={handleMenuItemClick}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3 group-hover:scale-110 transition-transform">
                            <path d="M2 9a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3"></path>
                            <path d="M2 9v10a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3V9"></path>
                            <path d="M10 12h4"></path>
                          </svg>
                          My Tickets
                        </Link>
                        
                        <Link 
                          href="/orders" 
                          className="flex items-center px-4 py-3 text-sm font-roboto-light text-[#F5F1E6] hover:bg-[#D4AF37]/10 hover:text-[#D4AF37] transition-all duration-200 group"
                          onClick={handleMenuItemClick}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3 group-hover:scale-110 transition-transform">
                            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                            <line x1="3" y1="6" x2="21" y2="6"></line>
                            <path d="M16 10a4 4 0 0 1-8 0"></path>
                          </svg>
                          My Orders
                        </Link>
                        
                        {isAdmin && (
                          <Link 
                            href="/admin" 
                            className="flex items-center px-4 py-3 text-sm font-roboto-light text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-all duration-200 group"
                            onClick={handleMenuItemClick}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3 group-hover:scale-110 transition-transform">
                              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                              <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                            Admin Dashboard
                          </Link>
                        )}
                        
                        <div className="border-t border-[#D4AF37]/10 my-2"></div>
                        
                        <button 
                          onClick={(e) => {
                            handleMenuItemClick(e);
                            logout();
                          }}
                          className="flex items-center w-full px-4 py-3 text-sm font-roboto-light text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-200 group"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3 group-hover:scale-110 transition-transform">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                            <polyline points="16 17 21 12 16 7"></polyline>
                            <line x1="21" y1="12" x2="9" y2="12"></line>
                          </svg>
                          Logout
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <button 
                    onClick={handleLoginClick}
                    className="group px-6 py-2 rounded-full bg-gradient-to-r from-[#D4AF37]/20 to-[#B8860B]/20 border border-[#D4AF37]/30 text-sm font-roboto-light uppercase tracking-wider text-[#D4AF37] transition-all duration-300 hover:from-[#D4AF37]/30 hover:to-[#B8860B]/30 hover:scale-105 hover:shadow-lg hover:shadow-[#D4AF37]/20 active:scale-95"
                  >
                    <span className="relative z-10">Login</span>
                  </button>
                )}
                
                <button 
                  onClick={() => setIsCartOpen(true)}
                  className="group relative p-3 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 transition-all duration-300 hover:bg-[#D4AF37]/20 hover:scale-110"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#D4AF37]">
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <path d="M16 10a4 4 0 0 1-8 0"></path>
                  </svg>
                  {totalItems > 0 && (
                    <div className="absolute -top-1 -right-1 bg-gradient-to-r from-[#FF6B6B] to-[#FF8E53] text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold shadow-lg animate-pulse">
                      {totalItems}
                    </div>
                  )}
                </button>
              </div>
            </>
          )}
        </header>
      )}

      {/* Mobile Menu - Enhanced styling */}
      {(isMobileMenuOpen || isMenuTransitioning) && (
        <header 
          className={`max-w-6xl w-11/12 rounded-b-3xl bg-gradient-to-br from-[#0A0A0A]/95 via-[#1a1a1a]/95 to-[#0A0A0A]/95 backdrop-blur-xl border border-[#D4AF37]/20 text-white transition-all duration-500 ease-out shadow-2xl shadow-[#D4AF37]/15 ${
            isMenuTransitioning ? 'opacity-0 translate-y-[-100%]' : 'opacity-100 translate-y-0'
          }`}
          style={{
            boxShadow: '0 25px 50px -12px rgba(212, 175, 55, 0.2), 0 0 0 1px rgba(212, 175, 55, 0.1)'
          }}
        >
          <div className="py-8 px-10 flex flex-col">
            {/* Menu Items at Top */}
            <nav className="flex flex-col items-center space-y-6 mb-8">
              {[
                { title: 'SHOP ALL', href: '/products', isEvent: false },
                { title: 'EVENT', href: '/#event-booking', isEvent: true },
                { title: 'BLOGS', href: '/blogs', isEvent: false }
              ].map((item, index) => (
                item.isEvent ? (
                  <button 
                    key={item.title}
                    onClick={handleEventClick}
                    className={`group relative uppercase text-lg font-roboto-light tracking-wider transition-all duration-500 ease-out transform hover:text-[#D4AF37] hover:scale-110 ${
                      isMenuTransitioning ? 'opacity-0 translate-y-[-20px]' : 'opacity-100 translate-y-0'
                    }`}
                    style={{ transitionDelay: `${index * 0.1}s` }}
                  >
                    {item.title}
                    <div className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-[#D4AF37] to-[#F5D76E] transition-all duration-300 group-hover:w-full"></div>
                  </button>
                ) : (
                  <Link 
                    key={item.title}
                    href={item.href}
                    className={`group relative uppercase text-lg font-roboto-light tracking-wider transition-all duration-500 ease-out transform hover:text-[#D4AF37] hover:scale-110 ${
                      isMenuTransitioning ? 'opacity-0 translate-y-[-20px]' : 'opacity-100 translate-y-0'
                    }`}
                    style={{ transitionDelay: `${index * 0.1}s` }}
                    onClick={handleToggleMenu}
                  >
                    {item.title}
                    <div className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-[#D4AF37] to-[#F5D76E] transition-all duration-300 group-hover:w-full"></div>
                  </Link>
                )
              ))}
              
              {isAuthenticated ? (
                <>
                  <Link 
                    href="/profile" 
                    className={`group relative uppercase text-lg font-roboto-light tracking-wider transition-all duration-500 ease-out transform hover:text-[#D4AF37] hover:scale-110 ${
                      isMenuTransitioning ? 'opacity-0 translate-y-[-20px]' : 'opacity-100 translate-y-0'
                    }`}
                    style={{ transitionDelay: '0.3s' }}
                    onClick={handleToggleMenu}
                  >
                    PROFILE
                    <div className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-[#D4AF37] to-[#F5D76E] transition-all duration-300 group-hover:w-full"></div>
                  </Link>
                  
                  <Link 
                    href="/my-tickets" 
                    className={`group relative uppercase text-lg font-roboto-light tracking-wider transition-all duration-500 ease-out transform hover:text-[#D4AF37] hover:scale-110 ${
                      isMenuTransitioning ? 'opacity-0 translate-y-[-20px]' : 'opacity-100 translate-y-0'
                    }`}
                    style={{ transitionDelay: '0.4s' }}
                    onClick={handleToggleMenu}
                  >
                    MY TICKETS
                    <div className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-[#D4AF37] to-[#F5D76E] transition-all duration-300 group-hover:w-full"></div>
                  </Link>
                  
                  <Link 
                    href="/orders" 
                    className={`group relative uppercase text-lg font-roboto-light tracking-wider transition-all duration-500 ease-out transform hover:text-[#D4AF37] hover:scale-110 ${
                      isMenuTransitioning ? 'opacity-0 translate-y-[-20px]' : 'opacity-100 translate-y-0'
                    }`}
                    style={{ transitionDelay: '0.5s' }}
                    onClick={handleToggleMenu}
                  >
                    MY ORDERS
                    <div className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-[#D4AF37] to-[#F5D76E] transition-all duration-300 group-hover:w-full"></div>
                  </Link>
                  
                  {isAdmin && (
                    <Link 
                      href="/admin" 
                      className={`group relative uppercase text-lg font-roboto-light tracking-wider text-[#D4AF37] transition-all duration-500 ease-out transform hover:scale-110 ${
                        isMenuTransitioning ? 'opacity-0 translate-y-[-20px]' : 'opacity-100 translate-y-0'
                      }`}
                      style={{ transitionDelay: '0.6s' }}
                      onClick={handleToggleMenu}
                    >
                      ADMIN
                      <div className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-[#D4AF37] to-[#F5D76E] transition-all duration-300 group-hover:w-full"></div>
                    </Link>
                  )}
                  
                  <button 
                    onClick={() => {
                      handleToggleMenu();
                      logout();
                    }}
                    className={`group relative uppercase text-lg font-roboto-light tracking-wider text-red-400 transition-all duration-500 ease-out transform hover:text-red-300 hover:scale-110 ${
                      isMenuTransitioning ? 'opacity-0 translate-y-[-20px]' : 'opacity-100 translate-y-0'
                    }`}
                    style={{ transitionDelay: '0.7s' }}
                  >
                    LOGOUT
                    <div className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-red-400 to-red-300 transition-all duration-300 group-hover:w-full"></div>
                  </button>
                </>
              ) : (
                <button 
                  onClick={handleLoginClick}
                  className={`group relative uppercase text-lg font-roboto-light tracking-wider transition-all duration-500 ease-out transform hover:text-[#D4AF37] hover:scale-110 ${
                    isMenuTransitioning ? 'opacity-0 translate-y-[-20px]' : 'opacity-100 translate-y-0'
                  }`}
                  style={{ transitionDelay: '0.3s' }}
                >
                  LOGIN
                  <div className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-[#D4AF37] to-[#F5D76E] transition-all duration-300 group-hover:w-full"></div>
                </button>
              )}
            </nav>
            
            {/* Controls at Bottom */}
            <div className="flex justify-between items-center">
              <button 
                onClick={handleToggleMenu}
                aria-label="Close menu"
                className="p-3 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] transition-all duration-300 hover:bg-[#D4AF37]/20 hover:rotate-90 hover:scale-110"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
              
              {/* Center Logo - Mobile Menu */}
              <div className="absolute left-1/2 transform -translate-x-1/2">
                <Image 
                  src="/images/Grandma-Jazz-Logo.png" 
                  alt="Grandma Jazz Logo"
                  width={160}
                  height={80}
                  className="h-12 w-auto"
                />
              </div>
              
              <button 
                onClick={() => {
                  handleToggleMenu();
                  setIsCartOpen(true);
                }}
                className="group relative p-3 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 transition-all duration-300 hover:bg-[#D4AF37]/20 hover:scale-110"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#D4AF37]">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <path d="M16 10a4 4 0 0 1-8 0"></path>
                </svg>
                {totalItems > 0 && (
                  <div className="absolute -top-1 -right-1 bg-gradient-to-r from-[#FF6B6B] to-[#FF8E53] text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold shadow-lg animate-pulse">
                    {totalItems}
                  </div>
                )}
              </button>
            </div>
          </div>
        </header>
      )}
      
      {/* Add shimmer animation keyframes */}
      <style jsx>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
}