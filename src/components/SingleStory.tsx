'use client';

import type React from 'react';
import { useRef, useEffect, useState } from 'react';
import Image from 'next/image';
import { motion, useScroll, useTransform } from 'framer-motion';

// กำหนด interface สำหรับ Story item
interface SingleStoryItem {
  id: number;
  title: string;
  subtitle: string;
  description: string;
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
  title: "Plastic? Not in Grandma's house.",
  subtitle: "Featured Experience",
  description: "We've been plastic-free since 2023—no baggies, no shortcuts. Our bamboo joint holders are one of many ways we cut waste and care for the island. Sustainability isn't a trend—it's our duty. That's why we started the GreenFlow Movement: to show a dispensary can thrive without the trash. It's not about perfection. Just the next right step. Two years strong—and counting.",
  imageSrc: "/images/4.png",
  imageAlt: "Jazz performance during golden hour at Grandma Jazz terrace",
  bgColor: "bg-[#b88c41]",
  textColor: "text-[#0A0A0A]",
  accentColor: "text-[#7c4d33]",
  borderColor: "border-[#7c4d33]"
};

// CSS ในรูปแบบของ object สำหรับใช้กับ inline styles
const noiseTexture = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
  backgroundSize: '150px',
  backgroundRepeat: 'repeat',
};

// Hook สำหรับตรวจสอบขนาดหน้าจอ
const useScreenSize = () => {
  const [screenSize, setScreenSize] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  useEffect(() => {
    const checkScreenSize = () => {
      if (window.innerWidth < 768) {
        setScreenSize('mobile');
      } else if (window.innerWidth < 1024) {
        setScreenSize('tablet');
      } else {
        setScreenSize('desktop');
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  return screenSize;
};

// SingleStory component
const SingleStory: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const screenSize = useScreenSize();
  
  // ใช้ useScroll เพื่อติดตามการเลื่อนจอผ่าน section นี้
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"]
  });
  
  // ปรับค่า scale และ height ตามขนาดหน้าจอ
  const getScaleValues = () => {
    switch (screenSize) {
      case 'mobile':
        return { scale: [1, 1, 2.3, 2.3], height: ["100%", "100%", "120%", "120%"] };
      case 'tablet':
        return { scale: [1, 1, 1.6, 1.6], height: ["100%", "100%", "125%", "125%"] };
      default:
        return { scale: [1, 1, 1.8, 1.8], height: ["100%", "100%", "130%", "130%"] };
    }
  };

  const { scale, height } = getScaleValues();
  
  // แปลงค่า scroll progress เป็นค่า scale และ height
  const imageScale = useTransform(scrollYProgress, [0, 0.4, 0.7, 1], scale);
  const containerHeight = useTransform(scrollYProgress, [0, 0.4, 0.7, 1], height);
  
  // Animation variants สำหรับ initial load
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
      x: screenSize === 'mobile' ? 0 : 60,
      y: screenSize === 'mobile' ? 30 : 0,
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
  
  const textVariants = {
    hidden: { 
      opacity: 0, 
      x: screenSize === 'mobile' ? 0 : -60,
      y: screenSize === 'mobile' ? -30 : 20
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
    <motion.section ref={sectionRef} className="w-full">
      <motion.div 
        className={`${SINGLE_STORY.bgColor} w-full flex flex-col lg:flex-row-reverse items-center justify-center relative px-4 sm:px-6 lg:px-8`}
        style={{ 
          aspectRatio: screenSize === 'mobile' ? '9/16' : screenSize === 'tablet' ? '4/3' : '16/9',
          minHeight: screenSize === 'mobile' ? '100vh' : 'auto'
        }}
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: false, amount: 0.2 }}
      >
        {/* Noise texture overlay */}
        <div className="absolute inset-0 opacity-15 mix-blend-overlay pointer-events-none" style={noiseTexture} />
        
        {/* Image with scroll-triggered zoom */}
        <motion.div 
          className="w-full lg:w-[70%] xl:w-[65%] p-2 sm:p-3 lg:p-4 flex items-center justify-center overflow-hidden"
          variants={imageVariants}
          style={{ 
            willChange: "transform, opacity",
            height: containerHeight
          }}
        >
          <motion.div 
            className="w-full overflow-hidden" 
            style={{
              aspectRatio: screenSize === 'mobile' ? '16/12' : '4/3',
              scale: imageScale,
              maxWidth: screenSize === 'mobile' ? '100%' : screenSize === 'tablet' ? '90%' : '85%'
            }}
          >
            <Image
              src={SINGLE_STORY.imageSrc}
              alt={SINGLE_STORY.imageAlt}
              width={1200}
              height={800}
              className="w-full h-full object-contain"
              loading="eager"
              priority={true}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 70vw"
              quality={90}
            />
          </motion.div>
        </motion.div>
        
        {/* Text content */}
        <motion.div 
          className="w-full lg:w-[30%] xl:w-[35%] mt-4 lg:mt-0 flex items-center justify-center px-2 sm:px-3 lg:px-4 xl:px-6"
          variants={textVariants}
          style={{ willChange: "transform, opacity" }}
        >
          <div className="w-full max-w-sm sm:max-w-md lg:max-w-lg xl:max-w-xl text-center lg:text-left">
            {/* Subtitle */}
            {SINGLE_STORY.subtitle && (
              <div className="flex items-center justify-center lg:justify-start mb-2 sm:mb-3">
                <div className={`h-px w-6 sm:w-8 ${SINGLE_STORY.borderColor}`}></div>
                <span className={`mx-2 ${SINGLE_STORY.accentColor} text-xs sm:text-sm lg:text-base uppercase tracking-widest font-medium`}>
                  {SINGLE_STORY.subtitle}
                </span>
              </div>
            )}
            
            {/* Title */}
            <h2 className={`text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold ${SINGLE_STORY.textColor} leading-tight`}>
              {SINGLE_STORY.title}
            </h2>
            
            {/* Description */}
            <p className={`text-sm sm:text-base lg:text-lg ${SINGLE_STORY.textColor} opacity-80 mt-3 sm:mt-4 leading-relaxed`}>
              {SINGLE_STORY.description}
            </p>
            
            {/* Border line */}
            <div className={`${SINGLE_STORY.borderColor}/30 border-t mt-4 sm:mt-6 pb-3`}></div>
          </div>
        </motion.div>
      </motion.div>
    </motion.section>
  );
};

export default SingleStory;