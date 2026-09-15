'use client';

import { useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';

/**
 * The first thing you read once the record player slides away.
 *
 * SCROLL CHOREOGRAPHY (the point of this component):
 * The opening screen is PINNED. The first stretch of scroll moves nothing
 * on the page — it only lifts the bamboo up and out of the top of the
 * frame. The words, the actions and the press band all hold dead still.
 * Once the bamboo has cleared, the pin releases and the whole page scrolls
 * on as normal. Bamboo first, page second.
 *
 * WHY THE MOTION IS IMPERATIVE, NOT framer-motion's useScroll:
 * `useScroll({ target })` measures the target's offsets once and re-measures
 * only on scroll/resize. On this page the homepage mounts with the record
 * player overlay up, which puts `translateY(100vh)` on an ancestor of this
 * section; when the overlay slides away the layout changes underneath
 * framer without a re-measure, so the progress value stayed pinned at 0 and
 * the bamboo never moved at all. Reading `getBoundingClientRect()` inside
 * the frame loop cannot go stale — the rect is always live — so the effect
 * survives the overlay, hot reloads, font swaps and late-loading images.
 * The loop only runs while the section is actually on screen.
 *
 * WHY THE PRESS BAND LIVES INSIDE THE PINNED SCREEN:
 * A pinned screen is exactly 100svh tall. Anything placed after it starts
 * below that full screen, so short content centred inside leaves a long
 * empty run of black before whatever follows — a gap that reads as a
 * mistake. Keeping the "As seen in" band as the base of the pinned screen
 * removes that gap by construction, at every viewport size.
 *
 * STICKY GOTCHA — the pin depends on NOTHING between here and the viewport
 * being a scroll container or having a transform. That includes <body>:
 * see the note in globals.css. `overflow-x: hidden` on <body> is not the
 * free pass it looks like, and it silently killed this pin once already.
 *
 * The bamboo also breathes while the music is playing — a slow, soft hop
 * on a jazz walking tempo. It is tempo-driven, not listening to the actual
 * audio (see the note in the reply / the beat caveat): the track is served
 * through an HTML5 audio element, which cannot be analysed without CORS
 * changes on the bucket and surgery on the player.
 */
export default function LandingIntro() {
  const trackRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const bambooRef = useRef<HTMLDivElement>(null);

  // Reduced motion is read through a ref inside the frame loop, never as an
  // effect dependency. framer-motion's useReducedMotion() settles to its real
  // value a few frames after mount; as a dependency that tears the loop down
  // and — if it lands on `true` — the early return leaves the bamboo frozen
  // with no error anywhere to explain it. The loop below simply asks the ref
  // each frame instead, so it can never be torn down by a value changing.
  const reduceRef = useRef(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => { reduceRef.current = mq.matches; };
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  // The bamboo breathes only while there is music to breathe to.
  const { isPlaying } = useMusicPlayer();
  const playingRef = useRef(false);
  playingRef.current = !!isPlaying;

  useEffect(() => {
    // A slow jazz walk. Not the record's real tempo — a steady, unhurried
    // pulse that reads as "in time with the room" without pretending to be
    // locked to the beat.
    const BPM = 88;
    const BEAT_MS = 60000 / BPM;

    // How far the bamboo has to rise before it is genuinely out of sight,
    // measured rather than guessed. offsetTop/offsetHeight are layout values
    // and are NOT affected by the transform we are applying, so this stays
    // correct mid-flight. A guessed percentage cannot survive a different
    // viewport, a font swap or a late image — and being wrong costs either a
    // clipped exit or a stretch of scroll where nothing answers the user.
    const clearance = (el: HTMLElement, screen: HTMLElement) => {
      let top = 0;
      let n: HTMLElement | null = el;
      while (n && n !== screen) {
        top += n.offsetTop;
        n = n.offsetParent as HTMLElement | null;
      }
      return top + el.offsetHeight + 16; // +16 so it clears, not just grazes
    };

    // Deliberately NOT gated behind an IntersectionObserver. The loop below
    // skips the style write whenever the value has not changed, and the
    // browser already parks rAF entirely while the tab is hidden. An IO gate
    // buys nothing here and adds a way for the whole effect to silently never
    // start, which is the failure mode that once stranded AnimatedSection at
    // opacity: 0.
    let raf = 0;
    let last = '';

    const frame = (t: number) => {
      // Resolved from the document every frame, deliberately NOT from the
      // React refs. A ref is nulled the moment its instance unmounts, and on
      // this page the section gets remounted around hydration and the record
      // player hand-off — a loop holding refs then sees nulls forever and the
      // bamboo silently freezes, with no error to explain it. A captured node
      // is no better: a detached one reports a zero rect, which pins progress
      // at 0. Querying the live document each frame cannot go stale either
      // way, and it is a trivial cost next to the rect read below.
      const track = document.querySelector<HTMLElement>('[data-gj="track"]');
      const screen = document.querySelector<HTMLElement>('[data-gj="screen"]');
      const el = document.querySelector<HTMLElement>('[data-gj="bamboo"]');
      if (!track || !screen || !el) {
        raf = requestAnimationFrame(frame);
        return;
      }

      // The track is exactly one screen (the pin) plus the bamboo's own exit
      // distance — no more. That is what makes the handover seamless: the
      // moment the bamboo is out of sight the track is spent, so the page
      // starts moving instead of eating a stretch of scroll that answers
      // with nothing.
      // Reduced motion: no pin, no track, no movement. Checked per frame so
      // the user can flip the OS setting and have it take effect at once.
      if (reduceRef.current) {
        if (track.style.height !== 'auto') track.style.height = 'auto';
        if (last !== 'none') { el.style.transform = ''; last = 'none'; }
        raf = requestAnimationFrame(frame);
        return;
      }

      const travel = clearance(el, screen);
      const wantH = `${Math.round(window.innerHeight + travel)}px`;
      if (track.style.height !== wantH) track.style.height = wantH;

      const r = track.getBoundingClientRect();
      const scrolled = Math.min(Math.max(-r.top, 0), travel);

      // 1:1 with the scroll. The bamboo rises exactly as far as the page
      // would have, so it reads as the page moving — the page just happens
      // to be holding everything else still while it goes.
      const lift = -scrolled;
      const exit = travel > 0 ? scrolled / travel : 1;

      // The hop: a quick rise and a soft settle, once per beat, fading out
      // as the bamboo leaves so the exit stays clean.
      let hop = 0;
      if (playingRef.current && exit < 1) {
        const phase = (t % BEAT_MS) / BEAT_MS;
        const kick = Math.sin(Math.PI * Math.min(phase * 1.7, 1));
        hop = -kick * el.offsetHeight * 0.015 * (1 - exit);
      }

      const next = `translate3d(0, ${(lift + hop).toFixed(2)}px, 0)`;
      if (next !== last) {
        el.style.transform = next;
        last = next;
      }
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <section className="relative bg-[#181818] w-full">

      {/* ── Pinned opening screen ──────────────────────────────────────
          Tall track: the first 100svh is the pinned screen itself, the
          second 100svh is the scroll the bamboo's exit is paid out of.
          With reduced motion requested there is no track and no pin — the
          screen is one screen tall and scrolls like anything else. */}
      <div ref={trackRef} data-gj="track" className="relative h-[170svh]">
        <div ref={screenRef} data-gj="screen" className="sticky top-0 h-[100svh] w-full flex flex-col px-6 sm:px-10 pt-20 pb-8 sm:pb-10">

          {/* The hero takes whatever room is left and centres itself in it */}
          <div className="flex-1 min-h-0 flex items-center">
            <div className="max-w-6xl mx-auto w-full">

              {/* On desktop the statement sits left of the bamboo and the
                  supporting line + actions sit right of it; on mobile they
                  stack, product leading on top so it lands first. */}
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] items-center gap-y-5 sm:gap-y-7 gap-x-8 lg:gap-x-12">

                {/* Left of the bamboo — eyebrow + the statement */}
                <div className="order-2 lg:order-1 flex flex-col items-center lg:items-end text-center lg:text-right">
                  <p className="font-label-mono text-[#F5F1E6]/45 text-[10px] sm:text-[11px] uppercase tracking-[0.2em]">
                    Plastic-free cannabis café &nbsp;—&nbsp; Kamala, Phuket
                  </p>
                  <h2 className="font-silver-garden text-[#e3dcd4] text-[2.5rem] sm:text-[3.75rem] lg:text-[4.5rem] leading-[0.98] tracking-tight mt-4 sm:mt-6">
                    kept in bamboo, darling.
                  </h2>
                </div>

                {/* The product — the one piece that moves, and the one that
                    leaves first. */}
                <div
                  ref={bambooRef}
                  data-gj="bamboo"
                  className="order-1 lg:order-2 flex-shrink-0 flex justify-center w-full lg:w-auto will-change-transform"
                >
                  <Image
                    src="/images/bamboo-hero.webp"
                    alt="Grandma Jazz's signature plastic-free bamboo joint holder, cut from a single shoot and engraved with the logo"
                    width={428}
                    height={1471}
                    priority
                    sizes="(max-width: 1024px) 45vw, 24vw"
                    className="w-auto h-[34svh] max-h-[330px] lg:h-[56svh] lg:max-h-[620px] object-contain select-none pointer-events-none drop-shadow-2xl"
                  />
                </div>

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

          {/* ── The base of the screen: one thin rule, then the proof.
              Held still through the whole pin, and the last thing before
              the page takes over — so there is no gap to fall into. */}
          <div className="shrink-0 max-w-6xl mx-auto w-full flex flex-col items-center">
            <div className="gj-divider w-full max-w-md border-t" />
            <p className="font-label-mono text-[#e3dcd4]/45 text-[10px] sm:text-[11px] uppercase tracking-[0.28em] mt-6 sm:mt-8 mb-5 sm:mb-7">
              As seen in
            </p>
            <div className="flex flex-row flex-wrap items-center justify-center gap-x-8 sm:gap-x-14 lg:gap-x-16 gap-y-4">
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
                  className="h-5 sm:h-7 w-auto object-contain"
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
                  className="h-6 sm:h-9 w-auto object-contain"
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
                  className="h-5 sm:h-8 w-auto object-contain"
                />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
