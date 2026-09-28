'use client';

import React, { useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import FounderPortraits from '@/components/FounderPortraits';
import { motion, useScroll, useTransform } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { SPOTIFY_PROFILE_URL } from '@/lib/businessDetails';

// NOTE: the scroll-driven 3D bamboo model (BambooScrollShowcase) has been
// pulled off the homepage for now — the engraved bamboo is featured up top
// as a real product (FeaturedBamboo) instead. The 3D component/file is kept
// for later experimentation.

interface ProductStoryItem {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  quote: string;
  imageSrc: string;
  imageAlt: string;
  bgColor: string;
  textColor: string;
  accentColor: string;
  borderColor: string;
  href: string;      // where the whole panel clicks through to
  ctaLabel: string;  // the visible "call to action" affordance
  ctaIcon?: 'spotify';
  // When the image is a graphic (e.g. the founders' portrait cards) rather
  // than an edge-to-edge photo, show it whole on a coloured mat instead of
  // cropping it: `object-contain` inside `frameBgClass`, with even padding
  // and no parallax drift, so the cards sit centred with their rounded
  // corners and equal spacing intact.
  imageContain?: boolean;
  frameBgClass?: string;
  // Aspect ratio for the frame itself, matched to a `contain` graphic so the
  // image fills it edge-to-edge with no extra beige letterboxing.
  frameAspect?: string;
}

interface StoryItemProps {
  story: ProductStoryItem;
  index: number;
  isEven: boolean;
}

const PRODUCT_STORIES: ProductStoryItem[] = [
  {
    id: 1,
    title: "Made with care, darling.",
    subtitle: "Our Story",
    description: "Joy and I built Grandma Jazz in Kamala in 2023 as a place to sit, listen and belong. The coffee, the music, the flower and the plastic-free details all come back to the same thing: care for the people in the room and the place around us.",
    quote: "",
    imageSrc: "/images/ac-joy-painted-portraits.webp",
    imageAlt: "Painted portraits of Grandma Jazz founders: AC holding a gold tin and Joy holding a floral teacup",
    bgColor: "bg-[#0A0A0A]",
    textColor: "text-[#e3dcd4]",
    accentColor: "text-[#B49B73]",
    borderColor: "border-[#e3dcd4]",
    href: "/blogs/why-grandma-jazz-exists-a-quiet-caf-built-on-care-community-and-inclusion/",
    ctaLabel: "Read our story",
    imageContain: true,
    frameBgClass: "bg-[#E3DCD4]",
    frameAspect: "2511 / 1528"
  },
  {
    id: 2,
    title: "Come in. Stay a while.",
    subtitle: "The Space",
    description: "You're up in the Kamala hills, the noise of the island somewhere below, and the music is something nostalgic you'd half forgotten you loved. Nobody's rushing you out. Stay as long as you want.",
    quote: "",
    imageSrc: "/images/exterior.webp",
    imageAlt: "Grandma Jazz's hillside entrance in daylight, with string lights along the eaves, the tiled roof, and the jungled hills of Kamala behind",
    bgColor: "bg-[#181818]",
    textColor: "text-[#e3dcd4]",
    accentColor: "text-[#B49B73]",
    borderColor: "border-[#e3dcd4]",
    href: "/visit",
    ctaLabel: "Find us"
  },
  {
    id: 3,
    title: "Sip. Roll. Settle in.",
    subtitle: "The Ritual",
    description: "Good flower and Northern Thai coffee, and no real reason to hurry. Order one, roll the other, and settle in for a bit.",
    quote: "",
    imageSrc: "/images/3.webp",
    imageAlt: "A hand holding a fresh cannabis flower bud up close, warm wood tones in the background",
    bgColor: "bg-[#0A0A0A]",
    textColor: "text-[#e3dcd4]",
    accentColor: "text-[#B49B73]",
    borderColor: "border-[#e3dcd4]",
    href: SPOTIFY_PROFILE_URL,
    ctaLabel: "Listen with us",
    ctaIcon: "spotify"
  },
  {
    id: 4,
    title: "Plastic? Not in Grandma's house.",
    subtitle: "The Promise",
    description: "An engraved bamboo tube, instead of the plastic doob tube everyone else hands you. Flower that refills into a tin, never a baggie. Plastic-free since 2023 — we call it the GreenFlow Movement.",
    quote: "",
    imageSrc: "/images/4.webp",
    imageAlt: "An engraved bamboo joint holder, one of Grandma Jazz's plastic-free touches since 2023",
    bgColor: "bg-[#181818]",
    textColor: "text-[#e3dcd4]",
    accentColor: "text-[#B49B73]",
    borderColor: "border-[#e3dcd4]",
    href: "/family",
    ctaLabel: "Join the movement"
  },
];

const noiseTexture = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
  backgroundSize: '150px',
  backgroundRepeat: 'repeat',
};

