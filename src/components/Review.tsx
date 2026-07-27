'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { AnimatedSection } from '@/components/AnimatedSection';

// Move keyframes to a global style that will be added once
const globalStyles = `
  @keyframes scrollText {
    0% { transform: translateX(0); }
    10% { transform: translateX(0); }
    60% { transform: translateX(calc(-100% + 100%)); }
    100% { transform: translateX(0); }
  }

  .text-overflow {
    overflow: hidden;
    white-space: nowrap;
    animation: scrollText 5s linear infinite;
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
        <span key={i} className={`text-xl ${i < review.rating ? 'text-[#b88c41]' : 'text-white/30'}`}>
          ★
        </span>
      );
    }
    return starsArray;
  }, [review.rating]);
  
  return (
    <div className="min-w-[280px] w-[280px] h-[200px] bg-[#0A0A0A]/70 border border-white/20 backdrop-blur-md p-6 rounded-[15px] shadow-xl relative overflow-hidden flex flex-col flex-shrink-0">
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
    rating: 5,
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
    text: '...spaciousness...',
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
    rating: 5,
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
    rating: 5,
    text: "It's nice that I don't need to hide this.",
    userName: 'Uncle Gabe'
  },
  {
    id: '11',
    rating: 5,
    text: "This place is a dispensary?",
    userName: 'Nash'
  },
  {
    id: '12',
    rating: 5,
    text: "Tell Grandma Jazz, she has admirers from afar.",
    userName: 'Jay'
  },
  {
    id: '13',
    rating: 5,
    text: "DJ + Live Piano… could be fun… let's talk about it.",
    userName: 'Cagdas'
  },
  {
    id: '14',
    rating: 5,
    text: "Oh the monkeys… they were so sweet, but… that one monkey… looked at me funny.",
    userName: 'Anjela'
  },
  {
    id: '15',
    rating: 5,
    text: "I thought this was just a coffeeshop… until I looked around… & saw the smoking hats.",
    userName: 'Waleeed'
  },
  {
    id: '16',
    rating: 5,
    text: "I could never play with both hands, sure I had some lessons — but this is incredible.",
    userName: 'Mitch'
  },
  {
    id: '17',
    rating: 5,
    text: "Told my girl, no more talk — we're doing it right here, right now.",
    userName: 'Jimi'
  },
  {
    id: '18',
    rating: 5,
    text: "I'm here for 20 days, you will see me every day.",
    userName: 'Muhammad'
  },
  {
    id: '19',
    rating: 5,
    text: "Last week I was at home, thinking about this place — now I'm here.",
    userName: 'Ash'
  },
  {
    id: '20',
    rating: 5,
    text: "I never saw a piano solo. It was amazing.",
    userName: 'Karima'
  },
  {
    id: '21',
    rating: 5,
    text: "Pick my fun for tonight.",
    userName: 'Herbs'
  },
  {
    id: '22',
    rating: 5,
    text: "Please make me something light, nothing too strong — just a small joint.",
    userName: 'Aleksandra'
  },
  {
    id: '23',
    rating: 5,
    text: "Wait… you got ice-cream? Strawberry sorbet or blue coconut?",
    userName: 'Vishal'
  },
  {
    id: '24',
    rating: 5,
    text: "My first stop… & my last.",
    userName: 'Saeed'
  },
  {
    id: '25',
    rating: 5,
    text: "Perfect piccolo.",
    userName: 'Saeed'
  },
  {
    id: '26',
    rating: 5,
    text: "I saw something downstairs — a jar filled with old plastic baggies.",
    userName: 'Ziva'
  },
  {
    id: '27',
    rating: 5,
    text: "From zero to everything. Right in front of me.",
    userName: 'Imran'
  },
  {
    id: '28',
    rating: 5,
    text: "Anything is possible. Anytime.",
    userName: 'Imran'
  },
  {
    id: '29',
    rating: 5,
    text: "It's nice to be back, man.",
    userName: 'Ash'
  },
  {
    id: '30',
    rating: 5,
    text: "We're doing it. Right here.",
    userName: 'Jimi'
  },
  {
    id: '31',
    rating: 5,
    text: "Right now.",
    userName: 'Jimi'
  },
  {
    id: '32',
    rating: 5,
    text: "You will see me everyday.",
    userName: 'Muhammad'
  },
  {
    id: '33',
    rating: 5,
    text: "And take time.",
    userName: 'Nawaf'
  },
  {
    id: '34',
    rating: 5,
    text: "Because some days… I wonder too.",
    userName: 'Uncle Doug'
  }
];

// Main Review Component
export default function Review() {
  // ใช้ sampleReviews โดยตรง ไม่ต้องเรียก API
  const [reviews] = useState<IReview[]>(sampleReviews);
  const trackRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Drift state — a slow, gentle auto-scroll that visitors can pause on
  // hover and take over completely with a drag/swipe.
  const offsetRef = useRef(0);
  const singleSetWidthRef = useRef(0);
  const canAutoplayRef = useRef(false);
  const draggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartOffsetRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const resumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  // Add global styles only once
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = globalStyles;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // สร้าง repeated reviews สำหรับ seamless loop
  const repeatedReviews = useMemo(() => {
    // Duplicate reviews 2 ชุดเพื่อให้ loop ได้อย่างต่อเนื่อง
    return [...reviews, ...reviews];
  }, [reviews]);

  const applyTransform = useCallback(() => {
    if (trackRef.current) {
      trackRef.current.style.transform = `translate3d(-${offsetRef.current}px, 0, 0)`;
    }
  }, []);

  const wrapOffset = useCallback(() => {
    const width = singleSetWidthRef.current;
    if (width > 0) {
      offsetRef.current = ((offsetRef.current % width) + width) % width;
    }
  }, []);

  // วัดความกว้างของรีวิวชุดแรก และเช็คว่าเนื้อหายาวเกินกรอบพอจะเลื่อนอัตโนมัติหรือไม่
  useEffect(() => {
    const measure = () => {
      if (!trackRef.current || !containerRef.current) return;
      const trackWidth = trackRef.current.scrollWidth;
      const containerWidth = containerRef.current.clientWidth;
      singleSetWidthRef.current = trackWidth / 2;
      canAutoplayRef.current = singleSetWidthRef.current > containerWidth;
    };

    const timeoutId = setTimeout(measure, 100);
    window.addEventListener('resize', measure);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', measure);
    };
  }, [reviews]);

  // Gentle rAF-driven drift — replaces the old fixed CSS animation so it can
  // be paused on hover/touch and overridden by a drag at any time.
  useEffect(() => {
    const DRIFT_SPEED = 28; // px per second — slow enough to actually read

    const tick = (time: number) => {
      if (lastTimeRef.current == null) lastTimeRef.current = time;
      const dt = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      if (!isPaused && !draggingRef.current && canAutoplayRef.current) {
        offsetRef.current += DRIFT_SPEED * dt;
        wrapOffset();
        applyTransform();
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastTimeRef.current = null;
    };
  }, [isPaused, applyTransform, wrapOffset]);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    setIsPaused(true);
    dragStartXRef.current = e.clientX;
    dragStartOffsetRef.current = offsetRef.current;
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    const dx = e.clientX - dragStartXRef.current;
    offsetRef.current = dragStartOffsetRef.current - dx;
    wrapOffset();
    applyTransform();
  }, [applyTransform, wrapOffset]);

  const endDrag = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    // Give visitors a beat after they let go before drifting resumes
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    resumeTimeoutRef.current = setTimeout(() => setIsPaused(false), 1500);
  }, []);

  useEffect(() => {
    return () => {
      if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    };
  }, []);

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
        
        {/* Review grid - แสดงครบ 34 รีวิวแล้ว loop กลับไปที่ 1 */}
        <div
          ref={containerRef}
          className="relative mb-12 overflow-hidden cursor-grab active:cursor-grabbing select-none"
          style={{ touchAction: 'pan-y' }}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => {
            if (!draggingRef.current) setIsPaused(false);
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onPointerLeave={endDrag}
        >
          <div
            ref={trackRef}
            className="flex gap-6 py-4 px-4 md:px-8"
            style={{ willChange: 'transform' }}
          >
            {repeatedReviews.map((review, index) => (
              <ReviewCard
                key={`${review.id}-${index}`}
                review={review}
              />
            ))}
          </div>
        </div>
      </AnimatedSection>
    </div>
  );
}