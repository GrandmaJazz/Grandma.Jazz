// src/app/family/page.tsx
'use client';

import { Footer } from '@/components/Footer';
import { AnimatedSection } from '@/components/AnimatedSection';
import { FAMILY_WALL_URL } from '@/lib/externalLinks';

// The Family Wall is Brad's own live site (grandmajazz.store) — the sliding
// "moving names" background, everyone's name on the wall, and the join/signup
// form, all Mongo-backed over there. We embed it here (unchanged) so "Family"
// in the nav and the "Join the Movement" CTA land people on the real wall
// without leaving the site.
//
// clip-path: inset(0) on the wrapper is the reliable iOS-Safari mitigation
// for the embedded page's position:fixed "floating names" escaping the
// iframe's box (a known WebKit bug that overflow:hidden doesn't always
// contain). See JoinFamily.tsx for the full write-up.
export default function FamilyPage() {
  return (
    <>
      <div className="min-h-screen pt-24 sm:pt-28 pb-12 bg-[#0A0A0A] relative overflow-hidden">
        {/* ambient glow */}
        <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[640px] h-[640px] rounded-full bg-[#B49B73]/10 blur-3xl" />

        <div className="container mx-auto px-4 relative">
          <AnimatedSection animation="fadeIn">
            <div className="max-w-2xl mx-auto text-center mb-8 sm:mb-10">
              <p className="uppercase tracking-[0.25em] text-[#B49B73] text-xs sm:text-sm font-roboto-light mb-4">
                Join the Family
              </p>
              <h1 className="text-4xl sm:text-5xl font-editorial-ultralight text-[#e3dcd4] mb-4">
                Add your name to the wall
              </h1>
              <p className="text-[#e3dcd4]/70 font-roboto-light">
                Everyone who walks through Grandma Jazz becomes part of the family.
                Find your name, add your own, and we&apos;ll keep you in the loop on
                live nights and quiz sessions.
              </p>
            </div>
          </AnimatedSection>

          {/* Brad's live Family Wall, embedded full-width */}
          <AnimatedSection animation="fadeIn">
            <div
              className="relative w-full max-w-6xl mx-auto rounded-[15px] xl:rounded-[20px] overflow-hidden bg-black border-[3px] border-white h-[70vh] min-h-[560px]"
              style={{ clipPath: 'inset(0px)', WebkitClipPath: 'inset(0px)' }}
            >
              <iframe
                src={FAMILY_WALL_URL}
                title="Grandma Jazz — Family Wall"
                className="absolute inset-0 w-full h-full border-0"
                style={{ transform: 'translateZ(0)', WebkitTransform: 'translateZ(0)' }}
              />
            </div>
            <p className="text-center text-[#e3dcd4]/40 text-xs mt-4 font-roboto-light">
              Having trouble with the wall?{' '}
              <a
                href={FAMILY_WALL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#B49B73] hover:underline"
              >
                Open it in a new tab
              </a>
              .
            </p>
          </AnimatedSection>
        </div>
      </div>
      <Footer />
    </>
  );
}
