'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';

// A post as served by /api/instagram (live Behold feed, cached server-side)
interface IgPost {
  id: string;
  permalink: string;
  mediaType: string;
  thumb: string;
  full: string;
  caption: string;
  color: string;
}

interface IgFeed {
  username: string;
  profilePictureUrl: string | null;
  posts: IgPost[];
}

const INSTAGRAM_URL = 'https://instagram.com/grandmajazzphuket';

const Contact = () => {
  // Animation state
  const [isVisible, setIsVisible] = useState(false);
  const [animationPhase, setAnimationPhase] = useState(0);
  const [isLargeScreen, setIsLargeScreen] = useState(false);

  // Live Instagram feed state
  const [feed, setFeed] = useState<IgFeed | null>(null);
  const [selected, setSelected] = useState<IgPost | null>(null);

  const contactRef = useRef<HTMLDivElement>(null);

  // Fetch the live feed once on mount; on any failure we keep feed=null
  // and fall back to the static screenshot.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/instagram')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data && Array.isArray(data.posts) && data.posts.length > 0) {
          setFeed(data);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Intersection Observer: trigger the entrance animation when in view
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        } else {
          setIsVisible(false);
          setAnimationPhase(0);
        }
      },
      {
        root: null,
        rootMargin: '0px',
        threshold: 0.2,
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

  // Animation sequence (large screens only)
  useEffect(() => {
    if (isVisible && isLargeScreen) {
      setAnimationPhase(0);

      const startTimer = setTimeout(() => {
        setAnimationPhase(1);
      }, 100);

      const timer1 = setTimeout(() => {
        setAnimationPhase(2);
      }, 1100);

      const timer2 = setTimeout(() => {
        setAnimationPhase(3);
      }, 2100);

      return () => {
        clearTimeout(startTimer);
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    } else if (!isLargeScreen) {
      setAnimationPhase(0);
    }
  }, [isVisible, isLargeScreen]);

  // Track screen size; reset animation on resize (large screens only)
  useEffect(() => {
    const checkScreenSize = () => {
      setIsLargeScreen(window.innerWidth >= 1024); // lg breakpoint
    };

    checkScreenSize();

    const handleResize = () => {
      checkScreenSize();

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

  const username = feed?.username || 'grandmajazzphuket';

  return (
    <>
      {/* Hide scrollbars inside the phone screen */}
      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none; /* Internet Explorer 10+ */
          scrollbar-width: none; /* Firefox */
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none; /* Safari and Chrome */
        }
      `}</style>

      <div
        ref={contactRef}
        className="relative w-full bg-[#0A0A0A] min-h-[90vh] flex flex-col items-center justify-center py-16 sm:py-20 overflow-hidden"
      >
        <div className="relative max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative flex flex-col lg:flex-row items-center justify-center gap-6 sm:gap-8 lg:gap-10 xl:gap-16">
            {/* Phone frame */}
            <div
              className="relative z-10"
              style={{
                transform: !isLargeScreen
                  ? 'translateY(0)'
                  : !isVisible || animationPhase === 0
                  ? 'translateY(100px)'
                  : animationPhase >= 3
                  ? 'translateX(-100px) translateY(0)'
                  : 'translateY(0)',
                opacity: !isLargeScreen ? 1 : (!isVisible || animationPhase === 0 ? 0 : 1),
                transition: !isLargeScreen
                  ? 'none'
                  : 'transform 1.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 1s ease-in-out',
              }}
            >
              <div className="w-[260px] h-[520px] sm:w-[280px] sm:h-[550px] md:w-[300px] md:h-[620px] lg:w-[320px] lg:h-[650px] rounded-[40px] bg-[#222222] p-3 shadow-lg relative overflow-hidden">
                {/* Phone bezel */}
                <div className="absolute inset-0 rounded-[40px] border-4 border-[#333333] pointer-events-none"></div>

                {/* Inner shadow */}
                <div className="absolute inset-0 rounded-[40px] shadow-inner pointer-events-none"></div>

                {/* Notch */}
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-[120px] h-[30px] bg-[#222222] rounded-b-[20px] z-20 flex items-center justify-center">
                  <div className="absolute left-1/4 w-3 h-3 rounded-full bg-[#111111] border border-[#333333]"></div>
                  <div className="w-12 h-1.5 rounded-full bg-[#333333]"></div>
                </div>

                {/* Screen */}
                <div className="relative w-full h-full rounded-[32px] overflow-hidden bg-black">
                  {feed ? (
                    <div
                      className="w-full h-full overflow-y-auto scrollbar-hide"
                      style={{ scrollBehavior: 'smooth' }}
                    >
                      {/* Profile header */}
                      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 pt-9 pb-3 bg-black/95 backdrop-blur-sm">
                        {feed.profilePictureUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={feed.profilePictureUrl}
                            alt={`@${username} on Instagram`}
                            className="w-9 h-9 rounded-full object-cover border border-[#b88c41]/60"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-[#222222] border border-[#b88c41]/60"></div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-semibold truncate">@{username}</p>
                          <p className="text-gray-400 text-[11px]">Live from Instagram</p>
                        </div>
                        <a
                          href={INSTAGRAM_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-bold text-black bg-[#b88c41] px-3 py-1 rounded-lg hover:opacity-90 transition-opacity"
                        >
                          Follow
                        </a>
                      </div>

                      {/* Post grid — tap a post to preview it */}
                      <div className="grid grid-cols-3 gap-[2px] pb-14">
                        {feed.posts.map((post) => (
                          <button
                            key={post.id}
                            type="button"
                            onClick={() => setSelected(post)}
                            className="relative aspect-square overflow-hidden focus:outline-none"
                            style={{ backgroundColor: `rgb(${post.color})` }}
                            aria-label={post.caption ? post.caption.slice(0, 80) : 'Instagram post'}
                          >
                            {post.thumb ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={post.thumb}
                                alt={post.caption ? post.caption.slice(0, 80) : 'Instagram post'}
                                className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                                loading="lazy"
                              />
                            ) : null}
                            {(post.mediaType === 'VIDEO' || post.mediaType === 'REEL') && (
                              <span className="absolute top-1.5 right-1.5 text-white drop-shadow">
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              </span>
                            )}
                            {post.mediaType === 'CAROUSEL_ALBUM' && (
                              <span className="absolute top-1.5 right-1.5 text-white drop-shadow">
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M4 6h2v14h14v2H4V6zm4-4h14v14H8V2zm2 2v10h10V4H10z" />
                                </svg>
                              </span>
                            )}
                          </button>
                        ))}
                      </div>

                      {/* Bottom fade */}
                      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent opacity-60"></div>

                      {/* Tap-to-preview overlay — tap the photo to open Instagram */}
                      {selected && (
                        <div className="absolute inset-0 z-30 bg-black/95 flex flex-col">
                          <div className="flex items-center justify-between px-4 pt-9 pb-2">
                            <p className="text-white text-sm font-semibold truncate">@{username}</p>
                            <button
                              type="button"
                              onClick={() => setSelected(null)}
                              className="text-gray-300 hover:text-white p-1"
                              aria-label="Close preview"
                            >
                              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                              </svg>
                            </button>
                          </div>

                          <a
                            href={selected.permalink || INSTAGRAM_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={selected.full || selected.thumb}
                              alt={selected.caption ? selected.caption.slice(0, 80) : 'Instagram post'}
                              className="w-full aspect-square object-cover"
                            />
                          </a>

                          <div className="flex-1 overflow-y-auto scrollbar-hide px-4 py-3">
                            {selected.caption && (
                              <p className="text-gray-300 text-xs leading-relaxed whitespace-pre-line">
                                {selected.caption}
                              </p>
                            )}
                          </div>

                          <div className="px-4 pb-6">
                            <a
                              href={selected.permalink || INSTAGRAM_URL}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block w-full text-center text-sm font-bold text-black bg-[#b88c41] rounded-xl py-2.5 hover:opacity-90 transition-opacity"
                            >
                              Open in Instagram
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Fallback: static screenshot while loading or if the feed is unavailable */
                    <div
                      className="w-full h-full overflow-y-auto scrollbar-hide"
                      style={{ scrollBehavior: 'smooth' }}
                    >
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
                            objectPosition: 'top center',
                          }}
                          priority
                        />
                        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent opacity-60 pointer-events-none"></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Home indicator */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-[120px] h-[5px] bg-[#333333] rounded-full"></div>

                {/* Side buttons */}
                <div className="absolute top-[120px] right-[-5px] h-[60px] w-[5px] bg-[#333333] rounded-l-sm"></div>
                <div className="absolute top-[200px] right-[-5px] h-[60px] w-[5px] bg-[#333333] rounded-l-sm"></div>
                <div className="absolute top-[120px] left-[-5px] h-[40px] w-[5px] bg-[#333333] rounded-r-sm"></div>
              </div>
            </div>

            {/* Right-hand content (text and buttons) */}
            <div
              className="relative z-0 lg:ml-0 text-center lg:text-left max-w-md lg:max-w-lg"
              style={{
                transform: !isLargeScreen
                  ? 'translateX(0)'
                  : !isVisible || animationPhase === 0
                  ? 'translateX(-50px)'
                  : animationPhase === 1
                  ? 'translateX(-50px)'
                  : animationPhase >= 3
                  ? 'translateX(50px)'
                  : 'translateX(0)',
                opacity: !isLargeScreen
                  ? 1
                  : !isVisible || animationPhase === 0
                  ? 0
                  : animationPhase === 1
                  ? 0.3
                  : 1,
                transition: !isLargeScreen
                  ? 'none'
                  : 'transform 1.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 1s ease-in-out',
              }}
            >
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 text-white">
                Connect <span className="text-[#b88c41]">with us</span>
              </h2>

              <p className="text-base sm:text-lg text-gray-300 mb-6 sm:mb-8 max-w-md mx-auto lg:mx-0">
                Follow us on Instagram for the latest updates, behind-the-scenes content, and special announcements.
              </p>

              <Link
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-6 sm:px-8 py-3 sm:py-4 bg-[#b88c41] rounded-xl text-black font-bold text-base sm:text-lg transition-transform hover:scale-105 active:scale-95 mb-8"
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
                    className="group flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/90 hover:bg-white transition-all duration-300 hover:scale-110"
                    title="WhatsApp: +66 94 860 5652"
                  >
                    <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="black">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893A11.821 11.821 0 0020.893 3.106"/>
                    </svg>
                  </Link>

                  {/* YouTube */}
                  <Link
                    href="https://www.youtube.com/@GrandmaJazzphuket"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/90 hover:bg-white transition-all duration-300 hover:scale-110"
                    title="YouTube Channel"
                  >
                    <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="black">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                  </Link>

                  {/* Email */}
                  <Link
                    href="mailto:grandmajazzphuket@gmail.com"
                    className="group flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/90 hover:bg-white transition-all duration-300 hover:scale-110"
                    title="Email: grandmajazzphuket@gmail.com"
                  >
                    <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="black">
                      <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-.887.716-1.615 1.615-1.615L12 12.728l10.385-8.886A1.636 1.636 0 0 1 24 5.457z"/>
                    </svg>
                  </Link>

                  {/* Phone */}
                  <Link
                    href="tel:+66948605652"
                    className="group flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/90 hover:bg-white transition-all duration-300 hover:scale-110"
                    title="Phone: 094-860-5652"
                  >
                    <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="black">
                      <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                    </svg>
                  </Link>

                  {/* Spotify */}
                  <Link
                    href="https://open.spotify.com/user/n25klmg82g2xwnuq1eu5824bg?si=QP2vN3TATVKg4TWokjEVKg"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/90 hover:bg-white transition-all duration-300 hover:scale-110"
                    title="Spotify Playlist"
                  >
                    <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="black">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
                    </svg>
                  </Link>

                  {/* Google Maps */}
                  <Link
                    href="https://maps.app.goo.gl/TwovCmqCYRTSkmtu7?g_st=com.google.maps.preview.copy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/90 hover:bg-white transition-all duration-300 hover:scale-110"
                    title="Find us on Google Maps"
                  >
                    <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="black">
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
