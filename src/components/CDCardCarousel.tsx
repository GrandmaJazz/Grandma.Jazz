'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';

// ===== Types =====
interface CardData {
  id: number;
  imagePath: string;
  title: string;
  artist: string;
  year?: string;
}

interface CardState extends CardData {
  position: number;
  visible: boolean;
}

interface CardCarouselProps {
  onCardClick?: () => void;
}

// ===== Constants =====
// ข้อมูลการ์ดตั้งต้น - Updated for jazz theme
const ORIGINAL_CARDS: CardData[] = [
  { id: 1, imagePath: "/images/vinyl7.webp", title: "Beachside Swing", artist: "The Island Crooners", year: "1961" },
  { id: 2, imagePath: "/images/vinyl2.webp", title: "Silky Sax Sessions", artist: "Lady Ella & The Rhythm Kings", year: "1962" },
  { id: 3, imagePath: "/images/vinyl3.webp", title: "Monsoon Blues", artist: "Phuket Jazz Ensemble", year: "1965" },
  { id: 4, imagePath: "/images/vinyl4.webp", title: "Tropical Nocturne", artist: "The Golden Palms Trio", year: "1953" },
  { id: 5, imagePath: "/images/vinyl5.webp", title: "Breezy Melodies", artist: "Grandma's Favorites", year: "1957" },
  { id: 6, imagePath: "/images/vinyl6.webp", title: "Beachside Swing", artist: "The Island Crooners", year: "1961" },
  { id: 7, imagePath: "/images/vinyl1.webp", title: "Midnight in Bangkok", artist: "The Siam Quartet", year: "1958" }
];

// ค่าคงที่สำหรับการตั้งค่าต่างๆ
const CONSTANTS = {
  ANIMATION_DURATION: 300,
  SCROLL_THRESHOLD: 50,
  SWIPE_THRESHOLD: 40,
  SWIPE_VELOCITY_THRESHOLD: 0.5,
  INTERACTION_COOLDOWN: 250,
  VINYL_ANIMATION_DURATION: 3000,
  INITIAL_DELAY: 300,
};

// ===== CSS Styles =====
// CSS styles มีการย้ายออกจาก inline styles
const carouselStyles = `
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.8; }
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes floatNote {
    0% { transform: translateY(0) rotate(0deg); }
    50% { transform: translateY(-10px) rotate(5deg); }
    100% { transform: translateY(0) rotate(0deg); }
  }
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  @keyframes noise {
    0%, 100% { background-position: 0 0; }
    10% { background-position: -5% -10%; }
    20% { background-position: -15% 5%; }
    30% { background-position: 7% -25%; }
    40% { background-position: 20% 15%; }
    50% { background-position: -25% 10%; }
    60% { background-position: 15% 5%; }
    70% { background-position: 0% 15%; }
    80% { background-position: 25% 35%; }
    90% { background-position: -10% 10%; }
  }
  @keyframes vinylRotate {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  @keyframes dustFloat {
    0%, 100% { opacity: 0.2; transform: translate(0, 0); }
    25% { opacity: 0.3; transform: translate(5px, 10px); }
    50% { opacity: 0.1; transform: translate(10px, -5px); }
    75% { opacity: 0.3; transform: translate(-5px, 5px); }
  }
  @keyframes fadeInMessage {
    0% { opacity: 0; }
    100% { opacity: 1; }
  }
  @keyframes floatUpDown {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }
  
  .swing-animation {
    animation: floatUpDown 2s ease-in-out infinite;
  }
  
  .perspective-1000 {
    perspective: 1000px;
  }
  
  .vinyl-card {
    will-change: transform, opacity;
    backface-visibility: hidden;
    transform-style: preserve-3d;
  }
  
  .vinyl-disc {
    will-change: transform;
  }
  
  .carousel-container {
    cursor: grab;
    perspective: 1000px;
    transform-style: preserve-3d;
    transition: opacity 0.8s ease-out, transform 0.8s ease-out;
  }
  
  .carousel-container:active {
    cursor: grabbing;
  }
  
  .dust-particle {
    position: absolute;
    background-color: white;
    border-radius: 50%;
  }
  
  .card-shimmer {
    background: linear-gradient(90deg, #C2A14D, #D4AF37, #C2A14D);
    background-size: 400% 100%;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: shimmer 10s ease-in-out infinite;
  }
  
  .tutorial-msg {
    pointer-events: none;
  }
`;

