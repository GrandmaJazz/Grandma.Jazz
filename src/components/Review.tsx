'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AnimatedSection } from '@/components/AnimatedSection';

// Move keyframes to a global style that will be added once
const globalStyles = `
  @keyframes scrollText {
    0% { transform: translateX(0); }
    10% { transform: translateX(0); }
    60% { transform: translateX(calc(-100% + 100%)); }
    100% { transform: translateX(0); }
  }
  
  @keyframes marquee {
    0% { transform: translateX(0); }
    100% { transform: translateX(calc(-100% - 2rem)); }
  }
  
  @media (prefers-reduced-motion: reduce) {
    .animate-marquee {
      animation-play-state: paused;
    }
  }
  
  .marquee-container {
    width: 100%;
    overflow: hidden;
    position: relative;
  }
  
  .animate-marquee {
    animation: marquee 30s linear infinite;
  }
  
  .text-overflow {
    overflow: hidden;
    white-space: nowrap;
    animation: scrollText 15s linear infinite;
    animation-delay: 2s;
  }
  
  .hide-scrollbar::-webkit-scrollbar {
    display: none;
  }
  
  .hide-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
`;

// ประกาศ interface สำหรับ Review
interface IReview {
  id: string;
  rating: number;
  text: string;
  userName: string;
  createdAt?: string;
}

// Review Card extracted as a memoized component
const ReviewCard = React.memo(({ review }: { review: IReview }) => {
  const textRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  
  // ตรวจสอบว่าข้อความยาวเกินกรอบหรือไม่
  useEffect(() => {
    if (textRef.current) {
      const { scrollWidth, clientWidth } = textRef.current;
      setIsOverflowing(scrollWidth > clientWidth);
    }
  }, [review.text]);
  
  // แสดงดาวตามคะแนน - memoized to avoid recreating on every render
  const stars = useMemo(() => {
    const starsArray = [];
    for (let i = 0; i < 5; i++) {
      starsArray.push(
        <span key={i} className={`text-xl ${i < review.rating ? 'text-[#D4AF37]' : 'text-white/30'}`}>
          ★
        </span>
      );
    }
    return starsArray;
  }, [review.rating]);
  
  return (
    <div className="min-w-[280px] w-[280px] h-[200px] bg-[#0A0A0A]/70 border border-white/20 backdrop-blur-md p-6 rounded-[20px] shadow-xl relative overflow-hidden flex flex-col flex-shrink-0">
      {/* Star Rating */}
      <div className="flex mb-4">
        {stars}
      </div>
      
      {/* Review Text ที่มีแอนิเมชันเลื่อนเมื่อข้อความยาวเกินกรอบ */}
      <div 
        ref={textRef}
        className={`flex-grow mb-4 text-white text-base font-suisse-intl relative ${isOverflowing ? 'text-overflow' : 'line-clamp-3'}`}
      >
        "{review.text}"
      </div>
      
      {/* ชื่อผู้ใช้ */}
      <div className="mt-auto text-white/70 font-suisse-intl-mono tracking-wide text-sm">
        — {review.userName}
      </div>
    </div>
  );
});

ReviewCard.displayName = 'ReviewCard';

// Sample review data - ใช้เป็นข้อมูลหลักเพียงอย่างเดียว
const sampleReviews = [
  {
    id: '1',
    rating: 5,
    text: 'I feel like a baby chicken, warm & comfy under the red lights.',
    userName: 'Mile'
  },
  {
    id: '2',
    rating: 4,
    text: "It's smooth, Really smooth.",
    userName: 'Saud'
  },
  {
    id: '3',
    rating: 5,
    text: 'Lights, music, chess...perfect.',
    userName: 'Richi'
  },
  {
    id: '4',
    rating: 5,
    text: '66...spaciousness...',
    userName: 'Laquelle'
  },
  {
    id: '5',
    rating: 5,
    text: "I haven't smoked in a while & I said to myself, if I do... I'm doing it in this place.",
    userName: 'Daniel'
  },
  {
    id: '6',
    rating: 5,
    text: 'This place feels like home.',
    userName: 'Jazzy Coco'
  },
  {
    id: '7',
    rating: 4,
    text: "I'm still under the influence of this magical musical flow.",
    userName: 'Sister Valentina.'
  },
  {
    id: '8',
    rating: 5,
    text: 'I drink coffee everyday,but this is different.',
    userName: 'Brother Turki'
  },
  {
    id: '9',
    rating: 5,
    text: "I feel like I'm part of something.",
    userName: 'Ebraheem'
  },
  {
    id: '10',
    rating: 4,
    text: "It's nice that I don't need to hide this.",
    userName: 'Uncle Gabe'
  },
  {
    id: '11',
    rating: 4,
    text: "This place is a dispensary?",
    userName: 'Nash'
  },
  {
    id: '12',
    rating: 5,
    text: "Tell Grandma Jazz, she has admirers from afar.",
    userName: 'Jay'
  }
];

