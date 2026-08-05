'use client';

import React, { useRef } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { motion, useScroll, useTransform } from 'framer-motion';

// 3D + scroll-scrubbing libs are browser-only (WebGL), so this loads
// client-side only, after the rest of the page is interactive.
const BambooScrollShowcase = dynamic(() => import('@/components/BambooScrollShowcase'), {
  ssr: false,
  loading: () => <div className="h-screen bg-[#0A0A0A]" />,
});

interface ProductStoryItem {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  quote: string;
  imageSrc: string;
  imageAlt: string;
  /** Hex used only for the soft blurred glow behind the row — never a
   * solid section background. Keeps each story's colour as an accent,
   * not a block. */
  glowColor: string;
  textColor: string;
  accentColor: string;
  borderColor: string;
  /** When true, the image slot renders as two independent founder cards
   * (see FOUNDER_CARDS) cropped live from imageSrc instead of a single
   * object-cover image. Keeps each card's own corners/edges snug against
   * its content — no shared background bleeding through at the seams. */
  founderCards?: boolean;
}

interface StoryItemProps {
  story: ProductStoryItem;
  index: number;
  isEven: boolean;
}

// Precise crop geometry for the two founder portraits baked into
// /images/1.webp (source is 2800x1680). Each card is cropped to its own
// black polaroid frame, with a small safety margin added around the true
// frame edge so the header (ESTB. year / name) and footer (PHUKET /
// THAILAND) text are never sliced off. left/top/width/height are
// expressed as percentages of the CARD box (the containing element),
// following the standard responsive absolutely-positioned-sprite
// technique: they scale correctly at any breakpoint without needing
// separate cropped image files.
//
// Static crop, no scroll parallax/zoom on this row — the whole card
// (including its extra black curved border below) stays fully visible
// and in the same position at all times, at every scroll position.
const FOUNDER_CARDS = [
  {
    key: 'ac',
    alt: "Ac, co-founder of Grandma Jazz, established 1988",
    left: -20.6612,
    top: -10.0141,
    width: 257.1166,
    height: 118.4767,
  },
  {
    key: 'joy',
    alt: "Joy, co-founder of Grandma Jazz, established 1996",
    left: -136.3636,
    top: -10.0141,
    width: 257.1166,
    height: 118.4767,
  },
] as const;

