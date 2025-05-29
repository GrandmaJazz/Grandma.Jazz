// frontend/src/app/page.tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import HeroSection from '@/components/HeroSection';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { cacheManager, CacheDurations } from '@/utils/cacheManager';

// Import interfaces
interface Music {
  _id: string;
  title: string;
  artist: string;
  filePath: string;
  duration: number;
}

interface Card {
  _id: string;
  title: string;
  description: string;
  imagePath: string;
  order: number;
  music: Music[];
}

// Dynamic imports to reduce main bundle size
const CDCardCarousel = dynamic(() => import('@/components/CDCardCarousel'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
    </div>
  )
});

// Lazy load components at the bottom of the page
const ProductStory = dynamic(() => import('@/components/ProductStory'), {
  loading: () => <div className="h-96 bg-[#0A0A0A]" />,
});

const SingleStory = dynamic(() => import('@/components/SingleStory'), {
  loading: () => <div className="h-96 bg-[#0A0A0A]" />,
});

const EventBooking = dynamic(() => import('@/components/evenbooking'), {
  loading: () => <div className="h-96 bg-[#0A0A0A]" />,
});

const Featured = dynamic(() => import('@/components/Featured'), {
  loading: () => <div className="h-96 bg-[#0A0A0A]" />,
});

const Review = dynamic(() => import('@/components/Review'), {
  loading: () => <div className="h-96 bg-[#0A0A0A]" />,
});

const Contact = dynamic(() => import('@/components/Contact'), {
  loading: () => <div className="h-96 bg-[#0A0A0A]" />,
});

// Separate CSS used across the page to reduce layout thrashing
const globalStyles = {
  noiseOverlay: {
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'repeat',
    backgroundSize: '150px 150px'
  }
};

// LocalStorage key for storing card selection state
const HERO_SECTION_SHOWN_KEY = 'grandma_jazz_hero_section_shown';

