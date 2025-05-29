// frontend/src/components/HeroSection.tsx
'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { AnimatedSection } from '@/components/AnimatedSection';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';

// Interface for ThreeViewer ref
interface ThreeViewerRef {
  triggerModelMovement: () => void;
}

// Interface for HeroSection props
interface HeroSectionProps {
  showViewer: boolean;
  onInit?: () => void;
  loading?: boolean;
  isLoadingModel?: boolean;
  onModelLoaded?: () => void;
  logoSrc?: string; // Prop for image path
  logoAlt?: string; // Prop for alt text
  isPlaying?: boolean; // Prop for controlling model animation
  onAnimationReady?: () => void; // Callback when animation is ready
}

// Dynamic import for ThreeViewer with simple loading
const ThreeViewer = dynamic(() => import('@/components/ThreeViewer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen flex items-center justify-center bg-[#0A0A0A]">
      <div className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
    </div>
  )
});

const HeroSection: React.FC<HeroSectionProps> = ({ 
  showViewer, 
  onInit, 
  loading = false, 
  isLoadingModel = false,
  onModelLoaded,
  logoSrc = '/images/Grandma-Jazz-Logo.webp', // default path
  logoAlt = 'Grandma Jazz Logo',
  isPlaying = false,
  onAnimationReady
}) => {
  const [mounted, setMounted] = useState(false);
  const [overlayOpacity, setOverlayOpacity] = useState(0);
  const [textOffset, setTextOffset] = useState(0);
  const [textOpacity, setTextOpacity] = useState(1);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [showClickHint, setShowClickHint] = useState(false);
  
  // Add music player context
  const { play, pause, currentMusic, isPlaying: musicIsPlaying } = useMusicPlayer();
  
  // Create ref for text section
  const textSectionRef = useRef<HTMLDivElement>(null);
  // Type-specified ref
  const threeViewerRef = useRef<ThreeViewerRef>(null);
  
  // Effect for client-side mounting management
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setMounted(true);
    }
  }, []);
  
  // Effect for overlay management when showViewer changes
  useEffect(() => {
    if (showViewer) {
      // Show overlay before slide animation
      setOverlayOpacity(1);
      
      // Gradually reduce overlay opacity after slide starts
      const timer = setTimeout(() => {
        setOverlayOpacity(0);
      }, 350);
      
      return () => clearTimeout(timer);
    } else {
      setOverlayOpacity(0);
    }
  }, [showViewer]);
  
  // Effect for parallax scroll and text fade management
  useEffect(() => {
    if (!showViewer) return;
    
    // Throttle function to reduce update frequency
    const throttle = (func: Function, limit: number) => {
      let inThrottle: boolean = false;
      return function(this: any) {
        if (!inThrottle) {
          func.apply(this, arguments);
          inThrottle = true;
          setTimeout(() => inThrottle = false, limit);
        }
      };
    };
    
    const handleScroll = throttle(() => {
      if (!textSectionRef.current) return;
      
      const parallaxSpeed = 0.5;
      const scrollY = window.scrollY;
      const maxParallaxDistance = 200;
      
      // Calculate new offset and opacity values
      const newOffset = Math.min(scrollY * parallaxSpeed, maxParallaxDistance);
      
      // Use requestAnimationFrame for better performance
      requestAnimationFrame(() => {
        setTextOffset(newOffset);
        
        // Calculate text opacity based on scroll
        const startFade = 100;
        const endFade = 400;
        
        if (scrollY <= startFade) {
          setTextOpacity(1);
        } else if (scrollY >= endFade) {
          setTextOpacity(0);
        } else {
          const fadeProgress = (scrollY - startFade) / (endFade - startFade);
          setTextOpacity(1 - fadeProgress);
        }
      });
    }, 16); // Approximately 60fps
    
    // Use passive event listener for better performance
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [showViewer]);
  
  // Function called when model loading is complete
  const handleModelLoaded = useCallback(() => {
    console.log("Model loaded successfully");
    setModelLoaded(true);
    
    // Show click hint after model loads
    setTimeout(() => {
      setShowClickHint(true);
      // Hide hint after 5 seconds
      setTimeout(() => {
        setShowClickHint(false);
      }, 5000);
    }, 3000);
    
    // Call callback to parent component
    if (onModelLoaded) {
      onModelLoaded();
    }
  }, [onModelLoaded]);

  // Function for parent component to call triggerModelMovement
  const triggerModelMovement = useCallback(() => {
    if (threeViewerRef.current) {
      threeViewerRef.current.triggerModelMovement();
    }
    
    // Call onInit callback if available
    if (onInit) onInit();
  }, [onInit]);
  
  // Start loading model when isLoadingModel changes to true
  useEffect(() => {
    if (isLoadingModel && threeViewerRef.current) {
      console.log("Starting model load from HeroSection");
      threeViewerRef.current.triggerModelMovement();
    }
  }, [isLoadingModel]);
  
  // Call triggerModelMovement when showViewer changes from false to true
  useEffect(() => {
    if (showViewer) {
      // If card is selected and model is already loaded, no need to call triggerModelMovement again
      if (threeViewerRef.current) {
        triggerModelMovement();
      }
    }
  }, [showViewer, triggerModelMovement]);

  // Function for handling play/pause music
  const handlePlayPauseToggle = useCallback(() => {
    if (!currentMusic) {
      console.log("No music to play");
      return;
    }
    
    // Hide click hint when user interacts
    setShowClickHint(false);
    
    if (musicIsPlaying) {
      console.log("Pausing music from model control button");
      pause();
    } else {
      console.log("Playing music from model control button");
      play();
    }
  }, [currentMusic, musicIsPlaying, play, pause]);

  // Use useMemo for style objects that will be reused
  const viewer3dStyle = useMemo(() => ({
    transform: showViewer ? 'translateY(0)' : 'translateY(-100%)', 
    transition: 'transform 1s cubic-bezier(0.16, 1, 0.3, 1)', 
    height: showViewer ? 'auto' : '0',
    zIndex: 30,
    top: 0,
    left: 0,
    right: 0,
    touchAction: 'auto' as const,
    overflow: 'auto' as const
  }), [showViewer]);
  
  const textSectionStyle = useMemo(() => ({
    transform: showViewer ? 'translateY(0)' : 'translateY(-100%)', 
    transition: 'transform 1s cubic-bezier(0.16, 1, 0.3, 1)',
    height: showViewer ? 'auto' : '0',
    zIndex: 20,
    position: 'absolute' as const,
    backgroundColor: '#0A0A0A'
  }), [showViewer]);
  
  // Style for new image container
  const imageContainerStyle = useMemo(() => ({
    transform: `translateY(${textOffset}px)`,
    transition: 'transform 0.1s ease-out, opacity 0.2s ease-out',
    opacity: textOpacity
  }), [textOffset, textOpacity]);
  
  const overlayStyle = useMemo(() => ({
    opacity: overlayOpacity,
    transition: 'opacity 0.8s ease-in-out',
    height: '30vh',
  }), [overlayOpacity]);

  return (
    <>
      {/* Loading Indicator - Show when loading model and HeroSection is displayed */}
      {showViewer && !modelLoaded && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0A0A0A]">
          <div className="w-14 h-14 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin mb-4"></div>
        </div>
      )}

      {/* Transition Overlay */}
      <div 
        className="absolute inset-0 pointer-events-none z-40 bg-gradient-to-b from-[#0A0A0A] to-transparent"
        style={overlayStyle}
      />

      {/* 3D Viewer Section - Show immediately when showViewer is true */}
      <div 
        className="relative w-full scroll-container"
        style={viewer3dStyle}
      >
        <AnimatedSection animation="fadeIn" duration={0.8} className="relative w-full">
          {mounted && (
            <div className="relative w-full">
              {/* 3D Viewer */}
              <ThreeViewer 
                ref={threeViewerRef}
                height="h-[100vh]" 
                className="bg-transparent"
                onModelLoaded={handleModelLoaded}
                onAnimationReady={onAnimationReady}
                isPlaying={isPlaying}
              />
              
              {/* Music control button over the model */}
              {currentMusic && modelLoaded && (
                <button
                  onClick={handlePlayPauseToggle}
                  className="absolute bottom-4 left-1/2 transform -translate-x-1/2 
                    w-[100vh] h-[35vh]
                    xs:w-[100vh] xs:h-[35vh]
                    sm:w-[100vh] sm:h-[35vh]
                    md:w-[100vh] md:h-[35vh]
                    lg:w-[100vh] lg:h-[35vh]
                    xl:w-[900px] xl:h-[50vh]
                    2xl:w-[1100px] 2xl:h-[50vh]
                    3xl:w-[1300px]
                    4xl:w-[1500px]
                    5xl:w-[1700px]
                    bg-transparent hover:bg-transparent transition-all duration-300 cursor-pointer z-10 flex items-center justify-center group"
                  title={musicIsPlaying ? "Pause Music" : "Play Music"}
                >
                  {/* Hidden play/pause icon */}
                  <div className="text-white opacity-0 pointer-events-none">
                    {musicIsPlaying ? '⏸️' : '▶️'}
                  </div>
                </button>
              )}

              {/* Click Hint Animation - Minimal pulsing circle */}
              {showClickHint && currentMusic && modelLoaded && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 
                  w-[100vh] h-[35vh]
                  xs:w-[100vh] xs:h-[35vh]
                  sm:w-[100vh] sm:h-[35vh]
                  md:w-[100vh] md:h-[35vh]
                  lg:w-[100vh] lg:h-[35vh]
                  xl:w-[900px] xl:h-[50vh]
                  2xl:w-[1100px] 2xl:h-[50vh]
                  3xl:w-[1300px]
                  4xl:w-[1500px]
                  5xl:w-[1700px]
                  pointer-events-none z-20 flex items-center justify-center">
                  
                  {/* Ripple effect */}
                  <div className="relative">
                    <div className="w-8 h-8 bg-white/20 rounded-full animate-ping"></div>
                    <div className="absolute inset-0 w-8 h-8 bg-white/40 rounded-full animate-pulse"></div>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full"></div>
                  </div>
                  
                  {/* Enhanced text hint */}
                  <div className="absolute -bottom-[-90px] left-1/2 transform -translate-x-1/2 text-center animate-pulse">
                    <div className="text-sm text-white/80 font-medium mb-1">
                      Click to {musicIsPlaying ? 'pause' : 'play'} music
                    </div>
                    <div className="text-xs text-white/50 font-light">
                      Tap anywhere on the model
                    </div>
                  </div>
                </div>
              )}
              
              {/* Add shadow at bottom of 3D Viewer */}
              <div className="absolute bottom-0 left-0 right-0 h-[300px] bg-gradient-to-t from-[#0A0A0A] to-transparent pointer-events-none" />
            </div>
          )}
        </AnimatedSection>
      </div>
      
      {/* Container with black background and logo image - Show immediately when showViewer is true */}
      <div 
        ref={textSectionRef}
        className="relative w-full overflow-hidden"
        style={textSectionStyle}
      >
        <div className="hello-container h-[100vh] flex flex-col items-center justify-center w-full relative">
          {/* Logo image without frame - Support all screen sizes */}
          <div 
            className="w-full px-[15px] xs:px-[20px] sm:px-[30px] md:px-[40px] lg:px-[50px] xl:px-[60px] 2xl:px-[80px] 3xl:px-[100px] 4xl:px-[120px] flex items-center justify-center"
            style={imageContainerStyle}
          >
            {/* Logo image */}
            <div className="relative w-full 
              max-w-[280px] 
              xs:max-w-[320px] 
              sm:max-w-[450px] 
              md:max-w-[600px] 
              lg:max-w-[750px] 
              xl:max-w-[900px] 
              2xl:max-w-[1100px] 
              3xl:max-w-[1300px] 
              4xl:max-w-[1500px] 
              5xl:max-w-[1700px]
              aspect-[3/1] 
              mt-[-120px] 
              xs:mt-[-140px] 
              sm:mt-[-180px] 
              md:mt-[-250px] 
              lg:mt-[-280px] 
              xl:mt-[-300px] 
              2xl:mt-[-350px] 
              3xl:mt-[-400px] 
              4xl:mt-[-450px] 
              5xl:mt-[-500px]">
              <Image
                src={logoSrc}
                alt={logoAlt}
                fill
                className="object-contain drop-shadow-2xl"
                sizes="(max-width: 475px) 280px, 
                       (max-width: 640px) 320px, 
                       (max-width: 768px) 450px, 
                       (max-width: 1024px) 600px, 
                       (max-width: 1280px) 750px, 
                       (max-width: 1536px) 900px, 
                       (max-width: 1920px) 1100px, 
                       (max-width: 2560px) 1300px, 
                       (max-width: 3200px) 1500px, 
                       1700px"
                priority
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default React.memo(HeroSection);