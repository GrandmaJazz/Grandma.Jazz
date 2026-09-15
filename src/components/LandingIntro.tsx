'use client';

import { useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';

/**
 * The first thing you read once the record player slides away.
 *
 * SCROLL CHOREOGRAPHY:
 * The opening screen is PINNED. The first stretch of scroll moves nothing on
 * the page — it only lifts the bamboo up and out of the top of the frame. The
 * words, the actions and the press band all hold dead still. The moment the
 * bamboo has cleared, the pin releases and the whole page scrolls on as
 * normal. Bamboo first, page second, with no dead scroll in between.
 *
 * WHY THE BAMBOO IS NOT ANIMATED BY JAVASCRIPT:
 * It used to be moved by a requestAnimationFrame loop writing a transform each
 * frame. That is smooth enough on a desktop and visibly not smooth on a phone:
 * the browser scrolls on the compositor thread while JavaScript runs on the
 * main thread, so a JS-driven transform is always chasing the scroll a frame
 * behind, and during momentum scrolling it stutters.
 *
 * So the bamboo is not animated at all. It sits in its own absolutely
 * positioned layer inside the scroll track, at a fixed spot, and simply
 * scrolls away with the page exactly like any other element on any other
 * page — native, compositor-driven, perfectly smooth. What is pinned is
 * everything ELSE: the words and the press band sit in a `sticky` layer that
 * holds still while the bamboo passes them.
 *
 * The grid keeps a spacer where the bamboo visually sits, so the three-column
 * desktop layout and the stacked mobile layout are unchanged. JavaScript now
 * runs only on mount and on resize — never per frame — to measure two things:
 * how tall the track has to be, and where the bamboo layer sits inside it.
 *
 * The music bob is a CSS keyframe animation (see `gj-bob` in globals.css),
 * toggled by a class. Also compositor-driven, also no per-frame JS. It is
 * tempo-driven, not listening to the actual audio: the track is served through
 * an HTML5 audio element, which cannot be analysed without CORS changes on the
 * bucket and surgery on the player.
 *
 * STICKY GOTCHA — the pin depends on NOTHING between here and the viewport
 * being a scroll container or having a transform. That includes <body>: see
 * the note in globals.css. `overflow-x: hidden` on <body> is not the free pass
 * it looks like, and it silently killed this pin once already.
 */

// The bamboo cut-out's true proportions. The spacer below must match them
// exactly or the layer and the gap it fills drift apart.
const BAMBOO_RATIO = '428 / 1471';
// Shared sizing for the bamboo and its spacer — kept in one place so the two
// can never disagree.
// Phone sizing is keyed to viewport HEIGHT, not width — that is what decides
// whether the bamboo, the words and the press band still fit one screen. A
// tall phone gets the bigger bamboo; a short one (an SE, a phone with the
// browser chrome showing) stays smaller so nothing gets squeezed off.
// All bamboo sizing lives in globals.css as `.gj-bamboo`, keyed to viewport
// HEIGHT as well as width — height is what decides whether the bamboo, the
// words and the press band still fit one screen on a phone. It is a plain CSS
// class rather than Tailwind variants because two competing arbitrary media
// variants fight over source order, and the desktop rule kept losing.
const BAMBOO_SIZE = 'gj-bamboo';

export default function LandingIntro() {
  const trackRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);

  const { isPlaying } = useMusicPlayer();

  // Measure on mount and on resize only. Never per frame.
  useEffect(() => {
    const measure = () => {
      const track = trackRef.current;
      const screen = screenRef.current;
      const spacer = spacerRef.current;
      const layer = layerRef.current;
      if (!track || !screen || !spacer || !layer) return;

      // Where the bamboo sits inside the pinned screen. offsetTop is a layout
      // value, so it is unaffected by any transform in play.
      let top = 0;
      let n: HTMLElement | null = spacer;
      while (n && n !== screen) {
        top += n.offsetTop;
        n = n.offsetParent as HTMLElement | null;
      }

      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduce) {
        // No pin, no track, no separate layer — one ordinary screen.
        track.style.height = 'auto';
        layer.style.display = 'none';
        spacer.style.visibility = 'visible';
        return;
      }

      layer.style.display = '';
      spacer.style.visibility = 'hidden';
      layer.style.top = `${top}px`;

      // The track is exactly one screen (the pin) plus the distance the bamboo
      // has to travel to clear the top — no more. That is what makes the
      // handover seamless: the moment the bamboo is out of sight the track is
      // spent, so the page starts moving instead of eating a stretch of scroll
      // that answers with nothing.
      const travel = top + spacer.offsetHeight + 16;
      track.style.height = `${Math.round(window.innerHeight + travel)}px`;
    };

    measure();
    // Fonts and the image itself settle after first paint and change the
    // measurement, so take it again once things have landed.
    const t = setTimeout(measure, 250);
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);
    if (document.fonts?.ready) document.fonts.ready.then(measure).catch(() => {});

    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
    };
  }, []);

  return (
    <section className="relative bg-[#181818] w-full">

      {/* ── The scroll track. Its height is measured at runtime; the class is
          only a sane value for the first paint and for no-JS. */}
      <div ref={trackRef} className="relative h-[155svh]">

        {/* ── The pinned layer: everything that holds still ─────────────── */}
        <div ref={screenRef} className="sticky top-0 h-[100svh] w-full flex flex-col px-6 sm:px-10 pt-20 pb-6 sm:pb-10">

          <div className="flex-1 min-h-0 flex items-center">
            <div className="max-w-6xl mx-auto w-full">

              {/* On desktop the statement sits left of the bamboo and the
                  supporting line + actions sit right of it; on mobile they
                  stack, product leading on top so it lands first. */}
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] items-center gap-y-4 sm:gap-y-7 gap-x-8 lg:gap-x-12">

                {/* Left of the bamboo — eyebrow + the statement */}
                <div className="order-2 lg:order-1 flex flex-col items-center lg:items-end text-center lg:text-right">
                  <p className="font-label-mono text-[#F5F1E6]/45 text-[10px] sm:text-[11px] uppercase tracking-[0.2em]">
                    Plastic-free cannabis café &nbsp;—&nbsp; Kamala, Phuket
                  </p>
                  <h2 className="font-silver-garden text-[#e3dcd4] text-[2.5rem] sm:text-[3.75rem] lg:text-[4.5rem] leading-[0.98] tracking-tight mt-4 sm:mt-6">
                    kept in bamboo, darling.
                  </h2>
                </div>

                {/* The bamboo's seat. Holds exactly the space the bamboo
                    occupies so the layout is identical to having it here —
                    the bamboo itself lives in the scrolling layer below. */}
                <div
                  ref={spacerRef}
                  aria-hidden="true"
                  style={{ aspectRatio: BAMBOO_RATIO }}
                  className={`order-1 lg:order-2 flex-shrink-0 mx-auto ${BAMBOO_SIZE}`}
                />

                {/* Right of the bamboo — supporting line + the two actions */}
                <div className="order-3 flex flex-col items-center lg:items-start text-center lg:text-left">
                  <p className="text-[#F5F1E6]/55 text-sm sm:text-base lg:text-xl leading-[1.6] max-w-xs">
                    Rolled by hand, kept in bamboo — never plastic.
                  </p>

                  <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-4 gap-y-3 mt-6 sm:mt-8">
                    <Link
                      href="/products"
                      className="font-label-mono text-[#B49B73] text-xs sm:text-sm uppercase tracking-[0.2em] border-[1.5px] border-[#B49B73]/70 hover:bg-[#B49B73] hover:text-[#0A0A0A] hover:border-[#B49B73] rounded-box px-6 py-3 sm:px-8 sm:py-4 transition-all duration-200 ease-out normal-case will-change-transform hover:-translate-y-px active:translate-y-0 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B49B73]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#181818]"
                    >
                      Shop the counter
                    </Link>
                    <Link
                      href="https://maps.app.goo.gl/TwovCmqCYRTSkmtu7"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-label-mono text-[#F5F1E6]/50 hover:text-[#F5F1E6]/85 text-xs sm:text-sm uppercase tracking-[0.2em] border-[1.5px] border-[#F5F1E6]/20 hover:border-[#F5F1E6]/45 rounded-box px-6 py-3 sm:px-8 sm:py-4 transition-all duration-200 ease-out normal-case will-change-transform hover:-translate-y-px active:translate-y-0 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5F1E6]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#181818]"
                    >
                      Find us
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── The base of the screen: one thin rule, then the proof. Held
              still through the whole pin, and the last thing before the page
              takes over — so there is no gap to fall into. */}
          <div className="shrink-0 max-w-6xl mx-auto w-full flex flex-col items-center">
            <div className="gj-divider w-full max-w-md border-t" />
            <p className="font-label-mono text-[#e3dcd4]/45 text-[10px] sm:text-[11px] uppercase tracking-[0.28em] mt-5 sm:mt-8 mb-4 sm:mb-7">
              As seen in
            </p>
            <div className="flex flex-row flex-wrap items-center justify-center gap-x-8 sm:gap-x-14 lg:gap-x-16 gap-y-4">
              <a
                href="https://hightimes.com/dispensaries/grandma-jazz-worlds-first-plastic-free-dispensary/"
                target="_blank"
                rel="noopener noreferrer"
                className="opacity-60 hover:opacity-100 transition-opacity"
              >
                <Image src="/images/press/high-times.png" alt="High Times" width={1339} height={305} className="h-5 sm:h-7 w-auto object-contain" />
              </a>
              <a
                href="https://headmagazine.com/the-quiet-revolution-of-grandma-jazz/"
                target="_blank"
                rel="noopener noreferrer"
                className="opacity-60 hover:opacity-100 transition-opacity"
              >
                <Image src="/images/press/head-magazine.png" alt="head Magazine" width={536} height={200} className="h-6 sm:h-9 w-auto object-contain" />
              </a>
              <a
                href="https://skunkglobalmarijuanaculture.com/cannabis-world-news/grandma-jazz-a-legacy-continued/"
                target="_blank"
                rel="noopener noreferrer"
                className="opacity-60 hover:opacity-100 transition-opacity"
              >
                <Image src="/images/press/skunk.png" alt="Skunk" width={445} height={171} className="h-5 sm:h-8 w-auto object-contain" />
              </a>
            </div>
          </div>
        </div>

        {/* ── The bamboo's own layer. Absolute inside the track, so it scrolls
            away with the page natively — no JavaScript in the scroll path at
            all, which is what makes it smooth on a phone. `top` is set by the
            measurement above so it lands exactly on its seat in the grid. */}
        <div
          ref={layerRef}
          className="absolute left-0 right-0 z-[1] flex justify-center px-6 sm:px-10 pointer-events-none"
          style={{ top: 0 }}
        >
          <div className={`${isPlaying ? 'gj-bob' : ''} will-change-transform`}>
            <Image
              src="/images/bamboo-hero.webp"
              alt="Grandma Jazz's signature plastic-free bamboo joint holder, cut from a single shoot and engraved with the logo"
              width={428}
              height={1471}
              priority
              sizes="(max-width: 1024px) 45vw, 24vw"
              className={`block w-auto object-contain select-none drop-shadow-2xl ${BAMBOO_SIZE}`}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
