'use client';

import { useEffect, useRef, useCallback } from 'react';
import { AnimatedSection } from '@/components/AnimatedSection';

// ประกาศ interface สำหรับ Review
interface IReview {
  id: string;
  rating: number;
  text: string;
  userName: string;
  createdAt?: string;
}

function ReviewCard({ review }: { review: IReview }) {
  return (
    <div className="w-[280px] h-[200px] bg-transparent border-[1.5px] border-[#B49B73]/70 p-6 rounded-box relative overflow-hidden flex flex-col flex-shrink-0">
      {/* Star Rating */}
      <div className="flex mb-2">
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className={`text-xl ${i < review.rating ? 'text-[#B49B73]' : 'text-white/30'}`}>
            ★
          </span>
        ))}
      </div>
      
      <div className="flex-grow mb-2 text-white text-sm leading-5 font-suisse-intl relative line-clamp-4">
        "{review.text}"
      </div>
      
      {/* ชื่อผู้ใช้ */}
      <div className="mt-auto font-label-mono text-[#F5F1E6]/40 text-[10px] uppercase tracking-[0.24em]">
        — {review.userName}
      </div>
    </div>
  );
}

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

const loopedReviews = [0, 1, 2].flatMap(copy =>
  sampleReviews.map(review => ({ ...review, key: `${copy}-${review.id}` }))
);
const AUTO_SCROLL_PX_PER_SECOND = 62;
const RESUME_AFTER_IDLE_MS = 120;

export default function Review() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoFrame = useRef<number | null>(null);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUserScrolling = useRef(false);
  const pointerIsDown = useRef(false);
  const lastFrame = useRef<number | null>(null);
  const autoPosition = useRef(0);
  const setWidth = useRef(0);
  const lastAutoWrite = useRef(0);

  const resumeAutoScroll = useCallback(() => {
    if (pointerIsDown.current) return;
    const el = scrollRef.current;
    if (!el) return;
    const width = setWidth.current;
    // Three identical sets let us re-centre the native scroll position
    // without changing the card in view after a swipe or a long wheel scroll.
    if (width && el.scrollLeft < width / 2) el.scrollLeft += width;
    if (width && el.scrollLeft > width * 1.5) el.scrollLeft -= width;
    autoPosition.current = el.scrollLeft;
    lastAutoWrite.current = el.scrollLeft;
    lastFrame.current = null;
    isUserScrolling.current = false;
  }, []);

  const pauseForInput = useCallback(() => {
    isUserScrolling.current = true;
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    if (!pointerIsDown.current) {
      // scrollend resumes immediately where supported; this short fallback
      // covers Safari versions that do not fire it for every momentum scroll.
      resumeTimer.current = setTimeout(resumeAutoScroll, RESUME_AFTER_IDLE_MS);
    }
  }, [resumeAutoScroll]);

  // Every real scroll event renews the pause, including momentum after touchend.
  // Auto-generated scroll events are ignored, so they cannot cancel the drift.
  const handleScroll = useCallback(() => {
    const position = scrollRef.current?.scrollLeft;
    if (position !== undefined && Math.abs(position - lastAutoWrite.current) > 1) pauseForInput();
  }, [pauseForInput]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const cards = el.children;
    setWidth.current = (cards[sampleReviews.length * 2] as HTMLElement).offsetLeft
      - (cards[sampleReviews.length] as HTMLElement).offsetLeft;
    autoPosition.current = setWidth.current;
    el.scrollLeft = autoPosition.current;
    lastAutoWrite.current = el.scrollLeft;

    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');

    const tick = (now: number) => {
      if (!isUserScrolling.current && !motionPreference.matches && !document.hidden && setWidth.current) {
        const delta = Math.min(now - (lastFrame.current ?? now), 64);
        autoPosition.current += AUTO_SCROLL_PX_PER_SECOND * delta / 1000;
        // Wrap by the measured distance between identical card sets; dividing
        // scrollWidth by three also counted the outer padding and caused a jump.
        if (autoPosition.current >= setWidth.current * 2) autoPosition.current -= setWidth.current;
        el.scrollLeft = autoPosition.current;
        lastAutoWrite.current = el.scrollLeft;
      }
      lastFrame.current = now;
      autoFrame.current = requestAnimationFrame(tick);
    };
    const handleScrollEnd = () => {
      if (isUserScrolling.current && !pointerIsDown.current) {
        if (resumeTimer.current) clearTimeout(resumeTimer.current);
        resumeAutoScroll();
      }
    };
    el.addEventListener('scrollend', handleScrollEnd);
    autoFrame.current = requestAnimationFrame(tick);
    return () => {
      if (autoFrame.current) cancelAnimationFrame(autoFrame.current);
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
      el.removeEventListener('scrollend', handleScrollEnd);
    };
  }, [resumeAutoScroll]);

  return (
    <div className="min-h-[400px] py-16 sm:py-24 lg:py-32 bg-[#181818] relative overflow-hidden">
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
        <div className="text-center mb-12 sm:mb-16 px-6">
          <h2 className="font-silver-garden text-[2.25rem] sm:text-5xl lg:text-[3rem] font-black tracking-tight text-[#e3dcd4] leading-[1.05]">
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
        
        {/* Native swipe momentum first; the steady drift resumes as soon as it ends. */}
        <div className="relative mb-12">
          <div
            ref={scrollRef}
            className="review-scroll flex gap-6 overflow-x-auto px-4 md:px-8 py-4"
            aria-label="Customer quotes"
            onPointerDown={() => { pointerIsDown.current = true; pauseForInput(); }}
            onPointerUp={() => { pointerIsDown.current = false; pauseForInput(); }}
            onPointerCancel={() => { pointerIsDown.current = false; pauseForInput(); }}
            onTouchStart={() => { pointerIsDown.current = true; pauseForInput(); }}
            onTouchEnd={() => { pointerIsDown.current = false; pauseForInput(); }}
            onTouchCancel={() => { pointerIsDown.current = false; pauseForInput(); }}
            onWheel={pauseForInput}
            onScroll={handleScroll}
          >
            {loopedReviews.map((review) => (
              <div key={review.key} className="flex-shrink-0 w-[280px]">
                <ReviewCard review={review} />
              </div>
            ))}
          </div>
        </div>

        <style jsx>{`
          .review-scroll {
            -webkit-overflow-scrolling: touch;
            scroll-behavior: auto;
            scrollbar-width: none;
          }
          .review-scroll::-webkit-scrollbar {
            display: none;
          }
        `}</style>

        {/* Lead the social proof somewhere: send people to Instagram to see
            more (and follow). Magnetic hover keeps it lively. */}
        <div className="flex flex-col items-center gap-3">
          <p className="text-white/60 font-suisse-intl-mono text-xs tracking-wide">
            More moments, daily.
          </p>
            <a
              href="https://instagram.com/grandmajazzphuket"
              target="_blank"
              rel="noopener noreferrer"
              className="group/ig inline-flex items-center gap-2.5 rounded-box border-[1.5px] border-[#B49B73] px-6 py-3 text-[#B49B73] font-suisse-intl-mono text-sm tracking-wide transition-all duration-200 ease-out will-change-transform hover:-translate-y-px active:translate-y-0 active:scale-[0.97] hover:bg-[#B49B73] hover:text-[#0A0A0A]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
              @grandmajazzphuket
              <span className="transition-transform duration-300 ease-out group-hover/ig:translate-x-1" aria-hidden="true">
                &rarr;
              </span>
            </a>
        </div>
      </AnimatedSection>
    </div>
  );
}
