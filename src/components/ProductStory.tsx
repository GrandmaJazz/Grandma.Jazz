'use client';

import React, { useRef } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { motion, useScroll, useTransform } from 'framer-motion';

// 3D + scroll-scrubbing libs are browser-only (WebGL), so this loads
// client-side only, after the rest of the page is interactive.
const BambooScrollShowcase = dynamic(() => import('@/components/BambooScrollShowcase'), {
  ssr: false,
  loading: () => <div className="h-screen bg-[#B49B73]" />,
});

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
    description: "Cannabis served with care, not hype — reusable packaging, up-cycled fits, flower grown by local Thai farms. Sustainability isn't a trend here, it's a habit.",
    quote: "",
    imageSrc: "/images/1.webp",
    imageAlt: "Black-and-white portrait cards of Grandma Jazz's founders, Ac and Joy, established 2023 in Phuket, Thailand",
    bgColor: "bg-[#F5F1E6]",
    textColor: "text-[#0A0A0A]",
    accentColor: "text-[#0A0A0A]",
    borderColor: "border-[#B49B73]"
  },
  {
    id: 2,
    title: "Not just a vibe — a memory trip.",
    subtitle: "The Space",
    description: "Fairy lights, the hills of Kamala below, and tracks that pull you back. No rush, no noise — just an evening that slows all the way down.",
    quote: "",
    imageSrc: "/images/exterior.webp",
    imageAlt: "Grandma Jazz's hillside entrance in daylight, with string lights along the eaves, the tiled roof, and the jungled hills of Kamala behind",
    bgColor: "bg-[#31372b]",
    textColor: "text-[#F5F1E6]",
    accentColor: "text-[#31372b]",
    borderColor: "border-[#31372b]"
  },
  {
    id: 3,
    title: "Not all highs come from herb, darling.",
    subtitle: "The Ritual",
    description: "Ethically grown flower and strong Thai coffee, working together. Sip, spark, and stay a while.",
    quote: "",
    imageSrc: "/images/3.webp",
    imageAlt: "A hand holding a fresh cannabis flower bud up close, warm wood tones in the background",
    bgColor: "bg-[#7c4d33]",
    textColor: "text-[#F5F1E6]",
    accentColor: "text-[#e3dcd4]",
    borderColor: "border-[#e3dcd4]"
  },
  {
    id: 4,
    title: "Plastic? Not in Grandma's house.",
    subtitle: "The Promise",
    description: "Plastic-free since 2023 — bamboo instead of baggies, reuse instead of waste. That's the GreenFlow Movement: proof a dispensary can thrive without the trash.",
    quote: "",
    imageSrc: "/images/4.webp",
    imageAlt: "An engraved bamboo joint holder, one of Grandma Jazz's plastic-free touches since 2023",
    bgColor: "bg-[#B49B73]",
    textColor: "text-[#0A0A0A]",
    accentColor: "text-[#7c4d33]",
    borderColor: "border-[#7c4d33]"
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
      className={`${story.bgColor} w-full flex flex-col lg:flex-row items-center justify-center relative px-6 ${isEven ? 'lg:flex-row-reverse' : ''} ${index === 0 ? 'pt-24 sm:pt-20' : ''}`}
      style={{ aspectRatio: '16/9' }}
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: false, amount: 0.2 }}
    >
      <div className="absolute inset-0 opacity-15 mix-blend-overlay pointer-events-none" style={noiseTexture} />

      <motion.div
        className="w-full lg:w-[70%] p-3 lg:p-4 flex items-center justify-center"
        variants={imageVariants}
        style={{ willChange: "transform, opacity" }}
      >
        <div className="w-full rounded-[15px] xl:rounded-[20px] overflow-hidden" style={{aspectRatio: '16/10'}}>
          {/* The frame stays put (so nothing clips at the edges); the image
              itself drifts inside it, scaled up so the drift never reveals
              its border. */}
          <motion.div className="relative w-full h-full" style={{ y: parallaxY, scale: 1.15 }}>
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
      </motion.div>
      
      <motion.div 
        className="w-full lg:w-[40%] mt-4 lg:mt-0 flex items-center justify-center px-3 md:px-6 lg:px-4"
        variants={textVariants}
        style={{ willChange: "transform, opacity" }}
      >
        <div className="w-full max-w-full text-center lg:text-left">
          {story.subtitle && (
            <div className="flex items-center justify-center lg:justify-start">
              <div className={`h-px ${story.borderColor}`}></div>
              <span className={` ${story.accentColor} text-xs sm:text-sm lg:text-xs xl:text-sm uppercase tracking-widest`}>
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
          
          <div className={`${story.borderColor}/30 border-t mt-4 pb-3`}></div>
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