const PRODUCT_STORIES: ProductStoryItem[] = [
  {
    id: 1,
    title: "Not just coffee and joints, darling.",
    subtitle: "Our Story",
    description: "One of us spent years in theatre, television and five-star hotels. The other turns leftover fabric into clothes worth keeping. Together, we figured hospitality and sustainability were never meant to be separate things.",
    quote: "",
    imageSrc: "/images/1.webp",
    imageAlt: "Black-and-white portrait cards of Grandma Jazz's founders, Ac and Joy, established 2023 in Phuket, Thailand",
    glowColor: "#B49B73",
    textColor: "text-[#F5F1E6]",
    accentColor: "text-[#B49B73]",
    borderColor: "border-[#B49B73]",
    founderCards: true
  },
  {
    id: 2,
    title: "Not just a vibe — a memory trip.",
    subtitle: "The Space",
    description: "Fairy lights, the hills of Kamala, and a soundtrack that always finds the right moment. Stay long enough and the outside world gets quieter.",
    quote: "",
    imageSrc: "/images/exterior.webp",
    imageAlt: "Grandma Jazz's hillside entrance in daylight, with string lights along the eaves, the tiled roof, and the jungled hills of Kamala behind",
    glowColor: "#B49B73",
    textColor: "text-[#F5F1E6]",
    accentColor: "text-[#B49B73]",
    borderColor: "border-[#8fa583]"
  },
  {
    id: 3,
    title: "Not all highs come from herb, darling.",
    subtitle: "The Ritual",
    description: "Strong Thai coffee, ethically grown flower — in whichever order you like. Either way, you're staying a while.",
    quote: "",
    imageSrc: "/images/3.webp",
    imageAlt: "A hand holding a fresh cannabis flower bud up close, warm wood tones in the background",
    glowColor: "#B49B73",
    textColor: "text-[#F5F1E6]",
    accentColor: "text-[#B49B73]",
    borderColor: "border-[#e3dcd4]"
  },
  {
    id: 4,
    title: "Plastic? Not in Grandma's house.",
    subtitle: "The Promise",
    description: "Bamboo instead of baggies, reuse instead of waste — plastic-free since day one. We call it the GreenFlow Movement: proof it doesn't have to cost the earth to do this properly.",
    quote: "",
    imageSrc: "/images/4.webp",
    imageAlt: "An engraved bamboo joint holder, one of Grandma Jazz's plastic-free touches since 2023",
    glowColor: "#B49B73",
    textColor: "text-[#F5F1E6]",
    accentColor: "text-[#B49B73]",
    borderColor: "border-[#c9a893]"
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
  const parallaxY = useTransform(scrollYProgress, [0, 1], [30, -30]);

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
      className={`bg-[#0A0A0A] w-full flex flex-col lg:flex-row items-center justify-center relative overflow-hidden px-6 sm:px-10 lg:px-16 py-24 sm:py-32 ${isEven ? 'lg:flex-row-reverse' : ''} ${index === 0 ? 'pt-32 sm:pt-36' : ''}`}
      style={{ minHeight: 'min(88vh, 760px)' }}
      variants={containerVariants}
      // initial={false} instead of "hidden": the entrance animation is an
      // enhancement, never a gate on the content being visible. The
      // observer was failing to fire on this page (the hero slide
      // transforms the whole scroll container), leaving rows stranded at
      // ~0 opacity. Content now paints immediately; the animation still
      // plays on re-entry.
      initial={false}
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
    >
      {/* Soft, faded colour — an accent glow behind the content, never a
          solid block. Same black canvas every row, just a different
          whisper of colour drifting behind it. */}
      <div
        aria-hidden="true"
        className={`absolute top-1/2 -translate-y-1/2 ${isEven ? 'right-[-10%]' : 'left-[-10%]'} w-[55%] max-w-[560px] aspect-square rounded-full pointer-events-none opacity-[0.16] blur-[130px]`}
        style={{ backgroundColor: story.glowColor }}
      />
      <div className="absolute inset-0 opacity-15 mix-blend-overlay pointer-events-none" style={noiseTexture} />

      <motion.div
        className="w-full lg:w-[52%] p-3 lg:p-4 flex items-center justify-center"
        variants={imageVariants}
        style={{ willChange: "transform, opacity" }}
      >
        {story.founderCards ? (
          // Two independent cards, each cropped to its own frame with a
          // black curved border added to match the site's rounded-card
          // look. Static — no parallax/zoom — so the header and footer
          // text stay fully visible at all times, at every scroll position.
          <div className="w-full">
            <div className="relative w-full flex gap-3 sm:gap-4 md:gap-5">
              {FOUNDER_CARDS.map((card) => (
                <div
                  key={card.key}
                  className="relative flex-1 rounded-[15px] xl:rounded-[20px] overflow-hidden border-4 sm:border-[5px] border-[#0A0A0A]"
                  style={{ aspectRatio: '1089 / 1418' }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- intentional plain img: needs manual absolute positioning for the sprite crop, which fights next/image's fill styles */}
                  <img
                    src={story.imageSrc}
                    alt={card.alt}
                    loading={index === 0 ? "eager" : "lazy"}
                    style={{
                      position: 'absolute',
                      left: `${card.left}%`,
                      top: `${card.top}%`,
                      width: `${card.width}%`,
                      height: `${card.height}%`,
                      maxWidth: 'none',
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="w-full rounded-[15px] xl:rounded-[20px] overflow-hidden" style={{aspectRatio: '16/10'}}>
            {/* The frame stays put (so nothing clips at the edges); the image
                itself drifts inside it, scaled up so the drift never reveals
                its border. */}
            <motion.div className="relative w-full h-full rounded-[15px] xl:rounded-[20px] overflow-hidden" style={{ y: parallaxY, scale: 1.15 }}>
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
          </div>
        )}
      </motion.div>

      <motion.div
        className="w-full lg:w-[48%] mt-10 lg:mt-0 flex items-center justify-center px-3 md:px-6 lg:px-10 xl:px-14"
        variants={textVariants}
        style={{ willChange: "transform, opacity" }}
      >
        <div className="w-full max-w-[34ch] mx-auto lg:mx-0 text-center lg:text-left">
          {story.subtitle && (
            <div className="flex items-center justify-center lg:justify-start">
              <span className="text-[#B49B73] text-[11px] sm:text-xs uppercase tracking-[0.28em]">
                {story.subtitle}
              </span>
            </div>
          )}

          {/* Restrained heading scale. The old xl:text-8xl (96px) wrapped to
              four lines inside a narrow column and spilled off-screen —
              hierarchy comes from the contrast between heading and body,
              not from raw size. */}
          <h2 className={`font-silver-garden text-[2.25rem] sm:text-5xl lg:text-[2.75rem] xl:text-[3.25rem] font-black tracking-tight ${story.textColor} ${story.subtitle ? 'mt-5' : ''} leading-[1.08] text-balance`}>
            {story.title}
          </h2>

          <p className={`text-base sm:text-lg ${story.textColor} opacity-70 mt-6 leading-[1.7]`}>
            {story.description}
          </p>

          <div className="border-t border-[#B49B73]/20 mt-10 w-16 mx-auto lg:mx-0"></div>
        </div>
      </motion.div>
    </motion.div>
  );
});

StoryItem.displayName = 'StoryItem';

const ProductStory: React.FC = () => {
  // The last story ("The Promise" / bamboo joint holder) gets the full
  // scroll-driven 3D showcase treatment instead of the static image+text
  // layout the first three use.
  const [textStories, showcaseStory] = [PRODUCT_STORIES.slice(0, -1), PRODUCT_STORIES[PRODUCT_STORIES.length - 1]];

  return (
    <section>
      {textStories.map((story, index) => (
        <StoryItem
          key={story.id}
          story={story}
          index={index}
          isEven={index % 2 !== 0}
        />
      ))}
      <BambooScrollShowcase
        title={showcaseStory.title}
        subtitle={showcaseStory.subtitle}
        description={showcaseStory.description}
      />
    </section>
  );
};

export default ProductStory;
