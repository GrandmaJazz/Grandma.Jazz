'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { AnimatedSection } from '@/components/AnimatedSection';

// แยก CSS ออกมาไว้ข้างนอกแทนการใช้ useEffect
const StoryStyles = `
  @keyframes fadeInSlow {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  .noise-texture {
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
    background-size: 150px;
    background-repeat: repeat;
  }
`;

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

// กำหนด interface สำหรับ custom hook
interface IntersectionOptions {
  threshold?: number;
  rootMargin?: string;
}

// แยก product data ออกมาเป็น constant
const PRODUCT_STORIES: ProductStoryItem[] = [
  {
    id: 1,
    title: "Mountain Rhythms, Ocean Vibes",
    subtitle: "Our Story",
    description: "Where Phuket's mountains meet the sea, Grandma Jazz offers a sanctuary of sound and sensation. Our intimate venue blends live jazz performances with premium offerings—artisanal coffee by day, craft drinks by night, and select cannabis experiences throughout. A harmonious escape where music flows freely, nature surrounds you, and every moment feels curated for the senses.",
    quote: "Melodies, mountains, and moments—perfectly blended.",
    imageSrc: "/images/1.webp",
    imageAlt: "Grandma Jazz interior showing warm wooden decor, vintage instruments, and cozy dining area",
    bgColor: "bg-[#0A0A0A]", // Dark Green
    textColor: "text-[#F5F1E6]", // Rich White
    accentColor: "text-[#b88c41]", // Golden Brown
    borderColor: "border-[#b88c41]" // Golden Brown
  },
  {
    id: 2,
    title: "Artisanal Spirits",
    subtitle: "Craft & Tradition",
    description: "Our selection of craft spirits combines traditional Thai ingredients with modern distillation techniques. Working with local artisans, we've developed unique flavor profiles that complement our jazz atmosphere while honoring Thailand's rich botanical heritage.",
    quote: "Harmonious blends of tradition and innovation in every sip.",
    imageSrc: "/images/2.webp",
    imageAlt: "Artisanal spirits with Thai-inspired botanicals in elegant bottles",
    bgColor: "bg-[#31372b]", // Golden Brown
    textColor: "text-[#F5F1E6]", // Rich Black
    accentColor: "text-[#31372b]", // Dark Green
    borderColor: "border-[#31372b]" // Dark Green
  },
  {
    id: 3,
    title: "Premium Cannabis",
    subtitle: "Curated Sensations",
    description: "Our carefully curated cannabis collection emphasizes quality and experience. We partner with responsible growers who share our values of sustainability and craftsmanship, offering products that enhance the sensory journey of jazz and conversation.",
    quote: "Thoughtfully selected to elevate your experience—never to overwhelm it.",
    imageSrc: "/images/3.webp",
    imageAlt: "Premium cannabis products in elegant, minimalist packaging",
    bgColor: "bg-[#7c4d33]", // Dark Brown
    textColor: "text-[#F5F1E6]", // Rich White
    accentColor: "text-[#e3dcd4]", // Beige/Cream
    borderColor: "border-[#e3dcd4]" // Beige/Cream
  },
  {
    id: 4,
    title: "Vintage Jazz Records",
    subtitle: "Soulful Collection",
    description: "Our vinyl collection captures the golden era of jazz, carefully preserved and curated for the authentic listening experience. Each record represents a moment in musical history, bringing the warmth and depth of analog sound to complement our live performances.",
    quote: "The crackling warmth of vinyl tells stories that digital never could.",
    imageSrc: "/images/4.webp",
    imageAlt: "Collection of vintage jazz vinyl records in pristine condition",
    bgColor: "bg-[#b88c41]", // Beige/Cream
    textColor: "text-[#0A0A0A]", // Rich Black
    accentColor: "text-[#7c4d33]", // Dark Brown
    borderColor: "border-[#7c4d33]" // Dark Brown
  },
  {
    id: 5,
    title: "Mountain Rhythms, Ocean Vibes",
    subtitle: "Our Story",
    description: "Where Phuket's mountains meet the sea, Grandma Jazz offers a sanctuary of sound and sensation. Our intimate venue blends live jazz performances with premium offerings—artisanal coffee by day, craft drinks by night, and select cannabis experiences throughout. A harmonious escape where music flows freely, nature surrounds you, and every moment feels curated for the senses.",
    quote: "Melodies, mountains, and moments—perfectly blended.",
    imageSrc: "/images/grandma-jazz-interior.webp",
    imageAlt: "Grandma Jazz interior showing warm wooden decor, vintage instruments, and cozy dining area",
    bgColor: "bg-[#e3dcd4]", // Beige/Cream
    textColor: "text-[#0A0A0A]", // Rich Black
    accentColor: "text-[#7c4d33]", // Dark Brown
    borderColor: "border-[#7c4d33]" // Dark Brown
  },
];