// ===== Custom Hooks =====
// Custom hook สำหรับจัดการข้อมูลขนาดหน้าจอและคำนวณขนาดการ์ด
const useResponsiveLayout = () => {
  // ตรวจจับขนาดหน้าจอ
  const [screenSize, setScreenSize] = useState<'xs' | 'sm' | 'md' | 'lg' | 'xl'>('md');
  
  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth;
      if (width < 640) setScreenSize('xs');
      else if (width < 768) setScreenSize('sm');
      else if (width < 1024) setScreenSize('md');
      else if (width < 1280) setScreenSize('lg');
      else setScreenSize('xl');
    };
    
    updateScreenSize();
    
    // debounced window resize handler
    let timeoutId: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateScreenSize, 200);
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, []);
  
  // Memoized computed styles based on screen size
  const cardSize = useMemo(() => {
    switch (screenSize) {
      case 'xs': return { width: 'w-64', height: 'h-64' };
      case 'sm': return { width: 'w-72', height: 'h-72' };
      case 'md': return { width: 'w-80', height: 'h-80' };
      case 'lg': return { width: 'w-96', height: 'h-96' };
      case 'xl': return { width: 'w-96', height: 'h-96' };
      default: return { width: 'w-80', height: 'h-80' };
    }
  }, [screenSize]);
  
  const vinylSize = useMemo(() => {
    switch (screenSize) {
      case 'xs': return 'w-40 h-40';
      case 'sm': return 'w-48 h-48';
      case 'md': return 'w-56 h-56';
      case 'lg': return 'w-64 h-64';
      case 'xl': return 'w-64 h-64';
      default: return 'w-56 h-56';
    }
  }, [screenSize]);
  
  const fontSizes = useMemo(() => ({
    card: {
      title: screenSize === 'xs' ? 'text-lg' : screenSize === 'sm' ? 'text-xl' : 'text-2xl',
      artist: screenSize === 'xs' ? 'text-xs' : screenSize === 'sm' ? 'text-sm' : 'text-base',
      year: screenSize === 'xs' ? 'text-xs' : screenSize === 'sm' ? 'text-xs' : 'text-sm',
    },
    message: {
      arrow: screenSize === 'xs' ? 'text-xl' : screenSize === 'sm' ? 'text-2xl' : 'text-3xl',
      text: screenSize === 'xs' ? 'text-base' : screenSize === 'sm' ? 'text-lg' : 'text-xl',
    }
  }), [screenSize]);
  
  // Function to calculate card positioning based on its position in stack
  const getCardPosition = useCallback((position: number, offset: number = 0) => {
    const getOffsetValue = (xs: number, sm: number, md: number, lg: number, xl: number): number => {
      switch (screenSize) {
        case 'xs': return xs;
        case 'sm': return sm;
        case 'md': return md;
        case 'lg': return lg;
        case 'xl': return xl;
        default: return md;
      }
    };

    // For front card
    if (position === 0) {
      return {
        transform: `translateX(${-offset}px) rotateY(${offset * -0.05}deg) translateZ(50px)`,
        filter: 'none'
      };
    }

    // เรียงซ้ายขวา: สลับซ้ายขวาแบบกระจาย
    const baseOffsetX = getOffsetValue(40, 50, 60, 70, 80);
    const translateX = (position % 2 === 0 ? 1 : -1) * baseOffsetX * Math.ceil(position / 2);
    const translateZ = -getOffsetValue(40, 45, 50, 55, 60) * position;
    const translateY = getOffsetValue(5, 8, 10, 12, 15) * position;
    const rotateY = (position % 2 === 0 ? 1 : -1) * getOffsetValue(2, 3, 5, 6, 7) * Math.ceil(position / 2);

    return {
      transform: `
        translateX(${translateX}px)
        translateY(${translateY}px)
        translateZ(${translateZ}px)
        rotateY(${rotateY}deg)
      `,
      filter: `brightness(${1 - position * 0.08}) blur(${position * 0.4}px)`
    };
  }, [screenSize]);
  
  return {
    screenSize,
    cardSize,
    vinylSize,
    fontSizes,
    getCardPosition
  };
};

