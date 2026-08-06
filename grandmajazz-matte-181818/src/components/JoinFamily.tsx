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

  // CONFIRMED on a real iPhone (not a testing-tool artifact): the Family
  // Wall's floating names render over the Events section far above,
  // despite `contain: paint` on that section (a hard, spec-guaranteed
  // paint boundary) and despite DOM hit-testing at the bleed spot always
  // showing nothing there. Both of those facts only make sense together
  // if the "bleed" isn't happening in *our* document's rendering tree at
  // all — it's a well-documented iOS Safari bug where `position: fixed`
  // content *inside* a cross-origin iframe escapes that iframe's own
  // clipping/containing box and paints directly into the outer page's
  // viewport, at wherever that fixed content would sit in the full page's
  // coordinate space, ignoring the iframe's actual position entirely.
  // grandmajazz.store's animated "floating names" background is exactly
  // the kind of full-viewport `position: fixed` effect that triggers
  // this. It's WebKit/iOS-specific, which is why it never reproduced in
  // this session's Chromium-based testing tool no matter what layout,
  // stacking, or compositing fix was tried on our own elements — none of
  // those can contain a bug in how iOS clips the *embedded page's own*
  // fixed-position content.
  //
  // `clip-path: inset(0)` on this wrapper is the standard, reliable
  // mitigation: unlike `overflow: hidden` (which some WebKit versions
  // don't correctly apply to iframe content that has already escaped via
  // this bug), clip-path enforces a hard geometric clip at the paint
  // level that holds regardless of the iframe's internal positioning
  // quirks.
  //
  // Kept the mount/unmount-by-proximity behavior too (harmless, reduces
  // how much of the page can ever be affected at once, and avoids the
  // iframe existing at all while scrolled far away).
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
    <div className="py-24 sm:py-32 bg-[#181818] relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 relative">
        <AnimatedSection animation="fadeIn" className="max-w-4xl mx-auto">
                  <h2 className="font-silver-garden text-[2.25rem] sm:text-5xl lg:text-[3rem] font-black tracking-tight text-[#F5F1E6] text-center leading-[1.05] mb-14">The Family</h2>
          <div
            ref={boxRef}
            className="relative w-full rounded-box overflow-hidden bg-black border-[3px] border-white h-[640px] sm:h-[720px] lg:h-[780px]"
            style={{ clipPath: 'inset(0px)', WebkitClipPath: 'inset(0px)' }}
          >
            {shouldMountIframe && (
              <iframe
                src={FAMILY_WALL_URL}
                title="Grandma Jazz — Join the Family"
                className="absolute inset-0 w-full h-full border-0"
                style={{ transform: 'translateZ(0)', WebkitTransform: 'translateZ(0)' }}
              />
            )}
          </div>
        </AnimatedSection>
      </div>
    </div>
  );
}
