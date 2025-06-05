'use client';

import { useEffect, useState, useMemo, useCallback, memo, useRef } from 'react';
import { AnimatedSection } from '@/components/AnimatedSection';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

interface BlogPost {
  _id: string;
  title: string;
  content: string;
  excerpt: string;
  images: Array<{
    path: string;
    caption: string;
  }>;
  slug: string;
  isPublished: boolean;
  publishedAt: string;
  author: {
    _id: string;
    name: string;
    email: string;
  };
  views: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

// Constants moved outside component to avoid recreation
const CARD_COLORS = ['#e3dcd4', '#31372b', '#7c4d33', '#b88c41'] as const;

const NOISE_TEXTURE_SVG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`;

const NOISE_STYLE = {
  backgroundImage: NOISE_TEXTURE_SVG,
  backgroundSize: '150px',
  backgroundRepeat: 'repeat' as const
};

const MODAL_STYLES = {
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    zIndex: 50,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    backdropFilter: 'blur(8px)',
    overflowY: 'auto' as const,
    padding: '1rem'
  }
};

// Auto scroll constants
const SCROLL_THRESHOLD = 0; // 10px threshold from top/bottom
const AUTO_SCROLL_SPEED = 1; // pixels per frame (reduced for slower speed)
const AUTO_SCROLL_INTERVAL = 20; // ~50fps (increased for slower speed)

// Custom hook for window dimensions
const useWindowDimensions = () => {
  const [windowDimensions, setWindowDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  return windowDimensions;
};

// Custom hook for auto scroll
const useAutoScroll = (isModalOpen: boolean) => {
  const lastScrollY = useRef(0);
  const isAutoScrolling = useRef(false);
  const autoScrollDirection = useRef<'down' | 'up' | null>(null);
  const autoScrollTimer = useRef<NodeJS.Timeout | null>(null);
  const autoScrollStartPosition = useRef(0); // Track where auto scroll started

  const stopAutoScroll = useCallback(() => {
    if (autoScrollTimer.current) {
      clearInterval(autoScrollTimer.current);
      autoScrollTimer.current = null;
    }
    isAutoScrolling.current = false;
    autoScrollDirection.current = null;
    autoScrollStartPosition.current = 0;
  }, []);

  const startAutoScrollDown = useCallback(() => {
    if (isAutoScrolling.current || isModalOpen) return;
    
    isAutoScrolling.current = true;
    autoScrollDirection.current = 'down';
    autoScrollStartPosition.current = window.scrollY;
    
    autoScrollTimer.current = setInterval(() => {
      const currentScroll = window.scrollY;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      
      if (currentScroll >= maxScroll) {
        stopAutoScroll();
        return;
      }
      
      window.scrollBy(0, AUTO_SCROLL_SPEED);
    }, AUTO_SCROLL_INTERVAL);
  }, [isModalOpen, stopAutoScroll]);

  const startAutoScrollUp = useCallback(() => {
    if (isAutoScrolling.current || isModalOpen) return;
    
    isAutoScrolling.current = true;
    autoScrollDirection.current = 'up';
    autoScrollStartPosition.current = window.scrollY;
    
    autoScrollTimer.current = setInterval(() => {
      const currentScroll = window.scrollY;
      
      if (currentScroll <= 0) {
        stopAutoScroll();
        return;
      }
      
      window.scrollBy(0, -AUTO_SCROLL_SPEED);
    }, AUTO_SCROLL_INTERVAL);
  }, [isModalOpen, stopAutoScroll]);

  useEffect(() => {
    const handleScroll = () => {
      // Stop auto scroll if modal is open
      if (isModalOpen) {
        stopAutoScroll();
        return;
      }

      const currentScrollY = window.scrollY;

      // If auto scrolling, check if user scrolled in opposite direction by 10px
      if (isAutoScrolling.current) {
        const scrollDifference = currentScrollY - autoScrollStartPosition.current;
        
        // If auto scrolling down, check if user scrolled up by 10px from start position
        if (autoScrollDirection.current === 'down' && scrollDifference <= -SCROLL_THRESHOLD) {
          stopAutoScroll();
        }
        // If auto scrolling up, check if user scrolled down by 10px from start position  
        else if (autoScrollDirection.current === 'up' && scrollDifference >= SCROLL_THRESHOLD) {
          stopAutoScroll();
        }
        
        // Don't update lastScrollY during auto scroll to prevent interference
        return;
      }

      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const distanceFromBottom = maxScroll - currentScrollY;

      // Check for scroll down from top: when scroll position > 10px from top
      if (currentScrollY >= SCROLL_THRESHOLD && currentScrollY < maxScroll) {
        // Only start auto scroll down if we're scrolling down
        const scrollDifference = currentScrollY - lastScrollY.current;
        if (scrollDifference > 0) {
          startAutoScrollDown();
        }
      }
      
      // Check for scroll up from bottom: when distance from bottom > 10px
      if (distanceFromBottom >= SCROLL_THRESHOLD && currentScrollY > 0) {
        // Only start auto scroll up if we're scrolling up
        const scrollDifference = currentScrollY - lastScrollY.current;
        if (scrollDifference < 0) {
          startAutoScrollUp();
        }
      }

      lastScrollY.current = currentScrollY;
    };

    const handleWheel = (e: WheelEvent) => {
      // Allow wheel to stop auto scroll immediately for better user control
      if (isAutoScrolling.current) {
        stopAutoScroll();
        lastScrollY.current = window.scrollY;
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Allow keyboard to stop auto scroll immediately for better user control
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Space', 'Home', 'End'].includes(e.code)) {
        if (isAutoScrolling.current) {
          stopAutoScroll();
          lastScrollY.current = window.scrollY;
        }
      }
    };

    // Initialize last scroll position
    lastScrollY.current = window.scrollY;

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
      stopAutoScroll();
    };
  }, [isModalOpen, startAutoScrollDown, startAutoScrollUp, stopAutoScroll]);

  // Stop auto scroll when modal opens
  useEffect(() => {
    if (isModalOpen) {
      stopAutoScroll();
    }
  }, [isModalOpen, stopAutoScroll]);

  return { stopAutoScroll };
};

// Memoized components
const PlusIcon = memo(({ color }: { color: string }) => (
  <div 
    className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 border-2 border-[#0A0A0A] rounded-full flex items-center justify-center z-10 transition-transform duration-200 hover:scale-75" 
    style={{ backgroundColor: color }}
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-[#0A0A0A]">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  </div>
));
PlusIcon.displayName = 'PlusIcon';

const NoiseOverlay = memo(() => (
  <div 
    className="absolute inset-0 opacity-10 mix-blend-overlay pointer-events-none"
    style={NOISE_STYLE}
  />
));
NoiseOverlay.displayName = 'NoiseOverlay';

const ImageContainer = memo(({ 
  images, 
  title, 
  windowWidth 
}: { 
  images: BlogPost['images']; 
  title: string; 
  windowWidth: number; 
}) => {
  const containerStyle = useMemo(() => ({
    width: windowWidth >= 720 ? '606px' : 'calc(100% - 1rem)',
    height: windowWidth >= 720 ? '606px' : 'auto',
    aspectRatio: windowWidth < 720 ? '1/1' : 'unset',
    margin: windowWidth >= 720 ? '0 auto 1rem auto' : '0 auto 1rem auto'
  }), [windowWidth]);

  if (images.length === 0) return null;

  return (
    <div 
      className="relative bg-[#0A0A0A]/10 mb-2 sm:mb-4 rounded-xl sm:rounded-2xl overflow-hidden"
      style={containerStyle}
    >
      {images.length === 1 ? (
        <div className="relative w-full h-full">
          <img 
            src={`${process.env.NEXT_PUBLIC_API_URL}${images[0].path}`}
            alt={title}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
          {images[0].caption && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 sm:p-4">
              <p className="text-white text-xs sm:text-sm font-suisse-intl">
                {images[0].caption}
              </p>
            </div>
          )}
        </div>
      ) : (
        <Swiper
          modules={[Pagination]}
          pagination={{ clickable: true }}
          loop={images.length > 1}
          className="w-full h-full blog-swiper"
        >
          {images.map((image, index) => (
            <SwiperSlide key={index}>
              <div className="relative w-full h-full">
                <img 
                  src={`${process.env.NEXT_PUBLIC_API_URL}${image.path}`}
                  alt={`${title} - รูปที่ ${index + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
                {image.caption && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 sm:p-4">
                    <p className="text-white text-xs sm:text-sm font-suisse-intl">
                      {image.caption}
                    </p>
                  </div>
                )}
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      )}
    </div>
  );
});
ImageContainer.displayName = 'ImageContainer';