export default function Home() {
  // State for tracking initial loading
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Combine UI-related state to reduce re-renders
  const [uiState, setUiState] = useState({
    showCarousel: false,
    showViewer: false,
    isInteractionLocked: false,
    hasSelectedCard: false
  });
  
  // Separate state for model loading
  const [modelState, setModelState] = useState({
    loading: false,
    isLoadingModel: false,
    isModelLoaded: false
  });
  
  // Music player context
  const { playCard, currentMusic, isPlaying } = useMusicPlayer();
  
  // Get current pathname
  const pathname = usePathname();

  // Load state from localStorage on initialization
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Initialize cache management system
      cacheManager.startAutoCleanup(30); // Clean old cache every 30 minutes
      
      const hasSelectedCard = localStorage.getItem(HERO_SECTION_SHOWN_KEY) === 'true';
      
      if (hasSelectedCard) {
        setUiState(prev => ({
          ...prev,
          hasSelectedCard: true
        }));
      }
      
      // Start loading model immediately regardless of card selection
      setTimeout(() => {
        setModelState(prev => ({
          ...prev,
          isLoadingModel: true
        }));
      }, 300);
      
      // Mark as initialized
      setIsInitialized(true);
    }
  }, []);

  // Effect for checking conditions to show cards automatically
  useEffect(() => {
    // Wait until initialization is complete
    if (!isInitialized) return;
    
    // Check if not on admin page
    const isNotAdminPage = !pathname || !pathname.startsWith('/admin');
    // Check if no music is selected
    const noMusicSelected = !currentMusic;
    
    // If not on admin page and no music selected, show cards immediately
    if (isNotAdminPage && noMusicSelected) {
      // Add small delay to let page load first
      const showCarouselTimer = setTimeout(() => {
        setUiState(prev => ({
          ...prev,
          showCarousel: true
        }));
      }, 600);
      
      return () => clearTimeout(showCarouselTimer);
    } else {
      // If there's music, hide carousel
      setUiState(prev => ({
        ...prev,
        showCarousel: false
      }));
    }
  }, [isInitialized, pathname, currentMusic]);

  // Effect to show HeroSection when there's music
  useEffect(() => {
    // Simple: if music is playing, show HeroSection
    if (currentMusic) {
      setUiState(prev => ({
        ...prev,
        showViewer: true
      }));
    } else {
      setUiState(prev => ({
        ...prev,
        showViewer: false
      }));
    }
  }, [currentMusic]);

  // useCallback for functions passed to child components
  const handleCardSelection = useCallback((card: Card) => {
    // Start playing music from selected card
    playCard(card);
    
    // Save state to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(HERO_SECTION_SHOWN_KEY, 'true');
    }
    
    // Update state
    setUiState(prev => ({
      ...prev,
      showCarousel: false,
      isInteractionLocked: true,
      hasSelectedCard: true
    }));
    
    // Scroll to top
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, [playCard]);
  
  const handleStartLoading = useCallback(() => {
    setModelState(prev => ({
      ...prev,
      isLoadingModel: true
    }));
  }, []);

  const handleModelLoaded = useCallback(() => {
    setModelState(prev => ({
      ...prev,
      isModelLoaded: true
    }));
  }, []);

  const handleAnimationReady = useCallback(() => {
    // Animation is ready
  }, []);

  const handleHeroInit = useCallback(() => {
    setModelState(prev => ({
      ...prev,
      loading: true
    }));
  }, []);

  // Manage scroll on body
  useEffect(() => {
    const { showCarousel, isInteractionLocked } = uiState;
    
    if (showCarousel || isInteractionLocked) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }

    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [uiState.showCarousel, uiState.isInteractionLocked]);
  
  // Handle unlocking interaction after card selection
  useEffect(() => {
    if (!uiState.isInteractionLocked) return;
    
    const unlockTimer = setTimeout(() => {
      setUiState(prev => ({
        ...prev,
        isInteractionLocked: false
      }));
    }, 3000);
    
    return () => clearTimeout(unlockTimer);
  }, [uiState.isInteractionLocked]);

  // Show loading during initialization
  if (!isInitialized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0A0A0A] text-[#F5F1E6]">
        <div className="w-16 h-16 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-[#D4AF37]">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col relative overflow-hidden bg-[#0A0A0A] text-[#F5F1E6]">
      {/* Noise overlay */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-20 mix-blend-overlay z-10"
        style={{
          ...globalStyles.noiseOverlay,
          willChange: 'opacity'
        }}
        aria-hidden="true"
      />
      
      {/* Film grain effect */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-30 mix-blend-multiply z-10"
        style={{
          willChange: 'transform'
        }}
        aria-hidden="true"
      />

      {/* Carousel Modal - Show when no music is playing */}
      {uiState.showCarousel && !currentMusic && (
        <div 
          className="fixed inset-0 z-50 bg-[#0A0A0A] bg-opacity-80 backdrop-blur-sm flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="Select music card"
        >
          <div>
            <CDCardCarousel 
              onCardClick={handleCardSelection} 
            />
          </div>
        </div>
      )}
      
      {/* Interaction lock overlay */}
      {uiState.isInteractionLocked && (
        <div className="fixed inset-0 z-[90] bg-transparent cursor-not-allowed" aria-hidden="true" />
      )}
      
      {/* HeroSection - Show when music is playing */}
      {uiState.showViewer && (
        <HeroSection 
          showViewer={true}
          onInit={handleHeroInit}
          loading={modelState.loading}
          isLoadingModel={modelState.isLoadingModel}
          onModelLoaded={handleModelLoaded}
          onAnimationReady={handleAnimationReady}
          isPlaying={isPlaying}
        />
      )}

      {/* Other content sections */}
      <ProductStory />
      <SingleStory />
      <EventBooking />
      <Featured /> 
      <Review />
      <Contact/>
    </div>
  );
}