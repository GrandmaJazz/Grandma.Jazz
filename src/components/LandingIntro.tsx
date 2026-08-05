'use client';

import Link from 'next/link';

/**
 * The first thing you read after the record player slides away.
 *
 * Built to the five-part hero structure: a value-proposition headline
 * written around the guest's outcome (not the business), a sub-headline
 * carrying one layer of real specificity, a single primary CTA with
 * concrete copy, the visual (the record player above), and one trust
 * signal — a real guest's words rather than a badge.
 *
 * White space is the primary design directive here. There is deliberately
 * very little on this screen: black canvas, cream text, one gold accent,
 * and a lot of room around all of it.
 */

export default function LandingIntro() {
  return (
    <section className="relative bg-[#0A0A0A] w-full overflow-hidden px-6 sm:px-10 py-32 sm:py-40 lg:py-48">
      {/* Single ambient gold wash — the only colour on the screen. */}
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] max-w-[900px] aspect-square rounded-full pointer-events-none opacity-[0.07] blur-[160px] bg-[#B49B73]"
      />

      <div className="relative max-w-3xl mx-auto text-center">
        <p
          className="text-[#B49B73] text-[11px] sm:text-xs uppercase tracking-[0.32em]"
        >
          Kamala, Phuket
        </p>

        <h2
          className="font-silver-garden text-[#F5F1E6] text-[2.75rem] sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.02] mt-8"
        >
          Slow down, darling.
        </h2>

        <p
          className="text-[#F5F1E6]/65 text-lg sm:text-xl leading-[1.75] mt-10 max-w-xl mx-auto"
        >
          Plastic-free cannabis, strong Thai coffee and 1920s jazz, on the hill
          above Kamala. Open Tuesday to Saturday, ten till eight.
        </p>

        <div
          className="mt-14"
        >
          <Link
            href="/products"
            className="inline-block bg-[#B49B73] text-[#0A0A0A] text-base sm:text-lg font-medium px-10 py-4 rounded-xl transition-transform duration-300 hover:scale-[1.03] active:scale-[0.98] normal-case"
          >
            Shop the counter
          </Link>

          <div className="mt-6">
            <Link
              href="https://maps.app.goo.gl/TwovCmqCYRTSkmtu7"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#F5F1E6]/45 hover:text-[#F5F1E6]/80 text-sm tracking-wide transition-colors normal-case"
            >
              or come find us on the hill
            </Link>
          </div>
        </div>

        {/* Trust signal — a real guest, in their own words. */}
        <figure
          className="mt-24"
        >
          <div className="w-12 h-px bg-[#B49B73]/30 mx-auto mb-8" />
          <blockquote className="text-[#F5F1E6]/75 text-xl sm:text-2xl font-silver-garden leading-snug">
            &ldquo;This place feels like home.&rdquo;
          </blockquote>
          <figcaption className="text-[#F5F1E6]/35 text-xs uppercase tracking-[0.24em] mt-5">
            Jazzy Coco, guest
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
