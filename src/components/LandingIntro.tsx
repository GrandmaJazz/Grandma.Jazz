'use client';

import Link from 'next/link';

/**
 * The first thing you read once the record player slides away.
 *
 * Structure borrowed from the way Apple opens a page: one screen, one
 * statement, one supporting line, then two links side by side — a primary
 * and a quieter secondary. Everything sits above the fold; nothing needs
 * scrolling to be understood.
 *
 * The visual language is taken straight from the Grandma Jazz logo:
 * black, white, and one thin white rule. No cards, no tinted panels, no
 * coloured glows. Rules do the dividing. Gold appears exactly once on
 * this screen, on the primary action, so it still means something.
 *
 * Type contrast is the Silver Garden display serif against Space Mono
 * labels — the charm of the serif, the precision of the mono.
 */
export default function LandingIntro() {
  return (
    <section className="relative bg-[#0A0A0A] w-full px-6 sm:px-10">
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center text-center min-h-[calc(100svh-5rem)] py-20 sm:py-24">

        {/* Eyebrow */}
        <p className="font-label-mono text-[#F5F1E6]/45 text-[10px] sm:text-[11px] uppercase tracking-[0.34em]">
          Kamala &nbsp;/&nbsp; Phuket
        </p>

        {/* The statement */}
        <h2 className="font-silver-garden text-[#F5F1E6] text-[3rem] sm:text-[4.5rem] lg:text-[5.5rem] leading-[0.98] tracking-tight mt-8 sm:mt-10">
          Slow down, darling.
        </h2>

        {/* One supporting line */}
        <p className="text-[#F5F1E6]/55 text-base sm:text-lg lg:text-xl leading-[1.6] mt-7 max-w-lg">
          Plastic-free cannabis, strong Thai coffee and 1920s jazz,
          on the hill above Kamala.
        </p>

        {/* Two actions, side by side */}
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-4 mt-12">
          <Link
            href="/products"
            className="font-label-mono text-[#B49B73] text-xs sm:text-sm uppercase tracking-[0.2em] border border-[#B49B73]/60 hover:border-[#B49B73] hover:bg-[#B49B73]/10 rounded-box px-8 py-4 transition-colors normal-case"
          >
            Shop the counter
          </Link>
          <Link
            href="https://maps.app.goo.gl/TwovCmqCYRTSkmtu7"
            target="_blank"
            rel="noopener noreferrer"
            className="font-label-mono text-[#F5F1E6]/50 hover:text-[#F5F1E6]/85 text-xs sm:text-sm uppercase tracking-[0.2em] border border-[#F5F1E6]/20 hover:border-[#F5F1E6]/45 rounded-box px-8 py-4 transition-colors normal-case"
          >
            Find us
          </Link>
        </div>

        {/* One thin white rule — the logo's own device — then the proof */}
        <div className="w-full max-w-md border-t border-[#F5F1E6]/15 mt-20 sm:mt-24" />

        <blockquote className="font-silver-garden text-[#F5F1E6]/70 text-lg sm:text-xl mt-10 leading-snug">
          &ldquo;This place feels like home.&rdquo;
        </blockquote>
        <figcaption className="font-label-mono text-[#F5F1E6]/35 text-[10px] uppercase tracking-[0.28em] mt-4">
          Jazzy Coco &nbsp;/&nbsp; guest
        </figcaption>
      </div>
    </section>
  );
}
