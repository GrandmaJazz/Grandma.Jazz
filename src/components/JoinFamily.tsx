'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatedSection } from '@/components/AnimatedSection';

// The Family Wall lives on its own dedicated site — not part of this
// Next.js app — with its own live "moving names" background, "Join the
// Family" form, and Mongo-backed data. We embed it as-is (unchanged,
// unthemed) rather than reimplementing it: the real, live experience,
// framed the same way the photo boxes elsewhere on the page are framed.
const FAMILY_WALL_URL = 'https://grandmajazz.store';

export default function JoinFamily() {
  const boxRef = useRef<HTMLDivElement>(null);
  const [shouldMountIframe, setShouldMountIframe] = useState(false);

  // Mount the iframe only once this box is actually near the viewport —
  // not via `loading="lazy"` (tried first, reverted). CONFIRMED bug: the
  // Family Wall's floating names were bleeding into the Events section far
  // above, and DOM hit-testing at the exact bleed spot (elementsFromPoint)
  // found no Family Wall element there at all — this isn't a z-index or
  // positioning bug, it's the compositor reusing a stale rasterized tile
  // of the iframe's own content in the wrong screen location. Forcing the
  // iframe onto its own compositing layer early (translateZ(0), tried
  // first) didn't fix it and plausibly made it worse by giving that stale
  // layer more lifetime. The only fix that actually prevents this by
  // construction: the iframe's rendering surface must not exist at all
  // while the visitor is scrolled somewhere else on the page. An
  // IntersectionObserver mounts it only once this box is within 200px of
  // the viewport, and — once mounted — it stays mounted (no unmount on
  // scroll-away) so the visitor never sees it reload or loses form state.
  useEffect(() => {
    const el = boxRef.current;
    if (!el || shouldMountIframe) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShouldMountIframe(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [shouldMountIframe]);

  return (
    <div className="py-16 sm:py-20 bg-[#0A0A0A] relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 relative">
        <AnimatedSection animation="fadeIn" className="max-w-4xl mx-auto">
          <div
            ref={boxRef}
            className="relative w-full rounded-[15px] xl:rounded-[20px] overflow-hidden bg-black border-[3px] border-white h-[640px] sm:h-[720px] lg:h-[780px]"
          >
            {shouldMountIframe && (
              <iframe
                src={FAMILY_WALL_URL}
                title="Grandma Jazz — Join the Family"
                className="absolute inset-0 w-full h-full border-0"
              />
            )}
          </div>
        </AnimatedSection>
      </div>
    </div>
  );
}
