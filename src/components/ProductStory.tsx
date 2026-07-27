'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';

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
    title: "It's not just coffee and joints, darling.",
    subtitle: "Our Story",
    description: "We didn't set out to open just another café. We wanted to challenge how cannabis is served — with care, not hype. Sustainability isn't a trend here, it's a habit: reusable packaging, up-cycled fits, and flower grown by local Thai farms. Simple, honest, intentional.",
    quote: "",
    imageSrc: "/images/1.webp",
    imageAlt: "Illustrated portrait cards of Grandma Jazz's founders, Ac and Joy, established 2023 in Phuket, Thailand",
    bgColor: "bg-[#F5F1E6]",
    textColor: "text-[#0A0A0A]",
    accentColor: "text-[#0A0A0A]",
    borderColor: "border-[#b88c41]"
  },
  {
    id: 2,
    title: "Not just a vibe - but a memory trip",
    subtitle: "The Space",
    description: "Fairy lights along the roofline, the hills of Kamala rolling out below, a breeze that shows up right on cue. We pick tracks that stir something familiar, pour something warm, and let the evening slow all the way down. No rush. No noise. Just a moment that feels like it's always been there.",
    quote: "",
    // PLACEHOLDER — mood/style reference, not an actual photo of Grandma Jazz.
    // Swap for a real golden-hour exterior shot of the cafe entrance/terrace
    // (string lights, greenery, hillside view) once that photo exists.
    imageSrc: "/images/exterior-placeholder.jpg",
    imageAlt: "Placeholder mood reference for a hillside café terrace at golden hour, with string lights along the eaves, potted greenery, and misty mountains behind — to be replaced with a real photo of Grandma Jazz's exterior",
    bgColor: "bg-[#31372b]",
    textColor: "text-[#F5F1E6]",
    accentColor: "text-[#31372b]",
    borderColor: "border-[#31372b]"
  },
  {
    id: 3,
    title: "Not all highs come from herb, darling.",
    subtitle: "The Ritual",
    description: "We source flower from growers who care — about the plant, the land, and doing things right. And our Thai coffee? Strong, smooth, and made to slow you down. Together, they set the rhythm here: sip, spark, and stay a while.",
    quote: "",
    imageSrc: "/images/3.webp",
    imageAlt: "Guests settle into low chairs around Grandma Jazz's lounge table, drinks poured and conversation running late into the night",
    bgColor: "bg-[#7c4d33]",
    textColor: "text-[#F5F1E6]",
    accentColor: "text-[#e3dcd4]",
    borderColor: "border-[#e3dcd4]"
  },
  {
    id: 4,
    title: "Plastic? Not in Grandma's house.",
    subtitle: "The Promise",
    description: "Plastic-free since 2023 — no baggies, no shortcuts. Our bamboo joint holders are one of many ways we cut waste and care for the island. That's the GreenFlow Movement: proof a dispensary can thrive without the trash. Not about perfection — just the next right step. Two years strong, and counting.",
    quote: "",
    imageSrc: "/images/4.webp",
    imageAlt: "An engraved bamboo joint holder, one of Grandma Jazz's plastic-free touches since 2023",
    bgColor: "bg-[#b88c41]",
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
          
          <h2 className={`font-silver-garden text-3xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl font-bold ${story.textColor} ${story.subtitle ? 'mt-2' : ''} leading-tight text-center lg:text-left`}>
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
  return (
    <section>
      {PRODUCT_STORIES.map((story, index) => (
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