const StoryItem = React.memo<StoryItemProps>(({ story, index, isEven }) => {
  const rowRef = useRef<HTMLDivElement>(null);
  // Subtle parallax — the image drifts against the scroll instead of sitting
  // dead-still once its entrance animation finishes. Runs continuously (not
  // gated by whileInView), independent of the entrance-variant x/opacity.
  const { scrollYProgress } = useScroll({ target: rowRef, offset: ['start end', 'end start'] });
  // Stronger, percentage-based drift so it reads clearly and stays
  // consistent across mobile/desktop (px drift looked tiny on large frames).
  const parallaxY = useTransform(scrollYProgress, [0, 1], ['18%', '-18%']);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.2,
        delayChildren: index * 0.1
      }
    }
  };
  
  const imageVariants: Variants = {
    hidden: { 
      opacity: 0, 
      x: isEven ? 60 : -60,
    },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { 
        type: "tween",
        ease: [0.16, 1, 0.3, 1],
        duration: 0.7
      }
    }
  };
  
  const textVariants: Variants = {
    hidden: { 
      opacity: 0, 
      x: isEven ? -60 : 60,
    },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { 
        type: "tween",
        ease: [0.16, 1, 0.3, 1],
        duration: 0.7
      }
    }
  };

  return (
    <motion.div
      ref={rowRef}
      key={story.id}
      className={`group ${story.bgColor} w-full flex flex-col lg:flex-row items-center justify-center gap-7 lg:gap-10 relative px-6 py-16 sm:py-20 lg:py-20 lg:min-h-[min(62vw,780px)] ${isEven ? 'lg:flex-row-reverse' : ''}`}
      variants={containerVariants}
      initial="visible"
      animate="visible"
    >
      {/* The whole panel is a single link target so every pillar clicks
          through. It sits above the noise layer but below the content, and
          content stays keyboard/screen-reader accessible via the label.
          External destinations open in a new tab. */}
      <Link
        href={story.href}
        aria-label={`${story.subtitle}: ${story.ctaLabel}`}
        className="absolute inset-0 z-20"
        {...(story.href.startsWith('http')
          ? { target: '_blank', rel: 'noopener noreferrer' }
          : {})}
      />
      <div className="absolute inset-0 opacity-15 mix-blend-overlay pointer-events-none" style={noiseTexture} />

      <motion.div
        className="w-full lg:w-[55%] flex items-center justify-center"
        variants={imageVariants}
      >
        <div
          className={`w-full rounded-box overflow-hidden shadow-lg transition-[transform,box-shadow] duration-500 ease-out group-hover:scale-[1.02] group-hover:shadow-2xl ${story.frameBgClass ?? ''}`}
          style={{aspectRatio: story.frameAspect ?? '16/10'}}
        >
          {story.imageContain ? (
            /* Graphic (founders' cards): shown whole on the beige mat with a
               slim, even margin on every side — no crop, no parallax drift —
               so the cards nearly fill the frame while keeping their rounded
               corners and equal spacing. */
            <div className="relative w-full h-full p-1 sm:p-1.5">
              <FounderPortraits />
            </div>
          ) : (
            /* Photo: the frame stays put (so nothing clips at the edges); the
               image itself drifts inside it, scaled up so the drift never
               reveals its border. */
            <motion.div className="relative w-full h-full" style={{ y: parallaxY, scale: 1.45 }}>
              <Image
                src={story.imageSrc}
                alt={story.imageAlt}
                width={1200}
                height={800}
                className="w-full h-full object-cover"
                loading={index === 0 ? "eager" : "lazy"}
                priority={index === 0}
                sizes="(max-width: 768px) 100vw, 70vw"
                quality={85}
              />
            </motion.div>
          )}
        </div>
      </motion.div>
      
      <motion.div 
        className="w-full lg:w-[35%] flex items-center justify-center lg:px-4"
        variants={textVariants}
      >
        <div className="w-full max-w-full text-center lg:text-left">
          {story.subtitle && (
            <div className="flex items-center justify-center lg:justify-start">
              <div className={`h-px ${story.borderColor}`}></div>
              <span className={` font-label-mono ${story.accentColor} text-xs sm:text-sm lg:text-xs xl:text-sm uppercase tracking-widest`}>
                {story.subtitle}
              </span>
            </div>
          )}
          
          <h2 className={`font-silver-garden text-5xl sm:text-6xl md:text-7xl lg:text-7xl xl:text-8xl font-black tracking-tight ${story.textColor} ${story.subtitle ? 'mt-2' : ''} leading-[1.05] text-center lg:text-left`}>
            {story.title}
          </h2>
          
          <p className={`font-roboto-medium text-base sm:text-lg lg:text-base xl:text-lg ${story.textColor} opacity-90 mt-6 leading-relaxed text-center lg:text-left`}>
            {story.description}
          </p>

          <div className={`${story.borderColor}/30 border-t mt-7`}></div>

          {/* CTA affordance — decorative only (the whole panel is the link).
              The arrow slides on panel hover so it reads as clickable. */}
          <div className="flex items-center justify-center lg:justify-start gap-2 mt-5 pb-1">
            {story.ctaIcon === 'spotify' && (
              <svg
                className="w-4 h-4 shrink-0"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.52 17.34c-.24.36-.66.48-1.02.24-2.82-1.74-6.36-2.1-10.56-1.14-.42.12-.78-.18-.9-.54-.12-.42.18-.78.54-.9 4.56-1.02 8.52-.6 11.64 1.32.42.18.48.66.3 1.02zm1.44-3.3c-.3.42-.84.6-1.26.3-3.24-1.98-8.16-2.58-11.94-1.38-.48.12-1.02-.12-1.14-.6-.12-.48.12-1.02.6-1.14C9.6 9.9 15 10.56 18.72 12.84c.36.18.54.78.24 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.3c-.6.18-1.2-.18-1.38-.72-.18-.6.18-1.2.72-1.38 4.26-1.26 11.28-1.02 15.72 1.62.54.3.72 1.02.42 1.56-.3.42-1.02.6-1.56.3z" />
              </svg>
            )}
            <span className={`font-roboto-medium text-xs sm:text-sm uppercase tracking-widest ${story.textColor} opacity-80 transition-opacity duration-300 group-hover:opacity-100`}>
              {story.ctaLabel}
            </span>
            <span className={`${story.textColor} transition-transform duration-300 ease-out group-hover:translate-x-1`} aria-hidden="true">
              &rarr;
            </span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
});

StoryItem.displayName = 'StoryItem';

const ProductStory: React.FC = () => {
  // The bamboo pillar ("The Promise") is now featured up top as a real
  // product (FeaturedBamboo), so Our Story here is just the three text
  // pillars: the Story, the Space, the Ritual.
  const textStories = PRODUCT_STORIES.slice(0, -1);

  return (
    // overflow-x: clip is a safety backstop so these rows can never bleed a
    // horizontal scroll (black bar) at any width, even outside the tested
    // range — it clips the horizontal axis only, leaving vertical flow and
    // sticky/fixed untouched. The column widths above are sized to fit
    // within the row, so in practice nothing is actually clipped.
    <section id="our-story" style={{ overflowX: 'clip' }}>
      {textStories.map((story, index) => (
        <StoryItem
          key={story.id}
          story={story}
          index={index}
          isEven={index % 2 !== 0}
        />
      ))}
    </section>
  );
};

export default ProductStory;
