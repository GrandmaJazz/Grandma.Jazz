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
          <div className="relative w-full rounded-[15px] xl:rounded-[20px] overflow-hidden bg-black h-[640px] sm:h-[720px] lg:h-[780px]">
            <iframe
              src={FAMILY_WALL_URL}
              title="Grandma Jazz — Join the Family"
              loading="lazy"
              className="absolute inset-0 w-full h-full border-0"
            />
          </div>
        </AnimatedSection>
      </div>
    </div>
  );
}