// Custom hook for tracking section visibility
const useSectionInView = (options: IntersectionOptions = { threshold: 0.3, rootMargin: '0px' }) => {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Unobserve after becoming visible
          if (ref.current) observer.unobserve(ref.current);
        }
      }, 
      options
    );

    if (ref.current) observer.observe(ref.current);

    return () => {
      if (ref.current) observer.unobserve(ref.current);
    };
  }, [options.threshold, options.rootMargin]);

  return { ref, isVisible };
};

// แยก story item เป็น Component แยก
const StoryItem: React.FC<StoryItemProps> = ({ story, index, isEven }) => {
  const { ref, isVisible } = useSectionInView();
  
  // ใช้การปรับแต่ง animation ตาม index เพื่อให้ได้ staggered effect
  const animationDelay = `${index * 0.1}s`;

  return (
    <div 
      ref={ref}
      key={story.id} 
      className={`${story.bgColor} w-full flex flex-col md:flex-row items-center justify-center relative px-6 ${isEven ? 'md:flex-row-reverse' : ''}`}
      style={{
        aspectRatio: '16/9',
        opacity: isVisible ? 1 : 0,
        transition: `opacity 0.8s ease-out ${animationDelay}`,
      }}
    >
      {/* Noise texture overlay */}
      <div className="absolute inset-0 opacity-15 mix-blend-overlay pointer-events-none noise-texture" />
      
      {/* Image */}
      <div 
        className="w-full md:w-[70%] p-3 md:p-4 flex items-center justify-center"
        style={{
          transform: isVisible 
            ? 'translateY(0)' 
            : isEven 
              ? 'translateX(60px)' 
              : 'translateX(-60px)',
          opacity: isVisible ? 1 : 0,
          transition: `transform 0.7s ease-out ${animationDelay}, opacity 0.7s ease-out ${animationDelay}`,
        }}
      >
        <div className="w-full rounded-[40px] sm:rounded-[48px] lg:rounded-[100px] overflow-hidden" style={{aspectRatio: '4/3'}}>
          <Image
            src={story.imageSrc}
            alt={story.imageAlt}
            width={1200}
            height={800}
            className="w-full h-full object-cover"
            loading={index <= 1 ? "eager" : "lazy"} // Load first two images eagerly
            priority={index === 0} // Priority for first image only
          />
        </div>
      </div>
      
      {/* Text content */}
      <div 
        className="w-full md:w-[40%] mt-4 md:mt-0 flex items-center justify-center px-3 md:px-4"
        style={{
          transform: isVisible 
            ? 'translateY(0)' 
            : isEven 
              ? 'translateX(-60px)' 
              : 'translateX(60px)',
          opacity: isVisible ? 1 : 0,
          transition: `transform 0.7s ease-out ${animationDelay}, opacity 0.7s ease-out ${animationDelay}`,
        }}
      >
        <div className="max-w-sm md:max-w-md">
          {/* Subtitle */}
          <div className="flex items-center">
            <div className={`h-px w-8 ${story.borderColor}`}></div>
            <span className={`mx-2 ${story.accentColor} text-xs sm:text-sm uppercase tracking-widest`}>
              {story.subtitle}
            </span>
          </div>
          
          {/* Title */}
          <h2 className={`text-2xl sm:text-3xl md:text-4xl font-bold ${story.textColor} mt-2`}>
            {story.title}
          </h2>
          
          {/* Description */}
          <p className={`text-sm sm:text-base ${story.textColor} opacity-90 mt-3`}>
            {story.description}
          </p>
          
          {/* Quote */}
          <div className={`${story.borderColor}/30 border-t mt-4 pt-3`}>
            <p className={`${story.accentColor} italic text-xs sm:text-sm md:text-base`}>
              "{story.quote}"
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// หน้า component หลัก
const ProductStory: React.FC = () => {
  // Add style tag only once on mount
  useEffect(() => {
    const styleTag = document.createElement('style');
    styleTag.textContent = StoryStyles;
    document.head.appendChild(styleTag);
    
    return () => {
      document.head.removeChild(styleTag);
    };
  }, []);

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