// BlogModal Component with optimizations
interface BlogModalProps {
  blog: BlogPost;
  color: string;
  onClose: () => void;
}

const BlogModal = memo<BlogModalProps>(({ blog, color, onClose }) => {
  const { width: windowWidth } = useWindowDimensions();

  const modalStyle = useMemo(() => ({
    backgroundColor: color,
    width: windowWidth >= 720 ? '670px' : '100%',
    maxWidth: windowWidth >= 720 ? '670px' : '100%'
  }), [color, windowWidth]);

  const closeButtonStyle = useMemo(() => ({ backgroundColor: color }), [color]);

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  const formattedDate = useMemo(() => formatDate(blog.publishedAt), [blog.publishedAt, formatDate]);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  return (
    <div style={MODAL_STYLES.overlay}>
      <div 
        className="relative my-4 sm:my-8 rounded-2xl shadow-2xl overflow-hidden border border-[#0A0A0A]/30"
        style={modalStyle}
      >
        <NoiseOverlay />

        {/* Close Button */}
        <div 
          className="absolute top-2 right-2 sm:top-4 sm:right-4 w-10 h-10 sm:w-12 sm:h-12 border-2 border-[#0A0A0A] rounded-full flex items-center justify-center z-20 cursor-pointer transition-transform duration-200 hover:scale-75" 
          style={closeButtonStyle}
          onClick={onClose}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="sm:w-8 sm:h-8 text-[#0A0A0A]">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </div>

        {/* Content Container */}
        <div className="relative z-10">
          {/* Title */}
          <div className="p-4 sm:p-6 pb-2 sm:pb-4">
            <h1 className="text-3xl sm:text-6xl font-bold text-[#0A0A0A] leading-tight pr-12 sm:pr-16">
              {blog.title}
            </h1>
          </div>

          {/* Header Image(s) */}
          <ImageContainer 
            images={blog.images}
            title={blog.title}
            windowWidth={windowWidth}
          />

          {/* Content Container */}
          <div className="px-4 sm:px-6 pb-4 sm:pb-6">
            {/* Meta Info */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-4 sm:mb-6 pb-2 sm:pb-4 border-b border-[#0A0A0A]/20">
              <div className="flex items-center text-[#0A0A0A] text-xs sm:text-sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1 sm:mr-2 text-[#0A0A0A] sm:w-4 sm:h-4">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                {formattedDate}
              </div>
              
              <div className="flex items-center text-[#0A0A0A] text-xs sm:text-sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1 sm:mr-2 text-[#0A0A0A] sm:w-4 sm:h-4">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                {blog.views} views
              </div>

              {blog.author.name && (
                <div className="flex items-center text-[#0A0A0A] text-xs sm:text-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1 sm:mr-2 text-[#0A0A0A] sm:w-4 sm:h-4">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  {blog.author.name}
                </div>
              )}
            </div>

            {/* Tags */}
            {blog.tags.length > 0 && (
              <div className="mb-4 sm:mb-6">
                <div className="flex flex-wrap gap-1 sm:gap-2">
                  {blog.tags.map((tag, index) => (
                    <span 
                      key={index}
                      className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-[#0A0A0A]/10 text-[#0A0A0A] rounded-full border border-[#0A0A0A]/20"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Main Content */}
            <div className="prose prose-sm sm:prose prose-lg max-w-none">
              {blog.content && blog.content.trim() !== '' ? (
                <div 
                  className="text-[#0A0A0A] leading-relaxed blog-content"
                  style={{
                    fontFamily: 'inherit',
                    fontSize: 'clamp(14px, 2.5vw, 16px)',
                    lineHeight: '1.8',
                    color: '#0A0A0A',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}
                >
                  {blog.content}
                </div>
              ) : (
                <div className="text-center py-8 sm:py-12">
                  <div className="text-[#0A0A0A]/50 text-lg sm:text-xl mb-2">📝</div>
                  <p className="text-[#0A0A0A] italic text-sm sm:text-base">
                    There is no content in this blog.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
BlogModal.displayName = 'BlogModal';

// Card Components with optimizations
const SmallCard = memo(({ post, color, onClick }: { 
  post: BlogPost; 
  color: string; 
  onClick: () => void;
}) => {
  const cardStyle = useMemo(() => ({
    width: '325px',
    height: '475px',
    backgroundColor: color
  }), [color]);

  return (
    <div 
      className="rounded-2xl shadow-lg overflow-hidden cursor-pointer relative group"
      style={cardStyle}
      onClick={onClick}
    >
      <NoiseOverlay />
      <PlusIcon color={color} />

      <div>
        <div className="relative overflow-hidden rounded-2xl m-4" style={{ height: '184px' }}>
          {post.images.length > 0 ? (
            <img 
              src={`${process.env.NEXT_PUBLIC_API_URL}${post.images[0].path}`}
              alt={post.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#F5F1E6]/20 to-[#D4AF37]/20 flex items-center justify-center">
              <div className="text-[#0A0A0A]/60 text-4xl">📝</div>
            </div>
          )}
        </div>
        
        <div className="px-6 pb-6 flex flex-col justify-start" style={{ height: '275px' }}>
          <h3 className="text-4xl font-bold text-[#0A0A0A]">
            {post.title}
          </h3>
        </div>
      </div>
    </div>
  );
});
SmallCard.displayName = 'SmallCard';

const LargeCard = memo(({ post, color, onClick }: { 
  post: BlogPost; 
  color: string; 
  onClick: () => void;
}) => {
  const cardStyle = useMemo(() => ({
    width: '580px',
    height: '480px',
    backgroundColor: color
  }), [color]);

  return (
    <div 
      className="rounded-2xl shadow-lg overflow-hidden cursor-pointer relative group"
      style={cardStyle}
      onClick={onClick}
    >
      <NoiseOverlay />
      <PlusIcon color={color} />

      <div className="flex h-full">
        <div className="relative overflow-hidden rounded-2xl m-4" style={{ width: '282px' }}>
          {post.images.length > 0 ? (
            <img 
              src={`${process.env.NEXT_PUBLIC_API_URL}${post.images[0].path}`}
              alt={post.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#F5F1E6]/20 to-[#D4AF37]/20 flex items-center justify-center">
              <div className="text-[#0A0A0A]/60 text-6xl">📝</div>
            </div>
          )}
        </div>
        
        <div className="py-8 pl-2 pr-8 flex flex-col justify-start" style={{ width: '290px' }}>
          <h3 className="text-4xl font-bold text-[#0A0A0A]">
            {post.title}
          </h3>
        </div>
      </div>
    </div>
  );
});
LargeCard.displayName = 'LargeCard';

// Main component with optimizations
const BlogsPage = () => {
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [selectedBlog, setSelectedBlog] = useState<BlogPost | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use auto scroll hook
  const isModalOpen = selectedBlog !== null;
  useAutoScroll(isModalOpen);

  const getCardColor = useCallback((index: number) => {
    return CARD_COLORS[index % CARD_COLORS.length];
  }, []);

  const handleCardClick = useCallback((post: BlogPost, color: string) => {
    setSelectedBlog(post);
    setSelectedColor(color);
  }, []);

  const handleModalClose = useCallback(() => {
    setSelectedBlog(null);
    setSelectedColor('');
  }, []);

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/blogs`);
        const data = await res.json();
        
        if (data.success) {
          console.log('Loaded blogs:', data.blogs.length);
          console.log('First blog content preview:', data.blogs[0]?.content?.substring(0, 100));
          setBlogPosts(data.blogs);
        } else {
          setError('Unable to load blog data.');
        }
      } catch (error) {
        console.error('Error fetching blogs:', error);
        setError('An error occurred while loading data.');
      } finally {
        setLoading(false);
      }
    };

    fetchBlogs();
  }, []);

  // Memoized layout calculations
  const mobileLayout = useMemo(() => {
    return blogPosts.map((post, index) => (
      <AnimatedSection key={post._id} animation="fadeIn">
        <SmallCard 
          post={post} 
          color={getCardColor(index)}
          onClick={() => handleCardClick(post, getCardColor(index))}
        />
      </AnimatedSection>
    ));
  }, [blogPosts, getCardColor, handleCardClick]);

  const mediumLayout = useMemo(() => {
    return Array.from({ length: Math.ceil(blogPosts.length / 2) }).map((_, groupIndex) => {
      const blog1 = blogPosts[groupIndex * 2];
      const blog2 = blogPosts[groupIndex * 2 + 1];

      return (
        <AnimatedSection key={groupIndex} animation="fadeIn">
          <div 
            className="flex justify-center items-start w-full max-w-6xl"
            style={{ height: '555px', gap: '100px' }}
          >
            <div style={{ alignSelf: 'flex-start' }}>
              <SmallCard 
                post={blog1} 
                color={getCardColor(groupIndex * 2)}
                onClick={() => handleCardClick(blog1, getCardColor(groupIndex * 2))}
              />
            </div>
            {blog2 && (
              <div style={{ alignSelf: 'flex-end' }}>
                <SmallCard 
                  post={blog2} 
                  color={getCardColor(groupIndex * 2 + 1)}
                  onClick={() => handleCardClick(blog2, getCardColor(groupIndex * 2 + 1))}
                />
              </div>
            )}
          </div>
        </AnimatedSection>
      );
    });
  }, [blogPosts, getCardColor, handleCardClick]);

  const largeLayout = useMemo(() => {
    return Array.from({ length: Math.ceil(blogPosts.length / 2) }).map((_, groupIndex) => {
      const blog1 = blogPosts[groupIndex * 2];
      const blog2 = blogPosts[groupIndex * 2 + 1];
      const isEvenGroup = groupIndex % 2 === 0;

      if (isEvenGroup) {
        return (
          <AnimatedSection key={groupIndex} animation="fadeIn">
            <div 
              className="flex justify-end items-start" 
              style={{ width: '1095px', height: '555px', gap: '100px' }}
            >
              <div style={{ alignSelf: 'flex-end' }}>
                <SmallCard 
                  post={blog1} 
                  color={getCardColor(groupIndex * 2)}
                  onClick={() => handleCardClick(blog1, getCardColor(groupIndex * 2))}
                />
              </div>
              {blog2 && (
                <LargeCard 
                  post={blog2} 
                  color={getCardColor(groupIndex * 2 + 1)}
                  onClick={() => handleCardClick(blog2, getCardColor(groupIndex * 2 + 1))}
                />
              )}
            </div>
          </AnimatedSection>
        );
      } else {
        return (
          <AnimatedSection key={groupIndex} animation="fadeIn">
            <div 
              className="flex justify-start items-start" 
              style={{ width: '1095px', height: '635px', gap: '100px' }}
            >
              <div style={{ alignSelf: 'flex-end' }}>
                <LargeCard 
                  post={blog1} 
                  color={getCardColor(groupIndex * 2)}
                  onClick={() => handleCardClick(blog1, getCardColor(groupIndex * 2))}
                />
              </div>
              {blog2 && (
                <SmallCard 
                  post={blog2} 
                  color={getCardColor(groupIndex * 2 + 1)}
                  onClick={() => handleCardClick(blog2, getCardColor(groupIndex * 2 + 1))}
                />
              )}
            </div>
          </AnimatedSection>
        );
      }
    });
  }, [blogPosts, getCardColor, handleCardClick]);

  if (loading) {
    return (
      <div className="min-h-screen pt-20 sm:pt-28 pb-16 bg-[#0A0A0A] flex justify-center items-center relative overflow-hidden">
        {/* Ambient background elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-40 mix-blend-soft-light">
          <div className="absolute top-0 left-0 w-1/3 h-1/2 rounded-full bg-[#7c4d33]/10 blur-[150px] transform -translate-x-1/2"></div>
          <div className="absolute bottom-0 right-0 w-1/2 h-1/2 rounded-full bg-[#b88c41]/10 blur-[180px] transform translate-x-1/4"></div>
        </div>
        
        <div className="w-12 h-12 sm:w-14 sm:h-14 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen pt-20 sm:pt-28 pb-16 bg-[#0A0A0A] flex justify-center items-center">
        <div className="text-center px-4">
          <div className="text-[#E67373] text-lg sm:text-xl mb-4">An error occurred.</div>
          <div className="text-[#e3dcd4] text-sm sm:text-base">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 sm:pt-28 pb-16 bg-[#0A0A0A] relative overflow-hidden">
      {/* Ambient background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-40 mix-blend-soft-light">
        <div className="absolute top-0 left-0 w-1/3 h-1/2 rounded-full bg-[#7c4d33]/10 blur-[150px] transform -translate-x-1/2"></div>
        <div className="absolute bottom-0 right-0 w-1/2 h-1/2 rounded-full bg-[#b88c41]/10 blur-[180px] transform translate-x-1/4"></div>
      </div>
      
      {/* Noise texture overlay */}
      <div 
        className="absolute inset-0 opacity-20 mix-blend-overlay pointer-events-none"
        style={NOISE_STYLE}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        {blogPosts.length === 0 ? (
          <AnimatedSection animation="fadeIn" className="text-center py-20">
            <div className="text-[#e3dcd4] text-lg sm:text-xl">There is currently no content to display.</div>
          </AnimatedSection>
        ) : (
          <div className="py-8 sm:py-12">
            
            {/* Mobile Layout - Single Column (< 1024px) */}
            <div className="lg:hidden space-y-6 flex flex-col items-center">
              {mobileLayout}
            </div>

            {/* Medium Desktop Layout - Small Cards with Staggered Layout (1024px - 1279px) */}
            <div className="hidden lg:block xl:hidden">
              <div className="flex flex-col items-center space-y-8">
                {mediumLayout}
              </div>
            </div>

            {/* Large Desktop Layout - Original Mixed Layout (>= 1280px) */}
            <div className="hidden xl:block">
              <div className="px-6 py-12 w-full flex flex-col items-center">
                <div className="space-y-8">
                  {largeLayout}
                </div>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Blog Modal */}
      {selectedBlog && (
        <BlogModal 
          blog={selectedBlog}
          color={selectedColor}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
};

export default BlogsPage;