// Custom hook สำหรับจัดการ touch/mouse interactions
const useCarouselInteractions = (
  carouselRef: React.RefObject<HTMLDivElement>,
  options: {
    isAnimating: boolean;
    isInteractionBlocked: boolean;
    isTouchDevice: boolean;
    changeCard: (direction: 'left' | 'right') => void;
  }
) => {
  const { isAnimating, isInteractionBlocked, isTouchDevice, changeCard } = options;
  
  const [dragState, setDragState] = useState({
    isDragging: false,
    dragStart: null as number | null,
    dragOffset: 0,
    lastInteractionTime: 0
  });
  
  // Refs for tracking velocity
  const animationRef = useRef<number | null>(null);
  const lastDragTimeRef = useRef<number | null>(null);
  const lastDragXRef = useRef<number | null>(null);
  const wheelDeltaYRef = useRef<number>(0);
  const wheelTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Helper functions
  const updateDragPosition = useCallback((diff: number, currentX: number) => {
    // ปรับเป็นแนวนอน
    const resistance = 0.8;
    const easedDiff = diff * resistance;
    const maxDrag = 200;
    const clampedDiff = Math.max(Math.min(easedDiff, maxDrag), -maxDrag);

    if (animationRef.current) cancelAnimationFrame(animationRef.current);

    animationRef.current = requestAnimationFrame(() => {
      setDragState(prev => ({ ...prev, dragOffset: clampedDiff }));
    });

    // เพิ่มบันทึกตำแหน่งและเวลา
    lastDragXRef.current = currentX;
    lastDragTimeRef.current = Date.now();
  }, []);
  
  const resetDragState = useCallback(() => {
    setDragState(prev => ({
      ...prev,
      isDragging: false,
      dragStart: null
    }));
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);
  
  const animateReturnToCenter = useCallback(() => {
    const startTime = performance.now();
    const startOffset = dragState.dragOffset;
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / CONSTANTS.ANIMATION_DURATION, 1);
      
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      const newOffset = startOffset * (1 - easeOutCubic);
      
      setDragState(prev => ({ ...prev, dragOffset: newOffset }));
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setDragState(prev => ({ ...prev, dragOffset: 0 }));
        animationRef.current = null;
      }
    };
    
    animationRef.current = requestAnimationFrame(animate);
  }, [dragState.dragOffset]);
  
  const finishDrag = useCallback(() => {
    const now = Date.now();
    
    // ตรวจสอบ cooldown
    if (now - dragState.lastInteractionTime < CONSTANTS.INTERACTION_COOLDOWN) {
      resetDragState();
      return;
    }
    
    // ปรับ threshold เป็น 10% ของความกว้างการ์ด
    let cardWidth = 0;
    if (carouselRef.current) {
      cardWidth = carouselRef.current.offsetWidth;
    }
    const dynamicThreshold = cardWidth ? cardWidth * 0.1 : CONSTANTS.SWIPE_THRESHOLD;
  
    // ถ้า dragOffset ยังไม่เกิน threshold (เพราะถ้าเกินจะถูก handle ใน useEffect แล้ว)
    if (dragState.dragOffset <= dynamicThreshold && dragState.dragOffset >= -dynamicThreshold) {
      animateReturnToCenter();
    }
    
    setDragState(prev => ({ ...prev, lastInteractionTime: now }));
    resetDragState();
  }, [dragState.dragOffset, dragState.lastInteractionTime, resetDragState, animateReturnToCenter, carouselRef]);
  
  // Set up wheel event handler
  useEffect(() => {
    if (isTouchDevice || isInteractionBlocked) return;
    
    const handleGlobalWheel = (e: WheelEvent) => {
      if (isAnimating || isInteractionBlocked) return;

      // รวมค่า delta X (เปลี่ยนจาก deltaY เป็น deltaX)
      wheelDeltaYRef.current += e.deltaX;

      // ยกเลิก timeout เดิม
      if (wheelTimeoutRef.current) clearTimeout(wheelTimeoutRef.current);

      // สร้าง timeout ใหม่
      wheelTimeoutRef.current = setTimeout(() => {
        if (Math.abs(wheelDeltaYRef.current) >= CONSTANTS.SCROLL_THRESHOLD) {
          // scroll ขวา (deltaX เป็นบวก) = เลื่อนไปทางขวา
          // scroll ซ้าย (deltaX เป็นลบ) = เลื่อนไปทางซ้าย
          if (wheelDeltaYRef.current > 0) {
            changeCard('right');
          } else {
            changeCard('left');
          }
        }
        wheelDeltaYRef.current = 0;
      }, 200);
    };

    window.addEventListener('wheel', handleGlobalWheel, { passive: false });

    return () => {
      window.removeEventListener('wheel', handleGlobalWheel);
      if (wheelTimeoutRef.current) clearTimeout(wheelTimeoutRef.current);
    };
  }, [isAnimating, isInteractionBlocked, isTouchDevice, changeCard]);
  
  // Handle drag velocity and threshold detection
  useEffect(() => {
    if (!dragState.isDragging || isAnimating || isInteractionBlocked) return;

    let cardWidth = 0;
    if (carouselRef.current) {
      cardWidth = carouselRef.current.offsetWidth;
    }
    const dynamicThreshold = cardWidth ? cardWidth * 0.1 : CONSTANTS.SWIPE_THRESHOLD;

    // ตรวจจับ velocity
    let velocity = 0;
    if (lastDragXRef.current !== null && lastDragTimeRef.current !== null && dragState.dragStart !== null) {
      const dx = lastDragXRef.current - dragState.dragStart;
      const dt = (Date.now() - lastDragTimeRef.current) || 1;
      velocity = dx / dt;
    }

    // เงื่อนไข swipe เร็ว
    const velocityThreshold = cardWidth * 0.003;
    if (dragState.dragOffset > dynamicThreshold || velocity < -velocityThreshold) {
      resetDragState();
      changeCard('left');
    } else if (dragState.dragOffset < -dynamicThreshold || velocity > velocityThreshold) {
      resetDragState();
      changeCard('right');
    }
  }, [
    dragState.dragOffset, 
    dragState.isDragging, 
    dragState.dragStart, 
    isAnimating, 
    isInteractionBlocked, 
    carouselRef, 
    resetDragState, 
    changeCard
  ]);
  
  // Set up global mouse move and mouse up handlers
  useEffect(() => {
    if (!dragState.isDragging || isTouchDevice) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (dragState.dragStart === null || isAnimating || isInteractionBlocked) return;
      // แนวนอน
      const diff = dragState.dragStart - e.clientX;
      updateDragPosition(diff, e.clientX);
    };
    
    const handleMouseUp = () => {
      if (dragState.dragStart === null || isAnimating || isInteractionBlocked) return;
      finishDrag();
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [
    dragState.isDragging, 
    dragState.dragStart, 
    isAnimating, 
    isInteractionBlocked, 
    isTouchDevice, 
    updateDragPosition, 
    finishDrag
  ]);
  
  // Set up touchmove passive: false
  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel || !isTouchDevice) return;
    
    const handleTouchMove = (e: TouchEvent) => {
      if (dragState.isDragging && e.cancelable) e.preventDefault();
    };
    
    carousel.addEventListener('touchmove', handleTouchMove, { passive: false });
    return () => carousel.removeEventListener('touchmove', handleTouchMove);
  }, [dragState.isDragging, isTouchDevice, carouselRef]);
  
  // Event handlers
  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (isAnimating || isInteractionBlocked || !isTouchDevice) return;
    
    setDragState(prev => ({
      ...prev,
      dragStart: e.touches[0].clientX,
      isDragging: true
    }));
  }, [isAnimating, isInteractionBlocked, isTouchDevice]);
  
  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (dragState.dragStart === null || isAnimating || isInteractionBlocked || !isTouchDevice) return;
    
    const currentX = e.touches[0].clientX;
    const diff = dragState.dragStart - currentX;
    
    updateDragPosition(diff, currentX);
  }, [dragState.dragStart, isAnimating, isInteractionBlocked, isTouchDevice, updateDragPosition]);
  
  const handleTouchEnd = useCallback(() => {
    if (dragState.dragStart === null || isAnimating || isInteractionBlocked || !isTouchDevice) return;
    
    finishDrag();
  }, [dragState.dragStart, isAnimating, isInteractionBlocked, isTouchDevice, finishDrag]);
  
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isAnimating || isInteractionBlocked || isTouchDevice) return;
    
    setDragState(prev => ({
      ...prev,
      dragStart: e.clientX,
      isDragging: true
    }));
  }, [isAnimating, isInteractionBlocked, isTouchDevice]);
  
  return {
    dragState,
    handlers: {
      handleTouchStart,
      handleTouchMove,
      handleTouchEnd,
      handleMouseDown
    }
  };
};

