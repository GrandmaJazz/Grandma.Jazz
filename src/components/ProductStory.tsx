'use client';

import React, { useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { EVENTS_BOOKING_URL } from '@/lib/externalLinks';

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
    title: "Not just coffee and joints, darling.",
    subtitle: "Our Story",
    description: "We serve cannabis with care, not hype. Reusable packaging, upcycled fits, flower from Thai farms we actually know. Sustainability isn't a trend here — it's just how we run the place.",
    quote: "",
    imageSrc: "/images/1-beige.webp",
    imageAlt: "Black-and-white portrait cards of Grandma Jazz's founders, Ac and Joy, established 2023 in Phuket, Thailand",
    bgColor: "bg-[#0A0A0A]",
    textColor: "text-[#e3dcd4]",
    accentColor: "text-[#B49B73]",
    borderColor: "border-[#e3dcd4]",
    href: "/products",
    ctaLabel: "Shop the collection",
    imageContain: true,
    frameBgClass: "bg-[#E3DCD4]",
    frameAspect: "2511 / 1528"
  },
  {
    id: 2,
    title: "Not just a vibe — a memory trip.",
    subtitle: "The Space",
    description: "You're up in the Kamala hills, the noise of the island somewhere below, and the music is something nostalgic you'd half forgotten you loved. Nobody's rushing you out. Stay as long as you want.",
    quote: "",
    imageSrc: "/images/exterior.webp",
    imageAlt: "Grandma Jazz's hillside entrance in daylight, with string lights along the eaves, the tiled roof, and the jungled hills of Kamala behind",
    bgColor: "bg-[#181818]",
    textColor: "text-[#e3dcd4]",
    accentColor: "text-[#B49B73]",
    borderColor: "border-[#e3dcd4]",
    href: EVENTS_BOOKING_URL,
    ctaLabel: "See what's on"
  },
  {
    id: 3,
    title: "Not all highs come from herb, darling.",
    subtitle: "The Ritual",
    description: "Good flower and Northern Thai coffee, and no real reason to hurry. Order one, roll the other, and settle in for a bit.",
    quote: "",
    imageSrc: "/images/3.webp",
    imageAlt: "A hand holding a fresh cannabis flower bud up close, warm wood tones in the background",
    bgColor: "bg-[#0A0A0A]",
    textColor: "text-[#e3dcd4]",
    accentColor: "text-[#B49B73]",
    borderColor: "border-[#e3dcd4]",
    href: "/products",
    ctaLabel: "Browse flower & brews"
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.2,
        delayChildren: index * 0.1
      }
    }
  };
  
  const imageVariants = {
    hidden: { 
      opacity: 0, 
      x: isEven ? 60 : -60,
    },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { 
        type: "spring", 
        damping: 25, 
        stiffness: 100,
        duration: 0.7
      }
    }
  };
  
  const textVariants = {
    hidden: { 
      opacity: 0, 
      x: isEven ? -60 : 60,
    },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { 
        type: "spring", 
        damping: 25, 
        stiffness: 100,
        duration: 0.7
      }
    }
  };

  return (
    <motion.div
      ref={rowRef}
      key={story.id}
      className={`group ${story.bgColor} w-full flex flex-col lg:flex-row items-center justify-center relative px-6 ${isEven ? 'lg:flex-row-reverse' : ''} ${index === 0 ? 'pt-32 sm:pt-28 lg:pt-24' : ''}`}
      style={{ aspectRatio: '16/9' }}
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: false, amount: 0.2 }}
    >
      {/* The whole panel is a single link target so every pillar clicks
          through. It sits above the noise layer but below the content, and
          content stays keyboard/screen-reader accessible via the label.
          External destinations (Brad's booking site) open in a new tab. */}
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
        className="w-full lg:w-[55%] p-3 lg:p-4 flex items-center justify-center"
        variants={imageVariants}
        style={{ willChange: "transform, opacity" }}
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
            <div className="relative w-full h-full p-1.5 sm:p-2">
              <Image
                src={story.imageSrc}
                alt={story.imageAlt}
                width={1200}
                height={800}
                className="w-full h-full object-contain"
                loading={index === 0 ? "eager" : "lazy"}
                priority={index === 0}
                sizes="(max-width: 768px) 100vw, 70vw"
                quality={90}
              />
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
        className="w-full lg:w-[35%] mt-4 lg:mt-0 flex items-center justify-center px-3 md:px-6 lg:px-4"
        variants={textVariants}
        style={{ willChange: "transform, opacity" }}
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
          
          <p className={`font-roboto-medium text-sm sm:text-base md:text-lg lg:text-base xl:text-lg ${story.textColor} opacity-90 mt-3 leading-relaxed text-center lg:text-left`}>
            {story.description}
          </p>

          <div className={`${story.borderColor}/30 border-t mt-4`}></div>

          {/* CTA affordance — decorative only (the whole panel is the link).
              The arrow slides on panel hover so it reads as clickable. */}
          <div className="flex items-center justify-center lg:justify-start gap-2 mt-3 pb-3">
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
    <section style={{ overflowX: 'clip' }}>
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