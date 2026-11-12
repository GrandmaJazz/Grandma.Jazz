'use client';

import { useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { AnimatedSection } from '@/components/AnimatedSection';
import { AUTO_SCROLL_PX_PER_SECOND, RESUME_AFTER_IDLE_MS } from '@/lib/carouselMotion';

// ประกาศ interface สำหรับ Review
interface IReview {
  id: string;
  rating?: number;
  sourceUrl?: string;
  translated?: boolean;
  text: string;
  userName: string;
  createdAt?: string;
}

function ReviewCard({ review }: { review: IReview }) {
  return (
    <div className="w-[280px] min-h-[200px] bg-transparent border-[1.5px] border-[#B49B73]/70 p-6 rounded-box relative overflow-hidden flex flex-col flex-shrink-0">
      {/* Match the existing five-star motif; only sourced Google excerpts
          carry the linked Google badge. No rating metadata is inferred. */}
      <div className="flex items-center gap-3 mb-2 h-7 text-[#B49B73]">
        <span className="inline-flex text-xl" aria-hidden="true">★★★★★</span>
        {review.sourceUrl && <a href={review.sourceUrl} target="_blank" rel="noopener noreferrer"
        aria-label={`Read ${review.userName}’s Google review${review.translated ? ' (English translation)' : ''}`}
        title={review.translated ? 'Google review · English translation' : 'Read the original Google review'}
        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#B49B73]/50 text-[#B49B73] hover:bg-[#B49B73]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#B49B73]">
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="currentColor">
          <path d="M22.56 12.25c0-.73-.06-1.42-.19-2.09H12v3.96h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.75 3.28-7.95Z" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
          <path d="M5.84 14.09A6.6 6.6 0 0 1 5.5 12c0-.73.12-1.43.34-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.93l3.66-2.84Z" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.57 10.57 0 0 0 12 1a11 11 0 0 0-9.82 6.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z" />
        </svg>
      </a>}
      </div>
      
      <div className="flex-grow mb-2 text-white text-sm leading-5 font-suisse-intl relative">
        "{review.text}"
        {review.translated && <span className="block mt-2 text-xs text-white/50">English translation</span>}
      </div>
      
      {/* ชื่อผู้ใช้ */}
      <div className="mt-auto font-label-mono text-[#F5F1E6]/40 text-[10px] uppercase tracking-[0.24em]">
        — {review.userName}
      </div>
    </div>
  );
}

// Existing carousel: retain the familiar voices and their original attribution.
const existingReviews: IReview[] = [
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

// Selected against the existing scroll's short, conversational tone. Verbatim
// excerpts from Quotes 2026, with display line breaks normalised only. Names
// are the names in the source; Family titles are never inferred or invented.
// Source: Canva design DAHAn3qdwfc (Quotes 2026).
const quoteBookReviews: IReview[] = [
  { id: 'book-sakar', text: 'I don’t touch drugs. Went in for a coffee. Obsessed with this place.', userName: 'Sakar' },
  { id: 'book-jinny', text: 'I don’t smoke. Sat there anyway. Loved it either way.', userName: 'Jinny' },
  { id: 'book-taz', text: 'Good people… good vibe.', userName: 'Taz' },
  { id: 'book-jericho', text: 'I’ve seen commercialized. Wasn’t expecting different. This feels soulful.', userName: 'Jericho' },
  { id: 'book-dan-quiz', text: 'I really enjoyed the quiz session vibe.', userName: 'Uncle Dan' },
  { id: 'book-lisa', text: 'We got nothing like this… …in California.', userName: 'Lisa' },
  { id: 'book-yani', text: 'I need a bigger bamboo… This one only holds 12.', userName: 'Yani' },
  { id: 'book-dan-family', text: 'I told you… I’ll bring my family here. My brother is upstairs asking Ac lots of questions.', userName: 'Uncle Dan' },
  { id: 'book-daniela', text: 'I came back after 3 years. Half expecting it changed. Still just as amazing.', userName: 'Daniela' },
  { id: 'book-mohammed', text: 'I like your ice ball, can you give me the ice mold? Thank you Jazz.', userName: 'Mohammed' },
  { id: 'book-wale', text: 'My flight is in 3 hours. And I really don’t want to leave Phuket. I’m not ready to go back.', userName: 'Wale' },
  { id: 'book-albader', text: 'Should I tell you this? It’s kind of our secret. Once you go, you’ll get it.', userName: 'Albader' },
];

// Google excerpts and individual source links, also recorded in the editorial
// source audit on 2 November 2026. No aggregate rating or review count is inferred.
const googleReviews: IReview[] = [
  { id: 'google-mucahid', text: 'Amazing strains, staff and view 420/420 would recommend.', userName: 'Mücahid', sourceUrl: 'https://maps.app.goo.gl/hgsXcGttcizpcjCE9' },
  { id: 'google-marshall', text: 'PS. Get the craft cherry cola from Chang Mai it’s unreal.', userName: 'Marshall', sourceUrl: 'https://maps.app.goo.gl/H3m7zRLnGzwjfdVZ7' },
  { id: 'google-oliver', text: 'A dreamlike, elegant, and tranquil place. Spectacular.', userName: 'Oliver', sourceUrl: 'https://maps.app.goo.gl/C7UgTXwmF22c7iq49', translated: true },
  { id: 'google-fatemma', text: 'A very beautiful cafe with wonderful staff the coffee was amazing the view 10/10', userName: 'Fatemma', sourceUrl: 'https://maps.app.goo.gl/ZhxiWXYUYM7MLpYcA' },
  { id: 'google-roger', text: 'The location and view are stunning, and the staff are wonderfully friendly.', userName: 'Roger', sourceUrl: 'https://maps.app.goo.gl/3JvK4cbuKinv6m7SA' },
];
// Mix Google sources through the quote-book additions, then distribute the
// additions through the original scroll so all voices have a place in the loop.
const additions = quoteBookReviews.flatMap((review, index) =>
  index < googleReviews.length ? [review, googleReviews[index]] : [review]
);
const sampleReviews = existingReviews.flatMap((review, index) => [review,
  ...additions.filter((_, additionIndex) =>
    Math.floor(additionIndex * existingReviews.length / additions.length) === index)
]);

const loopedReviews = [0, 1, 2].flatMap(copy =>
  sampleReviews.map(review => ({ ...review, key: `${copy}-${review.id}` }))
);

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
    if (isUserScrolling.current && position !== undefined && Math.abs(position - lastAutoWrite.current) > 1) pauseForInput();
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

    let visible = false;
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
    const syncAnimation = () => {
      if (autoFrame.current) cancelAnimationFrame(autoFrame.current);
      autoFrame.current = null;
      lastFrame.current = null;
      if (visible && !document.hidden && !motionPreference.matches) autoFrame.current = requestAnimationFrame(tick);
    };
    const visibilityObserver = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; syncAnimation(); });
    visibilityObserver.observe(el);
    document.addEventListener('visibilitychange', syncAnimation);
    motionPreference.addEventListener('change', syncAnimation);
    const observer = new ResizeObserver(() => {
      setWidth.current = (el.children[sampleReviews.length * 2] as HTMLElement).offsetLeft
        - (el.children[sampleReviews.length] as HTMLElement).offsetLeft;
      autoPosition.current = el.scrollLeft;
      lastAutoWrite.current = el.scrollLeft;
      lastFrame.current = null;
    });
    observer.observe(el);
    return () => {
      visibilityObserver.disconnect();
      document.removeEventListener('visibilitychange', syncAnimation);
      motionPreference.removeEventListener('change', syncAnimation);
      observer.disconnect();
      if (autoFrame.current) cancelAnimationFrame(autoFrame.current);
      if (resumeTimer.current) clearTimeout(resumeTimer.current);

    };
  }, [resumeAutoScroll]);

  return (
    <div className="min-h-[400px] pt-16 pb-12 sm:pt-20 sm:pb-16 bg-[#181818] relative overflow-hidden">
      {/* Noise texture overlay */}
      <div 
        className="absolute inset-0 opacity-10 mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: 'url(/images/grain.png)',
          backgroundSize: '150px',
          backgroundRepeat: 'repeat',
          zIndex: -1
        }}
      />
      
      <AnimatedSection animation="fadeIn" className="w-full">
        <div className="text-center mb-12 sm:mb-16 px-6">
          <h2 className="gj-display-title">
            Some words <span className="gj-title-accent">stay</span> with you.
          </h2>
          
          {/* Decorative line */}
          <div className="flex items-center justify-center mt-3">
            <div className="h-px w-16 bg-[#F5F1E6]/20"></div>
          </div>
          <p className="gj-section-copy mt-5 max-w-2xl mx-auto">
            People arrive from all walks of life, bringing their stories, opinions and occasionally <strong className="gj-copy-highlight">rather wonderful things to say</strong>.
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

        <div className="flex flex-col items-center gap-3 px-6 text-center">
          <p className="gj-section-copy">There’s always room for one more.</p>
          <p className="gj-section-copy max-w-2xl">Put your name on Grandma’s Family wall. You don’t have to be in Phuket to be part of the story.</p>
          <Link href="/family/" className="gj-cta mt-5">Join Grandma’s Family <span aria-hidden="true">→</span></Link>
        </div>
      </AnimatedSection>
    </div>
  );
}
