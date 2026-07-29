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

  // Mount the iframe ONLY while this box is within a generous margin of
  // the viewport — and UNMOUNT it again once scrolled well away. This is
  // a confirmed, hard-to-kill bug, not a one-time-load timing issue: the
  // Family Wall's floating names visibly bled into the Events section far
  // above, on production, AFTER the iframe had already loaded normally
  // elsewhere on the page. A prior "mount once, never unmount" attempt
  // (plus, before that, a translateZ(0)+isolate compositing hint on an
  // eagerly-loaded iframe) both failed the same way: DOM hit-testing
  // (elementsFromPoint) at the exact bleed spot found nothing there,
  // proving this is a pure compositor/rasterization artifact — the
  // browser reusing a stale rendered tile of the iframe in the wrong
  // screen location — which by definition can't be fixed by anything
  // that only changes layout, stacking order, or *when* a persistent
  // layer first appears. The only thing that actually prevents it: the
  // iframe's rendering surface must not exist in memory at all whenever
  // the visitor is scrolled somewhere else, so there's no stale tile left
  // to reuse. `rootMargin: '800px'` keeps it mounted through ordinary
  // small scrolls near it (no reload flicker, no lost form input for a
  // visitor actively filling it in) but reliably unmounts it once the
  // visitor scrolls back up to sections thousands of pixels away.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        setShouldMountIframe(entries[0]?.isIntersecting ?? false);
      },
      { rootMargin: '800px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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
