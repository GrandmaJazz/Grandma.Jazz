'use client';

import { useRef, useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatedSection } from '@/components/AnimatedSection';
import dynamic from 'next/dynamic';

// Import ReactPlayer dynamically to avoid SSR issues
const ReactPlayer = dynamic(() => import('react-player/lazy'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen bg-[#0A0A0A] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
    </div>
  )
});

const EventBooking = () => {
  const playerRef = useRef(null);
  const [isReady, setIsReady] = useState(false);

  // Add animation keyframes
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.8; }
      }
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes floatNote {
        0% { transform: translateY(0) rotate(0deg); }
        50% { transform: translateY(-10px) rotate(5deg); }
        100% { transform: translateY(0) rotate(0deg); }
      }
      @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <AnimatedSection animation="fadeIn" className="relative w-full h-screen">
      {/* Full container video with ReactPlayer */}
      <div className="absolute inset-0 w-full h-full overflow-hidden bg-[#0A0A0A]">
        <div className="w-full h-full relative">
          <ReactPlayer
            ref={playerRef}
            url="/videos/event-background.webm" // Path to your video file
            className="react-player"
            width="100%"
            height="100%"
            playing={true}
            loop={true}
            muted={true}
            playsinline={true}
            onReady={() => setIsReady(true)}
            config={{
              file: {
                attributes: {
                  style: {
                    objectFit: 'cover',
                    width: '100%',
                    height: '100%',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                  }
                },
                forceVideo: true,
              }
            }}
          />
        </div>
        
        {/* Dark overlay to make video darker */}
        <div className="absolute inset-0 bg-[#0A0A0A] bg-opacity-70 pointer-events-none"></div>
        
        {/* Noise overlay for vintage effect */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-20 mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat',
            backgroundSize: '150px 150px'
          }}
        />
        
        {/* Film grain effect */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-30 mix-blend-multiply"
          style={{
            animation: 'noise 0.5s steps(10) infinite',
          }}
        />
        
        {/* Apply brightness and contrast filters to the video container */}
        <style jsx global>{`
          .react-player {
            position: absolute;
            top: 0;
            left: 0;
            filter: brightness(65%) contrast(115%) sepia(15%);
          }
          
          @keyframes noise {
            0%, 100% { background-position: 0 0; }
            10% { background-position: -5% -10%; }
            20% { background-position: -15% 5%; }
            30% { background-position: 7% -25%; }
            40% { background-position: 20% 15%; }
            50% { background-position: -25% 10%; }
            60% { background-position: 15% 5%; }
            70% { background-position: 0% 15%; }
            80% { background-position: 25% 35%; }
            90% { background-position: -10% 10%; }
          }
        `}</style>
        
        {/* Gradient shadows at top and bottom - deeper and more pronounced */}
        <div className="absolute top-0 left-0 right-0 h-32 md:h-40 lg:h-48 bg-gradient-to-b from-[#0A0A0A] via-[#0A0A0A]/70 to-transparent pointer-events-none z-10" />
        <div className="absolute bottom-0 left-0 right-0 h-32 md:h-40 lg:h-48 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/70 to-transparent pointer-events-none z-10" />
      </div>
      
      {/* "Grandma Jazz" branding with vintage effect */}
      <div className="absolute top-16 md:top-20 left-0 right-0 flex flex-col items-center z-20">
        <div className="flex items-center justify-center mb-1 md:mb-2">
          <div 
            className="h-px w-12 md:w-20 bg-[#9C6554]"
            style={{ animation: 'pulse 3s infinite ease-in-out' }}
          ></div>
          <div className="mx-4 text-[#D4AF37] text-3xl">♪</div>
          <div 
            className="h-px w-12 md:w-20 bg-[#9C6554]"
            style={{ animation: 'pulse 3s infinite ease-in-out' }}
          ></div>
        </div>
        <h3 
          className="text-[#F5F1E6] text-xl md:text-2xl font-light tracking-widest"
          style={{ textShadow: '0 0 4px rgba(245, 241, 230, 0.3)' }}
        >
          AT PHUKET
        </h3>
      </div>
      
      {/* Main event title with warm glow effect */}
      <div className="absolute top-1/4 left-0 right-0 flex flex-col items-center z-20">
        <div 
          className="text-center mb-6 relative"
          style={{ 
            textShadow: '0 0 18px rgba(212, 175, 55, 0.3)',
          }}
        >
          <h1 className="text-[#D4AF37] mt-[-30px] text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight">Grandma</h1>
          <h1 
            className="text-[#D4AF37] p-3  text-5xl sm:text-6xl  md:text-7xl lg:text-8xl font-bold tracking-tight -mt-2 md:-mt-3"
            style={{ 
              background: 'linear-gradient(90deg, #C2A14D, #D4AF37, #C2A14D)',
              backgroundSize: '400% 100%',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'shimmer 10s ease-in-out infinite'
            }}
          >
            Jazz
          </h1>
        </div>
        
        {/* Decorative line with vintage aesthetic */}
        <div className="flex items-center justify-center w-full max-w-lg mx-auto my-6 px-6">
          <div className="h-0.5 bg-gradient-to-r from-transparent via-[#9C6554] to-transparent w-full"></div>
          <div 
            className="mx-4 text-[#D4AF37] text-2xl"
            style={{ animation: 'floatNote 3s ease-in-out infinite' }}
          >♫</div>
          <div className="h-0.5 bg-gradient-to-r from-transparent via-[#9C6554] to-transparent w-full"></div>
        </div>
        
        {/* Event description with warm, vintage feel */}
        <div 
          className="max-w-md sm:max-w-lg md:max-w-2xl mx-auto px-6 text-center opacity-90 transform transition-all duration-1000"
          style={{ animation: 'fadeIn 1.5s ease-in-out' }}
        >
          <p className="text-[#F5F1E6] text-base sm:text-lg md:text-xl lg:text-2xl mb-4 leading-relaxed font-light">
            Experience the soulful jazz traditions with a touch of homemade comfort
          </p>
          <p className="text-[#D4AF37] text-sm sm:text-base md:text-lg lg:text-xl mb-6 italic">
            Evening Sessions • 7:00 PM - 11:00 PM • Live Music & Inspired Cuisine
          </p>
        </div>
      </div>

      {/* Book now button section with earthy brick button */}
      <div className="absolute bottom-20 sm:bottom-24 md:bottom-28 lg:bottom-32 left-0 right-0 flex flex-col items-center z-20">
        {/* Button with Muted Brick color and subtle hover effects */}
        <Link 
          href="https://www.grandmajazz.com/booking" 
          target="_blank" 
          rel="noopener noreferrer"
          className="bg-[#9C6554] text-[#F5F1E6] text-sm sm:text-base md:text-lg py-2 sm:py-3 md:py-4 px-6 sm:px-8 md:px-10 rounded hover:bg-opacity-90 transition-all duration-300 border border-transparent hover:border-[#D4AF37] shadow-lg"
        >
          Book Your Experience
        </Link>
      </div>
    </AnimatedSection>
  );
};

export default EventBooking;