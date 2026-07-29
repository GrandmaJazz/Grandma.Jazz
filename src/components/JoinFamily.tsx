'use client';

import { AnimatedSection } from '@/components/AnimatedSection';

// The Family Wall lives on its own dedicated site — not part of this
// Next.js app — with its own live "moving names" background, "Join the
// Family" form, and Mongo-backed data. We embed it as-is (unchanged,
// unthemed) rather than reimplementing it: the real, live experience,
// framed the same way the photo boxes elsewhere on the page are framed.
const FAMILY_WALL_URL = 'https://grandmajazz.store';

export default function JoinFamily() {
  return (
    <div className="py-16 sm:py-20 bg-[#0A0A0A] relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 relative">
        <AnimatedSection animation="fadeIn" className="max-w-4xl mx-auto">
          {/* isolate + translateZ(0): gives the embed its own stacking AND
              compositing context. This is now CONFIRMED needed, not just
              defensive — the Family Wall's floating names were visibly
              bleeding into the Events section further up the page. Root
              cause: `loading="lazy"` deferred this iframe's browsing
              context creation until scroll neared it, by which point the
              page above it (sticky bamboo section, Three.js canvas resize,
              framer-motion viewport animations) had already reflowed
              repeatedly — a known WebKit bug class where a lazy iframe's
              GPU compositing layer gets created at/cached against a stale
              position and renders there instead of its true (now
              different) DOM location. Fixed by loading it eagerly (no
              excuse to defer — it's the last section on the page anyway)
              and forcing its own compositing layer up front via
              translateZ(0), so its position is never inherited from a
              stale cache. */}
          <div
            className="relative w-full rounded-[15px] xl:rounded-[20px] overflow-hidden bg-black border-[3px] border-white h-[640px] sm:h-[720px] lg:h-[780px] isolate"
            style={{ transform: 'translateZ(0)' }}
          >
            <iframe
              src={FAMILY_WALL_URL}
              title="Grandma Jazz — Join the Family"
              className="absolute inset-0 w-full h-full border-0"
            />
          </div>
        </AnimatedSection>
      </div>
    </div>
  );
}
