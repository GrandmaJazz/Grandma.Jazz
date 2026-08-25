'use client';

import Link from 'next/link';
import Image from 'next/image';

/**
 * The first thing you read once the record player slides away.
 *
 * Structure borrowed from the way Apple opens a page: one screen, one
 * statement, one supporting line, two links — and, front and centre, the
 * signature product itself. The engraved single-shoot bamboo joint holder
 * is cut out on the black, floating like an Apple product shot: our
 * plastic-free promise made visible, leading the page instead of hiding
 * further down it.
 *
 * The visual language is taken straight from the Grandma Jazz logo:
 * black, white, and one thin white rule. No cards, no tinted panels, no
 * coloured glows. Rules do the dividing. Gold appears exactly once on
 * this screen, on the primary action, so it still means something.
 *
 * Type contrast is the Silver Garden display serif against Space Mono
 * labels — the charm of the serif, the precision of the mono.
 *
 * The product image is a transparent cut-out (object-contain, never
 * object-cover / fixed-both-axes), so it can never squash: it keeps its
 * true cylindrical proportions at every size and simply scales by height.
 */
export default function LandingIntro() {
  return (
    <section className="relative bg-[#181818] w-full px-6 sm:px-10 overflow-x-hidden">
      <div className="max-w-6xl mx-auto flex flex-col justify-center min-h-[calc(100svh-5rem)] py-20 sm:py-24">

        {/* Hero: the signature bamboo holder is now the centrepiece —
            bigger, dead-centre, cut out on the black. The words frame it:
            on desktop the statement sits to its left and the supporting
            line + actions to its right; on mobile they stack, product
            leading on top so it lands first. */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] items-center gap-y-8 gap-x-8 lg:gap-x-12">

          {/* Left of the bamboo — eyebrow + the statement */}
          <div className="order-2 lg:order-1 flex flex-col items-center lg:items-end text-center lg:text-right">
            {/* Eyebrow */}
            <p className="font-label-mono text-[#F5F1E6]/45 text-[10px] sm:text-[11px] uppercase tracking-[0.2em]">
              Plastic-free cannabis café &nbsp;—&nbsp; Kamala, Phuket
            </p>

            {/* The statement */}
            <h2 className="font-silver-garden text-[#e3dcd4] text-[3rem] sm:text-[4.25rem] lg:text-[4.75rem] leading-[0.98] tracking-tight mt-5 sm:mt-6">
              Slow down, darling.
            </h2>
          </div>

          {/* The product — signature bamboo holder, centred and enlarged */}
          <div className="order-1 lg:order-2 flex-shrink-0 flex justify-center w-full lg:w-auto">
            <Image
              src="/images/bamboo-hero.webp"
              alt="Grandma Jazz's signature plastic-free bamboo joint holder, cut from a single shoot and engraved with the logo"
              width={428}
              height={1471}
              priority
              sizes="(max-width: 1024px) 60vw, 28vw"
              className="w-auto h-[50vh] max-h-[500px] lg:h-[80vh] lg:max-h-[840px] object-contain select-none pointer-events-none drop-shadow-2xl"
            />
          </div>

          {/* Right of the bamboo — supporting line + the two actions */}
          <div className="order-3 flex flex-col items-center lg:items-start text-center lg:text-left">
            {/* One supporting line */}
            <p className="text-[#F5F1E6]/55 text-base sm:text-lg lg:text-xl leading-[1.6] max-w-xs">
              Rolled by hand, kept in bamboo — never plastic.
            </p>

            {/* Two actions */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-4 mt-8">
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
          </div>
        </div>

        {/* One thin white rule — the logo's own device — then the proof */}
        <div className="w-full max-w-md mx-auto border-t border-[#F5F1E6]/15 mt-16 sm:mt-20" />

        <blockquote className="font-silver-garden text-[#F5F1E6]/70 text-lg sm:text-xl mt-10 leading-snug text-center">
          &ldquo;This place feels like home.&rdquo;
        </blockquote>
        <figcaption className="font-label-mono text-[#F5F1E6]/35 text-[10px] uppercase tracking-[0.28em] mt-4 text-center">
          Jazzy Coco &nbsp;/&nbsp; guest
        </figcaption>
      </div>
    </section>
  );
}
