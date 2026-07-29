'use client';

import Image from 'next/image';
import { AnimatedSection } from '@/components/AnimatedSection';

// A short, always-visible band ahead of the event video below — the video
// section itself is filled edge-to-edge by whichever event is live, with no
// real room left over for a static photo, so this is where the real
// nightlife shot actually gets seen on a normal page load instead of only
// appearing behind a loading/error state.
const VIBE_IMAGE_SRC = '/images/events-lounge.webp';

export default function EventsVibe() {
  return (
    <AnimatedSection animation="fadeIn" className="relative w-full h-[42vh] sm:h-[52vh] overflow-hidden bg-[#0A0A0A]">
      <Image
        src={VIBE_IMAGE_SRC}
        alt="Guests gathered around a low table in Grandma Jazz's purple-lit lounge at night, drinks in hand"
        fill
        className="object-cover"
        sizes="100vw"
        quality={85}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A]/85 via-[#0A0A0A]/15 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10">
        <p className="uppercase tracking-[0.25em] text-[#b88c41] text-xs sm:text-sm font-roboto-light mb-2">
          The Vibe
        </p>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-editorial-ultralight text-[#F5F1E6] max-w-xl leading-tight">
          This is what a night here actually looks like.
        </h2>
      </div>
    </AnimatedSection>
  );
}