// ===== Main Component =====
const CDCardCarousel: React.FC<CardCarouselProps> = ({ onCardClick }) => {
  // Refs
  const carouselRef = useRef<HTMLDivElement>(null);
  const assetsLoadedRef = useRef<boolean>(false);

  // Device & UI states
  const [isTouchDevice, setIsTouchDevice] = useState<boolean>(false);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [isInteractionBlocked, setIsInteractionBlocked] = useState<boolean>(true);
  const [elementsVisible, setElementsVisible] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  
  // UI message states
  const [tutorialPhase, setTutorialPhase] = useState<'controls' | 'selection' | 'hidden'>('controls');
  
  // Carousel states
  const [nextCardIndex, setNextCardIndex] = useState<number>(0);
  const [cards, setCards] = useState<CardState[]>(() => 
    ORIGINAL_CARDS.slice(0, 6).map((card, index) => ({
      ...card,
      position: index,
      visible: true
    }))
  );
  
  // Card transition state
  const [transitionInfo, setTransitionInfo] = useState<{
    direction: 'up' | 'down' | 'left' | 'right' | null;
    cardId: number | null;
    isFadingOut: boolean;
    isFadingIn: boolean;
  }>({ direction: null, cardId: null, isFadingOut: false, isFadingIn: false });
  
  // Vinyl selection animation state
  const [vinylState, setVinylState] = useState<{ 
    selected: boolean;
    enlarged: boolean;
    visible: boolean;
    fadingUp: boolean;
    rotating: boolean;
  }>({ selected: false, enlarged: false, visible: false, fadingUp: false, rotating: false });

  // Responsive layout hook
  const { cardSize, vinylSize, fontSizes, getCardPosition } = useResponsiveLayout();

  // Card transition function
  const changeCard = useCallback((direction: 'left' | 'right') => {
    if (isAnimating) return;
    setIsAnimating(true);
    
    // Update tutorial phase when controls are used
    if (tutorialPhase === 'controls') {
      setTutorialPhase('selection');
    }
    
    const duration = CONSTANTS.ANIMATION_DURATION;
    const topCardIndex = cards.findIndex(card => card.visible && card.position === 0);
    
    if (topCardIndex !== -1) {
      const topCardId = cards[topCardIndex].id;
      setTransitionInfo({ direction, cardId: topCardId, isFadingOut: true, isFadingIn: false });
      
      // Step 1: Fade out current card
      setTimeout(() => {
        setCards(prevCards => {
          const newCards = prevCards.map((card, i) =>
            i === topCardIndex
              ? { ...card, visible: false }
              : card.visible && card.position > 0
              ? { ...card, position: card.position - 1 }
              : card
          );
          return newCards;
        });

        setTransitionInfo(prev => ({ ...prev, cardId: null, isFadingOut: false }));

        // Step 2: Add new card and fade it in
        setTimeout(() => {
          const nextCard = ORIGINAL_CARDS[nextCardIndex];
          setTransitionInfo(prev => ({ ...prev, isFadingIn: true }));

          setNextCardIndex((nextCardIndex + 1) % ORIGINAL_CARDS.length);
          setCards(prevCards => [
            ...prevCards.filter(card => card.visible),
            { ...nextCard, position: 5, visible: true }
          ]);

          // Step 3: Complete transition
          setTimeout(() => {
            setTransitionInfo({ direction: null, cardId: null, isFadingOut: false, isFadingIn: false });
            setIsAnimating(false);
          }, duration * 0.7);
        }, duration * 0.4);
      }, duration);
    } else {
      setIsAnimating(false);
    }
  }, [isAnimating, tutorialPhase, cards, nextCardIndex]);

  // Use the custom hook for carousel interactions
  const { dragState, handlers } = useCarouselInteractions(carouselRef, {
    isAnimating,
    isInteractionBlocked,
    isTouchDevice,
    changeCard
  });

  // ฟังก์ชันสำหรับโหลดรูปภาพและตรวจสอบว่าโหลดเสร็จหรือยัง
  const preloadImages = useCallback(() => {
    const imagePromises = ORIGINAL_CARDS.map(card => {
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.src = card.imagePath;
        img.onload = () => resolve();
        img.onerror = () => resolve(); // ยังทำงานต่อได้แม้โหลดรูปไม่สำเร็จ
      });
    });
    
    Promise.all(imagePromises).then(() => {
      assetsLoadedRef.current = true;
      
      // เมื่อโหลดเสร็จแล้ว ให้รอเล็กน้อยแล้วค่อยแสดงคอมโพเนนต์
      setTimeout(() => {
        setElementsVisible(true);
        setIsInitializing(false);
        setIsInteractionBlocked(false);
      }, CONSTANTS.INITIAL_DELAY);
    });
  }, []);
  
  // Card click/double-click handlers
  const handleCardClick = useCallback(() => {
    if (isTouchDevice && onCardClick && !vinylState.enlarged && !vinylState.visible && !isInteractionBlocked) {
      triggerCardSelection();
    }
  }, [isTouchDevice, onCardClick, vinylState.enlarged, vinylState.visible, isInteractionBlocked]);
  
  const handleCardDoubleClick = useCallback(() => {
    if (!isTouchDevice && onCardClick && !vinylState.enlarged && !vinylState.visible && !isInteractionBlocked) {
      triggerCardSelection();
    }
  }, [isTouchDevice, onCardClick, vinylState.enlarged, vinylState.visible, isInteractionBlocked]);
  
  // Card selection animation
  const triggerCardSelection = useCallback(() => {
    setVinylState(prev => ({ ...prev, selected: true, enlarged: true }));
    
    setTimeout(() => {
      setVinylState(prev => ({ ...prev, visible: true, rotating: true }));
      
      setTimeout(() => {
        setVinylState(prev => ({ ...prev, fadingUp: true }));
        
        setTimeout(() => {
          if (onCardClick) onCardClick();
          
          setTimeout(() => {
            setVinylState({ selected: false, enlarged: false, visible: false, fadingUp: false, rotating: false });
          }, 100);
        }, 1000);
      }, 100);
    }, 100);
  }, [onCardClick]);
  
  // Initialize on mount - only runs once
  useEffect(() => {
    // ตรวจสอบอุปกรณ์สัมผัส
    setIsTouchDevice(('ontouchstart' in window) || (navigator.maxTouchPoints > 0));
    
    // เริ่มต้นโหลดรูปภาพ
    preloadImages();
    
    // Add global style sheet
    const styleSheet = document.createElement('style');
    styleSheet.textContent = carouselStyles;
    document.head.appendChild(styleSheet);
    
    // Cleanup
    return () => {
      if (document.head.contains(styleSheet)) {
        document.head.removeChild(styleSheet);
      }
    };
  }, [preloadImages]);
  
  // ป้องกันการลากรูปภาพ
  useEffect(() => {
    const images = carouselRef.current?.querySelectorAll('img');
    if (images) {
      images.forEach(img => {
        img.draggable = false;
        img.ondragstart = () => false;
      });
    }
  }, [cards]);
  
  // Memoize filtered visible cards for rendering
  const visibleCards = useMemo(
    () => cards.filter(card => card.visible),
    [cards]
  );

  // Memoize dust particles for performance
  const dustParticles = useMemo(
    () =>
      Array.from({ length: 15 }).map((_, i) => (
        <div
          key={i}
          className="dust-particle"
          style={{
            width: Math.random() * 3 + 1 + 'px',
            height: Math.random() * 3 + 1 + 'px',
            top: Math.random() * 100 + '%',
            left: Math.random() * 100 + '%',
            opacity: 0.1 + Math.random() * 0.2,
            animation: `dustFloat ${3 + Math.random() * 5}s ease-in-out infinite`,
            animationDelay: Math.random() * 5 + 's'
          }}
        ></div>
      )),
    []
  );

  // ====== Render ======
  // แสดง Loading Indicator หากยังโหลดไม่เสร็จ
  if (isInitializing) {
    return (
      <div className="flex justify-center items-center h-full w-full">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-2 border-[#D4AF37] opacity-30"></div>
          <div className="absolute top-0 left-0 w-16 h-16 rounded-full border-t-2 border-l-2 border-[#D4AF37] animate-spin"></div>
          <div className="absolute top-4 left-4 w-8 h-8 rounded-full bg-[#0A0A0A] flex items-center justify-center">
            <span className="text-[#D4AF37] text-xl">♪</span>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col justify-center items-center h-full w-full perspective-1000">
      {/* Vinyl title */}
      <div 
        className="mb-8 text-center"
        style={{
          opacity: elementsVisible ? 1 : 0,
          transform: elementsVisible ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 0.8s ease-out, transform 0.8s ease-out',
        }}
      >
        <h2 
          className="text-2xl sm:text-3xl md:text-4xl text-[#D4AF37] font-semibold mb-2"
          style={{
            textShadow: '0 0 10px rgba(212, 175, 55, 0.3)'
          }}
        >
          Our Collection
        </h2>
        <div className="flex items-center justify-center space-x-2">
          <div className="h-px w-12 bg-[#9C6554]"></div>
          <span className="text-[#F5F1E6] text-sm italic">vintage jazz vinyl records</span>
          <div className="h-px w-12 bg-[#9C6554]"></div>
        </div>
      </div>
      
      {/* Main container - centered the carousel */}
      <div className="flex justify-center items-center w-full">
        <div 
          ref={carouselRef}
          className={`relative ${cardSize.width} ${cardSize.height} carousel-container`}
          onTouchStart={handlers.handleTouchStart}
          onTouchMove={handlers.handleTouchMove}
          onTouchEnd={handlers.handleTouchEnd}
          onMouseDown={handlers.handleMouseDown}
          style={{ 
            opacity: elementsVisible ? 1 : 0,
            transform: elementsVisible ? 'translateY(0)' : 'translateY(40px)',
            pointerEvents: isInteractionBlocked ? 'none' : 'auto'
          }}
        >
          {/* Dust particles for vintage feel */}
          <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
            {dustParticles}
          </div>
          
          {/* การ์ดทั้งหมด */}
          {visibleCards.map((card) => {
            const offsetX = card.position === 0 ? dragState.dragOffset : 0;
            const zIndex = 10 - card.position;
            const positionStyle = getCardPosition(card.position, offsetX);
            const scaleFactor = 1 - (card.position * 0.03);
            const initialDelay = card.position * 0.1;
            
            // กำหนดการแสดงผลเมื่อการ์ดเฟดออก
            let fadeTransform = '';
            if (transitionInfo.isFadingOut && transitionInfo.cardId === card.id) {
              fadeTransform = transitionInfo.direction === 'left' 
                ? 'translateX(-300px)' 
                : 'translateX(300px)';
            }
            
            return (
              <div
                key={`${card.id}-${card.position}`}
                data-position={card.position}
                className={`vinyl-card absolute top-0 left-0 ${cardSize.width} ${cardSize.height} rounded-2xl shadow-xl overflow-hidden`}
                style={{
                  ...positionStyle,
                  zIndex: vinylState.visible && card.position === 0 ? 30 : zIndex,
                  boxShadow: card.position === 0 
                    ? '0 10px 30px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(212, 175, 55, 0.2)' 
                    : '0 10px 25px rgba(0,0,0,0.3)',
                  transition: dragState.isDragging && card.position === 0 && transitionInfo.cardId !== card.id 
                    ? 'none' 
                    : `all 0.45s cubic-bezier(0.2, 0.82, 0.31, 1) ${initialDelay}s`,
                  opacity: (transitionInfo.isFadingOut && transitionInfo.cardId === card.id) ? 0 : 
                          (transitionInfo.isFadingIn && card.position === 5) ? 0 : 
                          (!elementsVisible) ? 0 : 1,
                  transform: `${positionStyle.transform} ${fadeTransform} scale(${
                    vinylState.enlarged && card.position === 0 ? 1.2 : scaleFactor
                  }) ${!elementsVisible ? 'translateY(100px)' : ''}`,
                  border: card.position === 0 
                    ? '1px solid rgba(212, 175, 55, 0.3)' 
                    : '1px solid rgba(255,255,255,0.05)',
                  background: '#0A0A0A',
                  cursor: isTouchDevice ? 'default' : 'pointer',
                }}
                onClick={card.position === 0 ? handleCardClick : undefined}
                onDoubleClick={card.position === 0 ? handleCardDoubleClick : undefined}
              >
                {/* Film grain overlay */}
                <div 
                  className="absolute inset-0 pointer-events-none opacity-20 mix-blend-overlay z-10"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Cdefs%3E%3C/defs%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'repeat',
                    backgroundSize: '150px 150px'
                  }}
                ></div>
                
                <div className="relative w-full h-full overflow-hidden">
                  {/* Vinyl cover image */}
                  <img 
                    src={card.imagePath} 
                    alt={`${card.title} by ${card.artist}`} 
                    className="w-full h-full object-cover"
                    style={{
                      filter: 'sepia(10%) contrast(110%) brightness(90%)'
                    }}
                  />
                  
                  {/* Age effects - scratches and worn edges */}
                  <div 
                    className="absolute inset-0 pointer-events-none opacity-10"
                    style={{
                      backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100%25\' height=\'100%25\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cdefs%3E%3Cfilter id=\'scratches\' x=\'0\' y=\'0\' width=\'100%25\' height=\'100%25\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.1\' numOctaves=\'5\' stitchTiles=\'stitch\' result=\'noise\'/%3E%3CfeDisplacementMap in=\'SourceGraphic\' in2=\'noise\' scale=\'5\' xChannelSelector=\'R\' yChannelSelector=\'G\'/%3E%3C/filter%3E%3C/defs%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23scratches)\' fill=\'none\'/%3E%3C/svg%3E")'
                    }}
                  ></div>
                  
                  {/* ไฮไลท์ขอบ */}
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-[#D4AF37] via-[#D4AF37] to-transparent opacity-30"></div>
                  <div className="absolute top-0 left-0 bottom-0 w-px bg-gradient-to-b from-[#D4AF37] via-[#D4AF37] to-transparent opacity-30"></div>
                </div>
              </div>
            );
          })}
          
          {/* แผ่นไวนิล */}
          {vinylState.selected && vinylState.visible && (
            <div 
              className="absolute top-0 left-0 w-full h-full flex justify-center items-center pointer-events-none"
              style={{
                zIndex: 40,
                transition: `all ${CONSTANTS.VINYL_ANIMATION_DURATION}ms cubic-bezier(0.1, 0.7, 0.1, 1)`,
                transform: vinylState.fadingUp ? 'translateY(-400px) translateZ(-10px)' : 'translateY(-30px) translateZ(-10px)',
                opacity: vinylState.fadingUp ? 0 : 1
              }}
            >
              <div 
                className={`vinyl-disc ${vinylSize} rounded-full bg-[#0A0A0A] relative flex items-center justify-center shadow-lg`}
                style={{
                  animation: vinylState.rotating ? 'vinylRotate 2s linear infinite' : 'none'
                }}
              >
                {/* Vinyl grooves */}
                <div className="absolute inset-4 rounded-full border border-gray-700 opacity-40"></div>
                <div className="absolute inset-8 rounded-full border border-gray-700 opacity-40"></div>
                <div className="absolute inset-12 rounded-full border border-gray-700 opacity-40"></div>
                <div className="absolute inset-16 rounded-full border border-gray-700 opacity-40"></div>
                <div className="absolute inset-20 rounded-full border border-gray-700 opacity-40"></div>
                <div className="absolute inset-24 rounded-full border border-gray-700 opacity-40"></div>
                
                {/* Center label */}
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#D4AF37] via-[#C2A14D] to-[#9C6554] relative flex items-center justify-center shadow-md">
                  <div className="w-3 h-3 rounded-full bg-[#0A0A0A]"></div>
                </div>
                
                {/* Light reflection */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-transparent via-transparent to-[#F5F1E6] opacity-10"></div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Tutorial messages section */}
      <div className="mt-12 flex justify-center text-[#F5F1E6] z-50 tutorial-msg">
        {/* Controls message */}
        {tutorialPhase === 'controls' && (
          <div className="text-center swing-animation">
            <p className={`${fontSizes.message.arrow} text-[#D4AF37] font-bold mb-1`}>←</p>
            <p className={`${fontSizes.message.text} font-light`}>
              {isTouchDevice ? "Swipe left/right to explore our collection" : "Drag left/right to explore our collection"}
            </p>
            <p className={`${fontSizes.message.arrow} text-[#D4AF37] font-bold mt-1`}>→</p>
          </div>
        )}
        
        {/* Selection tutorial - this will remain visible once shown */}
        {tutorialPhase === 'selection' && (
          <div className="text-center swing-animation">
            <div className="flex items-center justify-center">
              <span className="text-[#D4AF37] text-lg mr-2">♪</span>
              <p className={`${fontSizes.message.text} font-light`}>
                {isTouchDevice ? "Tap to select a record" : "Double-tap to select a record"}
              </p>
              <span className="text-[#D4AF37] text-lg ml-2">♪</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CDCardCarousel;