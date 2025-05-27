'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';

// กำหนด interface สำหรับ Story item
interface SingleStoryItem {
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

// Story data สำหรับแถวเดียว
const SINGLE_STORY: SingleStoryItem = {
  id: 1,
  title: "Golden Hour Sessions",
  subtitle: "Featured Experience",
  description: "Every evening as the sun sets behind Phuket's mountains, our terrace transforms into an intimate concert hall. Local and international jazz musicians perform against the backdrop of golden light filtering through tropical foliage, creating an atmosphere where time stands still and music becomes pure emotion.",
  quote: "Where golden light meets timeless melodies.",
  imageSrc: "/images/4.png",
  imageAlt: "Jazz performance during golden hour at Grandma Jazz terrace",
  bgColor: "bg-[#b88c41]", // สีทองเหมือนต้นฉบับ
  textColor: "text-[#0A0A0A]", // ข้อความสีเข้มเหมือนต้นฉบับ
  accentColor: "text-[#7c4d33]", // สีน้ำตาลเข้มเหมือนต้นฉบับ
  borderColor: "border-[#7c4d33]" // เส้นขอบสีน้ำตาลเข้มเหมือนต้นฉบับ
};

// CSS สำหรับ noise texture
const noiseTexture = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
  backgroundSize: '150px',
  backgroundRepeat: 'repeat',
};

// SingleStory component
const SingleStory: React.FC = () => {
  // Animation variants 
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.3,
        delayChildren: 0.2
      }
    }
  };
  
  const imageVariants = {
    hidden: { 
      opacity: 0, 
      x: 60,
      scale: 0.9
    },
    visible: { 
      opacity: 1, 
      x: 0,
      scale: 1,
      transition: { 
        type: "spring", 
        damping: 25, 
        stiffness: 100,
        duration: 0.8
      }
    }
  };
  
  const textVariants = {
    hidden: { 
      opacity: 0, 
      x: -60,
      y: 20
    },
    visible: { 
      opacity: 1, 
      x: 0,
      y: 0,
      transition: { 
        type: "spring", 
        damping: 25, 
        stiffness: 100,
        duration: 0.8
      }
    }
  };

  return (
    <section>
      <motion.div 
        className={`${SINGLE_STORY.bgColor} w-full flex flex-col md:flex-row-reverse items-center justify-center relative px-6`}
        style={{ aspectRatio: '16/9' }}
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        {/* Noise texture overlay */}
        <div className="absolute inset-0 opacity-15 mix-blend-overlay pointer-events-none" style={noiseTexture} />
        
        {/* Image */}
        <motion.div 
          className="w-full md:w-[70%] p-3 md:p-4 flex items-center justify-center"
          variants={imageVariants}
          style={{ willChange: "transform, opacity" }}
        >
          <div className="w-full overflow-hidden" style={{aspectRatio: '4/3'}}>
            <Image
              src={SINGLE_STORY.imageSrc}
              alt={SINGLE_STORY.imageAlt}
              width={1200}
              height={800}
              className="w-full h-full object-contain"
              loading="eager"
              priority={true}
              sizes="(max-width: 768px) 100vw, 70vw"
              quality={90}
            />
          </div>
        </motion.div>
        
        {/* Text content */}
        <motion.div 
          className="w-full md:w-[40%] mt-4 md:mt-0 flex items-center justify-center px-3 md:px-4"
          variants={textVariants}
          style={{ willChange: "transform, opacity" }}
        >
          <div className="max-w-sm md:max-w-md">
            {/* Subtitle */}
            <div className="flex items-center">
              <div className={`h-px w-8 ${SINGLE_STORY.borderColor}`}></div>
              <span className={`mx-2 ${SINGLE_STORY.accentColor} text-xs sm:text-sm uppercase tracking-widest font-medium`}>
                {SINGLE_STORY.subtitle}
              </span>
            </div>
            
            {/* Title */}
            <h2 className={`text-2xl sm:text-3xl md:text-4xl font-bold ${SINGLE_STORY.textColor} mt-2`}>
              {SINGLE_STORY.title}
            </h2>
            
            {/* Description */}
            <p className={`text-sm sm:text-base ${SINGLE_STORY.textColor} opacity-80 mt-3 leading-relaxed`}>
              {SINGLE_STORY.description}
            </p>
            
            {/* Quote */}
            <div className={`${SINGLE_STORY.borderColor}/30 border-t mt-4 pt-3`}>
              <p className={`${SINGLE_STORY.accentColor} italic text-xs sm:text-sm md:text-base font-medium`}>
                "{SINGLE_STORY.quote}"
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default SingleStory;