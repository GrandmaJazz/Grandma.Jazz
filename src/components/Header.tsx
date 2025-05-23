//src/components/Header.tsx (แก้ไขส่วนของ Login)
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
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
  
  // Create refs for dropdown
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const profileButtonRef = useRef<HTMLButtonElement>(null);

  // Handle responsive view detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
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
      if (!isMobile || isMobileMenuOpen) return;
      
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
  }, [lastScrollY, isMobile, isMobileMenuOpen]);

  // Close mobile menu when switching to desktop
  useEffect(() => {
    if (!isMobile) {
      setIsMobileMenuOpen(false);
    }
  }, [isMobile]);

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

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center">
      {/* Regular header - hidden when mobile menu is open */}
      {!isMobileMenuOpen && (
        <header 
          className={`flex items-center justify-between max-w-5xl w-11/12 py-4 px-8 rounded-b-2xl bg-[#0A0A0A]/80 backdrop-blur-md border border-[#7c4d33]/20 text-white transition-all duration-300 ease-in-out ${
            isMobile && !isHeaderVisible ? 'opacity-0 -translate-y-full' : 'opacity-100 translate-y-0'
          }`}
        >
          {isMobile ? (
            // Mobile Header
            <>
              <button 
                className="z-10 transition-transform duration-300 ease-in-out hover:scale-110"
                onClick={handleToggleMenu}
                aria-label="Toggle menu"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
              </button>

              {/* Center Logo */}
              <div className="absolute left-1/2 transform -translate-x-1/2">
                <Link href="/" className="flex items-center">
                  <span className="font-editorial-ultralight text-xl text-[#D4AF37]">Grandma Jazz</span>
                </Link>
              </div>

              {/* Mobile Cart */}
              <div className="z-10 flex items-center space-x-3">
                {isAuthenticated ? (
                  <button 
                    ref={profileButtonRef}
                    onClick={handleProfileClick}
                    className="flex items-center transition-transform duration-300 ease-in-out hover:scale-110"
                  >
                    <div className="relative w-8 h-8 rounded-full bg-[#D4AF37] text-[#0A0A0A] flex items-center justify-center">
                      {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                  </button>
                ) : (
                  <button 
                    onClick={handleLoginClick}
                    className="flex items-center transition-transform duration-300 ease-in-out hover:scale-110"
                  >
                    <div className="relative w-8 h-8 rounded-full border border-[#D4AF37]/50 text-[#D4AF37] flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                    </div>
                  </button>
                )}
                
                <button 
                  onClick={() => setIsCartOpen(true)}
                  className="flex items-center transition-transform duration-300 ease-in-out hover:scale-110"
                >
                  <div className="relative">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                      <line x1="3" y1="6" x2="21" y2="6"></line>
                      <path d="M16 10a4 4 0 0 1-8 0"></path>
                    </svg>
                    {totalItems > 0 && (
                      <div className="absolute -top-2 -right-2 bg-[#D4AF37] text-[#0A0A0A] text-xs rounded-full w-5 h-5 flex items-center justify-center">
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
              <nav className="flex items-center space-x-6">
                <Link href="/products" className="text-sm uppercase tracking-tight hover:opacity-75 transition-opacity">
                  Shop All
                </Link>
                <Link href="#" className="text-sm uppercase tracking-tight hover:opacity-75 transition-opacity">
                  Café
                </Link>
                <Link href="/blogs" className="text-sm uppercase tracking-tight hover:opacity-75 transition-opacity">
                  Blogs
                </Link>
              </nav>

              {/* Desktop Center Logo */}
              <div className="absolute left-1/2 transform -translate-x-1/2">
                <Link href="/" className="flex items-center">
                  <span className="font-editorial-ultralight text-2xl text-[#D4AF37]">Grandma Jazz</span>
                </Link>
              </div>

              {/* Desktop Right Nav */}
              <div className="flex items-center space-x-4">
                {isAuthenticated ? (
                  <div className="relative">
                    <button 
                      ref={profileButtonRef}
                      onClick={handleProfileClick}
                      className="flex items-center space-x-2 hover:opacity-75 transition-opacity"
                    >
                      <div className="w-8 h-8 rounded-full bg-[#D4AF37] text-[#0A0A0A] flex items-center justify-center">
                        {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <span className="text-sm font-suisse-intl">{user?.name || 'Account'}</span>
                    </button>
                    
                    {/* Profile Dropdown - Improved positioning and z-index */}
                    {isProfileDropdownOpen && (
                      <div 
                        ref={profileDropdownRef}
                        className="absolute right-0 mt-2 w-48 bg-[#0A0A0A] border border-[#7c4d33]/30 rounded-xl shadow-xl py-1 z-50 backdrop-blur-md"
                      >
                        <Link 
                          href="/profile" 
                          className="block px-4 py-2 text-sm hover:bg-[#7c4d33]/30 transition-colors"
                          onClick={handleMenuItemClick}
                        >
                          Profile
                        </Link>
                        <Link 
                          href="/orders" 
                          className="block px-4 py-2 text-sm hover:bg-[#7c4d33]/30 transition-colors"
                          onClick={handleMenuItemClick}
                        >
                          My Orders
                        </Link>
                        {isAdmin && (
                          <Link 
                            href="/admin" 
                            className="block px-4 py-2 text-sm text-[#D4AF37] hover:bg-[#7c4d33]/30 transition-colors"
                            onClick={handleMenuItemClick}
                          >
                            Admin Dashboard
                          </Link>
                        )}
                        <div className="border-t border-[#7c4d33]/30 my-1"></div>
                        <button 
                          onClick={(e) => {
                            handleMenuItemClick(e);
                            logout();
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-[#7c4d33]/30 transition-colors"
                        >
                          Logout
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <button 
                    onClick={handleLoginClick}
                    className="flex items-center space-x-2 text-sm font-suisse-intl-mono uppercase tracking-tight hover:text-[#D4AF37] transition-colors"
                  >
                    <span>Login</span>
                  </button>
                )}
                
                <button 
                  onClick={() => setIsCartOpen(true)}
                  className="flex items-center transition-all duration-300 ease-in-out hover:opacity-75 ml-2"
                >
                  <div className="relative">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                      <line x1="3" y1="6" x2="21" y2="6"></line>
                      <path d="M16 10a4 4 0 0 1-8 0"></path>
                    </svg>
                    {totalItems > 0 && (
                      <div className="absolute -top-2 -right-2 bg-[#D4AF37] text-[#0A0A0A] text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {totalItems}
                      </div>
                    )}
                  </div>
                </button>
              </div>
            </>
          )}
        </header>
      )}

      {/* Mobile Menu - shown only when open with animation */}
      {(isMobileMenuOpen || isMenuTransitioning) && (
        <header 
          className={`max-w-5xl w-11/12 rounded-b-2xl bg-[#0A0A0A]/80 backdrop-blur-md border border-[#7c4d33]/20 text-white transition-all duration-1000 ease-in-out ${
            isMenuTransitioning ? 'opacity-0 translate-y-[-100%]' : 'opacity-100 translate-y-0'
          }`}
        >
          <div className="py-5 px-8 flex flex-col">
            {/* Menu Items at Top */}
            <nav className="flex flex-col items-center space-y-4 mb-6">
              {[
                { title: 'SHOP ALL', href: '/products' },
                { title: 'CAFÉ', href: '#' },
                { title: 'BLOGS', href: '/blogs' }
              ].map((item, index) => (
                <Link 
                  key={item.title}
                  href={item.href}
                  className={`uppercase text-sm font-suisse-intl-mono tracking-wide transition-all duration-300 ease-in-out transform ${
                    isMenuTransitioning ? 'opacity-0 translate-y-[-10px]' : 'opacity-100 translate-y-0'
                  }`}
                  style={{ transitionDelay: `${index * 0.1}s` }}
                  onClick={handleToggleMenu}
                >
                  {item.title}
                </Link>
              ))}
              
              {isAuthenticated ? (
                <>
                  <Link 
                    href="/profile" 
                    className={`uppercase text-sm font-suisse-intl-mono tracking-wide transition-all duration-300 ease-in-out transform ${
                      isMenuTransitioning ? 'opacity-0 translate-y-[-10px]' : 'opacity-100 translate-y-0'
                    }`}
                    style={{ transitionDelay: '0.3s' }}
                    onClick={handleToggleMenu}
                  >
                    PROFILE
                  </Link>
                  <Link 
                    href="/orders" 
                    className={`uppercase text-sm font-suisse-intl-mono tracking-wide transition-all duration-300 ease-in-out transform ${
                      isMenuTransitioning ? 'opacity-0 translate-y-[-10px]' : 'opacity-100 translate-y-0'
                    }`}
                    style={{ transitionDelay: '0.4s' }}
                    onClick={handleToggleMenu}
                  >
                    MY ORDERS
                  </Link>
                  {isAdmin && (
                    <Link 
                      href="/admin" 
                      className={`uppercase text-sm font-suisse-intl-mono tracking-wide text-[#D4AF37] transition-all duration-300 ease-in-out transform ${
                        isMenuTransitioning ? 'opacity-0 translate-y-[-10px]' : 'opacity-100 translate-y-0'
                      }`}
                      style={{ transitionDelay: '0.5s' }}
                      onClick={handleToggleMenu}
                    >
                      ADMIN
                    </Link>
                  )}
                  <button 
                    onClick={() => {
                      handleToggleMenu();
                      logout();
                    }}
                    className={`uppercase text-sm font-suisse-intl-mono tracking-wide text-red-400 transition-all duration-300 ease-in-out transform ${
                      isMenuTransitioning ? 'opacity-0 translate-y-[-10px]' : 'opacity-100 translate-y-0'
                    }`}
                    style={{ transitionDelay: '0.6s' }}
                  >
                    LOGOUT
                  </button>
                </>
              ) : (
                <button 
                  onClick={handleLoginClick}
                  className={`uppercase text-sm font-suisse-intl-mono tracking-wide transition-all duration-300 ease-in-out transform ${
                    isMenuTransitioning ? 'opacity-0 translate-y-[-10px]' : 'opacity-100 translate-y-0'
                  }`}
                  style={{ transitionDelay: '0.3s' }}
                >
                  LOGIN
                </button>
              )}
            </nav>
            
            {/* Controls at Bottom */}
            <div className="flex justify-between items-center">
              <button 
                onClick={handleToggleMenu}
                aria-label="Close menu"
                className="text-white transition-all duration-300 ease-in-out hover:rotate-90"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
              
              <div className="absolute left-1/2 transform -translate-x-1/2">
                <span className="font-editorial-ultralight text-xl text-[#D4AF37]">Grandma Jazz</span>
              </div>
              
              <button 
                onClick={() => {
                  handleToggleMenu();
                  setIsCartOpen(true);
                }}
                className="flex items-center group"
              >
                <div className="relative transition-transform duration-300 ease-in-out group-hover:scale-110">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <path d="M16 10a4 4 0 0 1-8 0"></path>
                  </svg>
                  {totalItems > 0 && (
                    <div className="absolute -top-2 -right-2 bg-[#D4AF37] text-[#0A0A0A] text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {totalItems}
                    </div>
                  )}
                </div>
              </button>
            </div>
          </div>
        </header>
      )}
    </div>
  );
}