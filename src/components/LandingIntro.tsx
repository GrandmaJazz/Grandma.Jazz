'use client';

import { useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useScroll, useTransform } from 'framer-motion';

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
  // Gentle scroll parallax: the signature bamboo drifts up as the page
  // moves, giving the hero real depth instead of sitting flat.
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end start'] });
  const bambooY = useTransform(scrollYProgress, [0, 1], ['0%', '-14%']);

  return (
    <section ref={sectionRef} className="relative bg-[#181818] w-full px-6 sm:px-10 overflow-x-hidden">
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
              kept in bamboo, darling.
            </h2>
          </div>

          {/* The product — signature bamboo holder, centred and enlarged */}
          <motion.div style={{ y: bambooY }} className="order-1 lg:order-2 flex-shrink-0 flex justify-center w-full lg:w-auto will-change-transform">
            <Image
              src="/images/bamboo-hero.webp"
              alt="Grandma Jazz's signature plastic-free bamboo joint holder, cut from a single shoot and engraved with the logo"
              width={428}
              height={1471}
              priority
              sizes="(max-width: 1024px) 60vw, 28vw"
              className="w-auto h-[50vh] max-h-[500px] lg:h-[80vh] lg:max-h-[840px] object-contain select-none pointer-events-none drop-shadow-2xl"
            />
          </motion.div>

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
                className="font-label-mono text-[#B49B73] text-xs sm:text-sm uppercase tracking-[0.2em] border border-[#B49B73]/60 hover:bg-[#B49B73] hover:text-[#0A0A0A] hover:border-[#B49B73] rounded-box px-8 py-4 transition-all duration-200 ease-out normal-case will-change-transform hover:-translate-y-px active:translate-y-0 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B49B73]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#181818]"
              >
                Shop the counter
              </Link>
              <Link
                href="https://maps.app.goo.gl/TwovCmqCYRTSkmtu7"
                target="_blank"
                rel="noopener noreferrer"
                className="font-label-mono text-[#F5F1E6]/50 hover:text-[#F5F1E6]/85 text-xs sm:text-sm uppercase tracking-[0.2em] border border-[#F5F1E6]/20 hover:border-[#F5F1E6]/45 rounded-box px-8 py-4 transition-all duration-200 ease-out normal-case will-change-transform hover:-translate-y-px active:translate-y-0 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5F1E6]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#181818]"
              >
                Find us
              </Link>
            </div>
          </div>
        </div>

        {/* One thin rule — the logo's own device — then the proof */}
        <div className="gj-divider w-full max-w-md mx-auto border-t mt-16 sm:mt-20" />

        {/* Press band — trust signals in the same quiet register as the
            eyebrow line above: a small mono label, then the marks
            themselves. The logo files are already cream/monochrome
            cut-outs, so no color treatment needed beyond the standard
            dim-until-hovered pattern used on the "Find us" link above. */}
        <div className="mt-10 sm:mt-12 flex flex-col items-center">
          <p className="font-label-mono text-[#e3dcd4]/45 text-[10px] sm:text-[11px] uppercase tracking-[0.28em] mb-8 sm:mb-10">
            As seen in
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-y-8 sm:gap-x-14 lg:gap-x-16">
            <a
              href="https://hightimes.com/dispensaries/grandma-jazz-worlds-first-plastic-free-dispensary/"
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-60 hover:opacity-100 transition-opacity"
            >
              <Image
                src="/images/press/high-times.png"
                alt="High Times"
                width={1339}
                height={305}
                className="h-6 sm:h-7 w-auto object-contain"
              />
            </a>
            <a
              href="https://headmagazine.com/the-quiet-revolution-of-grandma-jazz/"
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-60 hover:opacity-100 transition-opacity"
            >
              <Image
                src="/images/press/head-magazine.png"
                alt="head Magazine"
                width={536}
                height={200}
                className="h-8 sm:h-9 w-auto object-contain"
              />
            </a>
            <a
              href="https://skunkglobalmarijuanaculture.com/cannabis-world-news/grandma-jazz-a-legacy-continued/"
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-60 hover:opacity-100 transition-opacity"
            >
              <Image
                src="/images/press/skunk.png"
                alt="Skunk"
                width={445}
                height={171}
                className="h-7 sm:h-8 w-auto object-contain"
              />
            </a>
          </div>
        </div>

        {/* Divider below the band — same token as above */}
        <div className="gj-divider w-full max-w-md mx-auto border-t mt-10 sm:mt-12" />
      </div>
    </section>
  );
}
