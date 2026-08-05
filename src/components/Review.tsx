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

  /* Plain native horizontal scroll — the exact same mechanism the
     featured-products row (Featured.tsx) uses. Native touch scrolling is
     what actually feels "buttery": it's the OS/browser's own momentum and
     rubber-banding, not a JS reimplementation of it. A JS drag/momentum
     library (even a good one) always feels a step removed from that, which
     is why this carousel kept reading as jittery next to the products row
     above it. The ambient auto-drift and infinite loop are layered on top
     via scrollLeft nudges that get out of the way the instant a touch
     starts, so native touch handling is never intercepted. */
  .review-scroll {
    -webkit-overflow-scrolling: touch;
    scroll-behavior: auto;
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
        <span key={i} className={`text-xl ${i < review.rating ? 'text-[#B49B73]' : 'text-white/30'}`}>
          ★
        </span>
      );
    }
    return starsArray;
  }, [review.rating]);
  
  return (
    <div className="min-w-[280px] w-[280px] h-[200px] bg-transparent border border-[#F5F1E6]/15 p-7 rounded-box relative overflow-hidden flex flex-col flex-shrink-0">
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
      <div className="mt-auto font-label-mono text-[#F5F1E6]/40 text-[10px] uppercase tracking-[0.24em]">
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

// Gentle ambient drift speed (px/sec) — a slow constant crawl, not a race.
const AUTO_SCROLL_PX_PER_SEC = 40;
// After a touch/wheel interaction ends, wait this long before the ambient
// drift resumes, so native momentum/rubber-banding gets to fully settle.
const RESUME_DELAY_MS = 1200;

// Main Review Component
export default function Review() {
  // ใช้ sampleReviews โดยตรง ไม่ต้องเรียก API
  const [reviews] = useState<IReview[]>(sampleReviews);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isInteractingRef = useRef(false);
  const resumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);
  const singleSetWidthRef = useRef(0);
  const scrollCheckPendingRef = useRef(false);

  // Three copies back-to-back so the loop has a full set of buffer on
  // either side of the resting position — enough that neither the ambient
  // drift nor a hard user fling can reach a real edge before the position
  // gets silently rewound by exactly one set-width (visually seamless,
  // since sets are identical).
  const tripledReviews = useMemo(
    () => [0, 1, 2].flatMap((setIndex) =>
      reviews.map((r) => ({ ...r, _loopKey: `${setIndex}-${r.id}` }))
    ),
    [reviews]
  );

  // Add global styles only once
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = globalStyles;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const enforceLoopBounds = useCallback(() => {
    const el = scrollRef.current;
    const singleSetWidth = singleSetWidthRef.current;
    if (!el || !singleSetWidth) return;
    if (el.scrollLeft >= singleSetWidth * 2) {
      el.scrollLeft -= singleSetWidth;
    } else if (el.scrollLeft <= 0) {
      el.scrollLeft += singleSetWidth;
    }
  }, []);

  // Measure one set's width and start parked in the middle copy once the
  // tripled content has actually laid out.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    singleSetWidthRef.current = el.scrollWidth / 3;
    el.scrollLeft = singleSetWidthRef.current;
  }, [tripledReviews]);

  // Ambient auto-drift — a plain rAF nudge on scrollLeft, not a scroll
  // library. It backs off completely the instant a touch starts (see
  // pauseAutoplay below), so it never fights native touch handling.
  useEffect(() => {
    const tick = (ts: number) => {
      const el = scrollRef.current;
      if (el && !isInteractingRef.current) {
        const last = lastTsRef.current ?? ts;
        const dt = ts - last;
        el.scrollLeft += (AUTO_SCROLL_PX_PER_SEC * dt) / 1000;
        enforceLoopBounds();
      }
      lastTsRef.current = ts;
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [enforceLoopBounds]);

  const pauseAutoplay = useCallback(() => {
    isInteractingRef.current = true;
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
  }, []);

  const scheduleResume = useCallback(() => {
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    resumeTimeoutRef.current = setTimeout(() => {
      isInteractingRef.current = false;
    }, RESUME_DELAY_MS);
  }, []);

  // Rewind past the loop boundary during the user's own native
  // scroll/fling too, not just during ambient drift — batched onto a
  // single rAF per scroll burst so it doesn't thrash layout.
  const handleNativeScroll = useCallback(() => {
    if (scrollCheckPendingRef.current) return;
    scrollCheckPendingRef.current = true;
    requestAnimationFrame(() => {
      scrollCheckPendingRef.current = false;
      enforceLoopBounds();
    });
  }, [enforceLoopBounds]);

  useEffect(() => {
    return () => {
      if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    };
  }, []);

  return (
    <div className="min-h-[400px] py-24 sm:py-32 bg-[#0A0A0A] relative overflow-hidden">
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
        <div className="text-center mb-16 px-6">
          <h2 className="font-silver-garden text-[2.25rem] sm:text-5xl lg:text-[3rem] font-black tracking-tight text-[#F5F1E6] leading-[1.05]">
            Don't just take <br/>
            our word for it.
          </h2>
          
          {/* Decorative line */}
          <div className="flex items-center justify-center mt-3">
            <div className="h-px w-16 bg-[#F5F1E6]/20"></div>
          </div>
          <p className="font-label-mono text-[#F5F1E6]/40 text-[10px] uppercase tracking-[0.28em] mt-5 max-w-2xl mx-auto">
            Take theirs.
          </p>
        </div>
        
        {/* Slow ambient auto-drift by default; touch and drag to take over
            with real native scroll momentum — the exact same mechanism as
            the featured-products row above, so the two feel identical. */}
        <div className="relative mb-12">
          <div
            ref={scrollRef}
            className="review-scroll hide-scrollbar flex gap-6 overflow-x-auto px-4 md:px-8 py-4"
            onPointerDown={pauseAutoplay}
            onPointerUp={scheduleResume}
            onPointerCancel={scheduleResume}
            onTouchStart={pauseAutoplay}
            onTouchEnd={scheduleResume}
            onWheel={() => { pauseAutoplay(); scheduleResume(); }}
            onScroll={handleNativeScroll}
          >
            {tripledReviews.map((review) => (
              <div key={review._loopKey} className="flex-shrink-0 w-[280px]">
                <ReviewCard review={review} />
              </div>
            ))}
          </div>
        </div>
      </AnimatedSection>
    </div>
  );
}
