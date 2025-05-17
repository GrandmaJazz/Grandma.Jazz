'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { AnimatedSection } from '@/components/AnimatedSection';

const ProductStory = () => {
  // Add animation keyframes
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeInSlow {
        from { opacity: 0; }
        to { opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    
    // Return proper cleanup function
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Product stories data
  const productStories = [
    {
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

  return (
    <section>
      {productStories.map((product, index) => (
        <div 
          key={index} 
          className={`${product.bgColor} w-full flex flex-col md:flex-row items-center justify-center relative px-6 ${index % 2 !== 0 && 'md:flex-row-reverse'}`}
          style={{aspectRatio: '16/9'}}
        >
          {/* Noise texture overlay */}
          <div 
            className="absolute inset-0 opacity-15 mix-blend-overlay pointer-events-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
              backgroundSize: '150px',
              backgroundRepeat: 'repeat'
            }}
          />
          
          {/* Image */}
          <AnimatedSection 
            animation={index % 2 === 0 ? "fadeInLeft" : "fadeInRight"} 
            className="w-full md:w-[70%] p-3 md:p-4 flex items-center justify-center"
            delay={0.3}
          >
            <div className="w-full rounded-[40px] sm:rounded-[48px] lg:rounded-[100px] overflow-hidden" style={{aspectRatio: '4/3'}}>
              <Image
                src={product.imageSrc}
                alt={product.imageAlt}
                width={1200}
                height={800}
                className="w-full h-full object-cover"
                priority={index === 0}
              />
            </div>
          </AnimatedSection>
          
          {/* Text content */}
          <AnimatedSection 
            animation={index % 2 === 0 ? "fadeInRight" : "fadeInLeft"} 
            className="w-full md:w-[40%] mt-4 md:mt-0 flex items-center justify-center px-3 md:px-4"
            delay={0.5}
          >
            <div className="max-w-sm md:max-w-md">
              {/* Subtitle */}
              <div className="flex items-center">
                <div className={`h-px w-8 ${product.borderColor}`}></div>
                <span className={`mx-2 ${product.accentColor} text-xs sm:text-sm uppercase tracking-widest`}>
                  {product.subtitle}
                </span>
              </div>
              
              {/* Title */}
              <h2 className={`text-2xl sm:text-3xl md:text-4xl font-bold ${product.textColor} mt-2`}>
                {product.title}
              </h2>
              
              {/* Description */}
              <p className={`text-sm sm:text-base ${product.textColor} opacity-90 mt-3`}>
                {product.description}
              </p>
              
              {/* Quote */}
              <div className={`${product.borderColor}/30 border-t mt-4 pt-3`}>
                <p className={`${product.accentColor} italic text-xs sm:text-sm md:text-base`}>
                  "{product.quote}"
                </p>
              </div>
            </div>
          </AnimatedSection>
        </div>
      ))}
    </section>
  );
};

export default ProductStory;