// Main Review Component
export default function Review() {
  // ใช้ sampleReviews โดยตรง ไม่ต้องเรียก API
  const [reviews] = useState<IReview[]>(sampleReviews);
  
  const trackRef = useRef<HTMLDivElement>(null);
  const shouldAnimate = useRef<boolean>(false);
  
  // Add global styles only once
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = globalStyles;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  
  // Optimize marquee animation by checking if animation is needed
  useEffect(() => {
    // Only run if reviews are loaded and track exists
    if (reviews.length === 0 || !trackRef.current) return;
    
    const checkOverflow = () => {
      const track = trackRef.current;
      if (!track) return;
      
      const trackWidth = track.scrollWidth;
      const containerWidth = track.parentElement?.clientWidth || window.innerWidth;
      
      // Only animate if content is wider than container
      shouldAnimate.current = trackWidth > containerWidth;
      
      // Apply animation class based on actual need
      if (shouldAnimate.current) {
        track.classList.add('animate-marquee');
      } else {
        track.classList.remove('animate-marquee');
      }
    };
    
    // Check on load and resize
    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    
    return () => {
      window.removeEventListener('resize', checkOverflow);
    };
  }, [reviews]);
  
  // Generate duplicated review list for continuous scrolling - memoized
  const repeatedReviews = useMemo(() => {
    if (reviews.length === 0) return [];
    
    // Use a safe default for server-side rendering, then client will recalculate
    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const repetitions = Math.max(2, Math.ceil(screenWidth / (280 * reviews.length)));
    
    // Create array with duplicated reviews
    const repeated = [];
    for (let i = 0; i < repetitions; i++) {
      repeated.push(...reviews);
    }
    
    return repeated;
  }, [reviews]);
  
  return (
    <div className="min-h-[400px] py-16 bg-[#0A0A0A] relative overflow-hidden">
      {/* Noise texture overlay */}
      <div 
        className="fixed inset-0 opacity-10 mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundSize: '150px',
          backgroundRepeat: 'repeat',
          zIndex: -1
        }}
      />
      
      <AnimatedSection animation="fadeIn" className="w-full">
        <div className="text-center mb-10">
          <h2 className="text-4xl md:text-5xl font-editorial-ultralight mb-4 text-white">
            Don't just take <br/>
            our word for it.
          </h2>
          
          {/* Decorative line */}
          <div className="flex items-center justify-center mt-3">
            <div className="h-px w-16 bg-gradient-to-r from-transparent via-white/50 to-transparent"></div>
          </div>
          <p className="text-white/70 font-suisse-intl-mono text-sm tracking-wide mt-2 opacity-70 max-w-2xl mx-auto">
            Take theirs.
          </p>
        </div>
        
        {/* Optimized marquee review slider */}
        <div className="relative mb-12 overflow-hidden">
          {/* Edge fades */}
          <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-[#0A0A0A] to-transparent z-10 pointer-events-none"></div>
          <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[#0A0A0A] to-transparent z-10 pointer-events-none"></div>
          
          <div className="marquee-container">
            <div 
              ref={trackRef} 
              className="flex gap-6 py-4"
              style={{ padding: '0 2rem' }}
            >
              {/* Using repeatedReviews memoized array */}
              {repeatedReviews.map((review, index) => (
                <ReviewCard 
                  key={`review-${review.id}-${index}`} 
                  review={review} 
                />
              ))}
            </div>
          </div>
        </div>
      </AnimatedSection>
    </div>
  );
}