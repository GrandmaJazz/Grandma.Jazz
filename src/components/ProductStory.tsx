'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';

// กำหนด interface สำหรับ Story item
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

// กำหนด interface สำหรับ StoryItem props
interface StoryItemProps {
  story: ProductStoryItem;
  index: number;
  isEven: boolean;
}

// แยก product data ออกมาเป็น constant
const PRODUCT_STORIES: ProductStoryItem[] = [
  {
    id: 1,
    title: "It's not just coffee and joints, darling.",
    subtitle: "Our Story",
    description: "We didn't set out to open just another café. We wanted to challenge how things are done. What if cannabis was served with care, not hype? What if sustainability wasn't a trend, but a habit? From our reusable packaging to up-cycled clothes to local Thai farms, we keep things simple, honest, and intentional.",
    quote: "",
    imageSrc: "/images/999.png",
    imageAlt: "Grandma Jazz interior showing warm wooden decor with vintage jazz instruments, cozy seating areas, and ambient lighting creating an intimate atmosphere",
    bgColor: "bg-[#F5F1E6]", // Dark Green
    textColor: "text-[#0A0A0A]", // Rich White
    accentColor: "text-[#0A0A0A]", // Golden Brown
    borderColor: "border-[#b88c41]" // Golden Brown
  },
  {
    id: 2,
    title: "Not just a vibe - but a memory trip",
    subtitle: "",
    description: "We pick tracks that stir something familiar. Tunes that pull you back—softly, surely. Light up under the smoking hat with a good flower, & just like that, you're nowhere and everywhere at once. No rush. No noise. Just a moment that feels like it's always been there.",
    quote: "",
    imageSrc: "/images/2.webp",
    imageAlt: "Collection of artisanal spirits featuring Thai-inspired botanicals in elegant glass bottles, displayed on wooden shelves with soft backlighting",
    bgColor: "bg-[#31372b]", // Golden Brown
    textColor: "text-[#F5F1E6]", // Rich Black
    accentColor: "text-[#31372b]", // Dark Green
    borderColor: "border-[#31372b]" // Dark Green
  },
  {
    id: 3,
    title: "Not all highs come from herb, darling.",
    subtitle: "",
    description: "We source flower from growers who care—about the plant, the land, and doing things right. And our Thai coffee? Strong, smooth, and made to slow you down. Together, they set the rhythm here: sip, spark, and stay a while.",
    quote: "",
    imageSrc: "/images/3.webp",
    imageAlt: "Premium cannabis products displayed in elegant minimalist packaging with natural wood and glass elements, emphasizing quality and sophistication",
    bgColor: "bg-[#7c4d33]", // Dark Brown
    textColor: "text-[#F5F1E6]", // Rich White
    accentColor: "text-[#e3dcd4]", // Beige/Cream
    borderColor: "border-[#e3dcd4]" // Beige/Cream
  },
  {
    id: 4,
    title: "Plastic? Not in Grandma's house.",
    subtitle: "",
    description: "We've been plastic-free since 2023—no baggies, no shortcuts. Our bamboo joint holders are one of many ways we cut waste and care for the island. Sustainability isn't a trend—it's our duty. That's why we started the GreenFlow Movement: to show a dispensary can thrive without the trash. It's not about perfection. Just the next right step. Two years strong—and counting.",
    quote: "",
    imageSrc: "/images/4.webp",
    imageAlt: "Plastic? Not in Grandma's house.",
    bgColor: "bg-[#b88c41]",
    textColor: "text-[#0A0A0A]",
    accentColor: "text-[#7c4d33]",
    borderColor: "border-[#7c4d33]"
  },
];

// CSS ในรูปแบบของ object สำหรับใช้กับ inline styles
const noiseTexture = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
  backgroundSize: '150px',
  backgroundRepeat: 'repeat',
};

// StoryItem component ที่ใช้ Framer Motion
const StoryItem = React.memo<StoryItemProps>(({ story, index, isEven }) => {
  // Animation variants 
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
      className={`${story.bgColor} w-full flex flex-col lg:flex-row items-center justify-center relative px-6 ${isEven ? 'lg:flex-row-reverse' : ''}`}
      style={{ aspectRatio: '16/9' }}
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: false, amount: 0.2 }}
    >
      {/* Noise texture overlay */}
      <div className="absolute inset-0 opacity-15 mix-blend-overlay pointer-events-none" style={noiseTexture} />
      
      {/* Image */}
      <motion.div 
        className="w-full lg:w-[70%] p-3 lg:p-4 flex items-center justify-center"
        variants={imageVariants}
        style={{ willChange: "transform, opacity" }}
      >
        <div className="w-full rounded-[40px] sm:rounded-[48px] lg:rounded-[100px] overflow-hidden" style={{aspectRatio: '4/3'}}>
          <Image
            src={story.imageSrc}
            alt={story.imageAlt}
            width={1200}
            height={800}
            className="w-full h-full object-cover"
            loading={index <= 1 ? "eager" : "lazy"}
            priority={index === 0}
            sizes="(max-width: 768px) 100vw, 70vw"
            quality={90}
          />
        </div>
      </motion.div>
      
      {/* Text content */}
      <motion.div 
        className="w-full lg:w-[40%] mt-4 lg:mt-0 flex items-center justify-center px-3 md:px-6 lg:px-4"
        variants={textVariants}
        style={{ willChange: "transform, opacity" }}
      >
        <div className="w-full max-w-full text-center lg:text-left">
          {/* Subtitle - แสดงเฉพาะเมื่อมี subtitle */}
          {story.subtitle && (
            <div className="flex items-center justify-center lg:justify-start">
              <div className={`h-px ${story.borderColor}`}></div>
              <span className={` ${story.accentColor} text-xs sm:text-sm lg:text-xs xl:text-sm uppercase tracking-widest`}>
                {story.subtitle}
              </span>
            </div>
          )}
          
          {/* Title - ใช้ฟอนต์ Silver Garden พร้อม responsive sizing ที่ปรับปรุง */}
          <h2 className={`font-silver-garden text-3xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl font-bold ${story.textColor} ${story.subtitle ? 'mt-2' : ''} leading-tight text-center lg:text-left`}>
            {story.title}
          </h2>
          
          {/* Description - ใช้ฟอนต์ Roboto Medium พร้อม responsive sizing ที่ปรับปรุง */}
          <p className={`font-roboto-medium text-sm sm:text-base md:text-lg lg:text-base xl:text-lg ${story.textColor} opacity-90 mt-3 leading-relaxed text-center lg:text-left`}>
            {story.description}
          </p>
          
          {/* Border line */}
          <div className={`${story.borderColor}/30 border-t mt-4 pb-3`}></div>
        </div>
      </motion.div>
    </motion.div>
  );
});

// เพิ่ม displayName เพื่อความชัดเจนใน React DevTools
StoryItem.displayName = 'StoryItem';

// ProductStory component หลัก
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