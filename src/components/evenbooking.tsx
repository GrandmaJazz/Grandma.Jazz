'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import axios from 'axios';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useUI } from '@/contexts/UIContext';

// Import ReactPlayer dynamically to avoid SSR issues
const ReactPlayer = dynamic(() => import('react-player/lazy'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-[#e4dcd1] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
    </div>
  )
});

// Interface for Event item
interface EventItem {
  _id: string;
  title: string;
  description: string;
  eventDate: string;
  videoPath: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// CSS object for inline styles
const noiseTexture = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
  backgroundSize: '150px',
  backgroundRepeat: 'repeat',
};

const EventBooking: React.FC = () => {
  const [eventData, setEventData] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();
  const { push } = useRouter();
  const { openLoginModal } = useUI();

  // Handle book table click
  const handleBookTableClick = () => {
    if (eventData) {
      if (isAuthenticated) {
        push(`/booking/${eventData._id}`);
      } else {
        openLoginModal(`/booking/${eventData._id}`);
      }
    }
  };

  // Fetch active event data
  useEffect(() => {
    const fetchActiveEvent = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/events/active`);
        setEventData(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching active event:', err);
        setError('Unable to load event data');
      } finally {
        setLoading(false);
      }
    };

    fetchActiveEvent();
  }, []);

  // Animation variants 
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.2,
        delayChildren: 0.1
      }
    }
  };
  
  const videoVariants = {
    hidden: { 
      opacity: 0, 
      scale: 0.95,
    },
    visible: { 
      opacity: 1, 
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
      y: 30,
    },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        type: "spring", 
        damping: 25, 
        stiffness: 100,
        duration: 0.7,
        delay: 0.3
      }
    }
  };

  // Format date for display
  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };

  // Loading state
  if (loading) {
    return (
      <section className="bg-[#e4dcd1] w-full flex items-center justify-center" style={{ aspectRatio: '16/9' }}>
        <div className="w-10 h-10 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
      </section>
    );
  }

  // Error state
  if (error || !eventData) {
    return (
      <section className="bg-[#e4dcd1] w-full flex items-center justify-center" style={{ aspectRatio: '16/9' }}>
        <div className="text-center">
          <p className="text-[#9C6554] text-lg mb-4">{error || 'No upcoming events available'}</p>
          <p className="text-[#0A0A0A] text-sm">Please try again or contact system administrator</p>
        </div>
      </section>
    );
  }

  return (
    <section id="event-booking">
      <motion.div 
        className="bg-[#e4dcd1] w-full relative px-6"
        style={{ aspectRatio: '16/9' }}
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: false, amount: 0.2 }}
      >
        {/* Noise texture overlay */}
        <div className="absolute inset-0 opacity-15 mix-blend-overlay pointer-events-none" style={noiseTexture} />
        
        {/* Video Background - Full Container */}
        <motion.div 
          className="absolute inset-0 p-3 md:p-4 flex items-center justify-center"
          variants={videoVariants}
          style={{ willChange: "transform, opacity" }}
        >
          <div className="w-[95%] h-[90%] rounded-[40px] sm:rounded-[48px] lg:rounded-[100px] overflow-hidden">
            <ReactPlayer
              url={`${process.env.NEXT_PUBLIC_API_URL}${eventData.videoPath}`}
              className="react-player"
              width="100%"
              height="100%"
              playing={true}
              loop={true}
              muted={true}
              playsinline={true}
              config={{
                file: {
                  attributes: {
                    style: {
                      objectFit: 'cover',
                      width: '100%',
                      height: '100%',
                    }
                  },
                  forceVideo: true,
                }
              }}
            />
          </div>
        </motion.div>
        
        {/* Text Overlay - Centered on Video */}
        <motion.div 
          className="relative z-10 w-full h-full flex items-center justify-center px-4 md:px-6"
          variants={textVariants}
          style={{ willChange: "transform, opacity" }}
        >
          <div className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl text-center">
            {/* Title */}
            <h2 className="text-xl sm:text-2xl md:text-4xl lg:text-6xl xl:text-7xl 2xl:text-8xl font-bold text-[#e4dcd1] mb-3 sm:mb-4 md:mb-6 lg:mb-8 xl:mb-10 leading-tight drop-shadow-2xl">
              {eventData.title}
            </h2>
            
            {/* Book Now Button */}
            <div className="mb-3 sm:mb-4 md:mb-6 lg:mb-8 xl:mb-10">
              {isAuthenticated ? (
                <Link 
                  href={`/booking/${eventData._id}`}
                  className="inline-block bg-[#b88c41] text-[#0A0A0A] text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl py-2 px-6 sm:py-3 sm:px-8 md:py-4 md:px-10 lg:py-5 lg:px-12 xl:py-6 xl:px-14 rounded-full transition-all duration-300 shadow-lg font-bold cursor-pointer drop-shadow-lg"
                >
                  Book a Table
                </Link>
              ) : (
                <button
                  onClick={handleBookTableClick}
                  className="inline-block bg-[#b88c41] text-[#0A0A0A] text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl py-2 px-6 sm:py-3 sm:px-8 md:py-4 md:px-10 lg:py-5 lg:px-12 xl:py-6 xl:px-14 rounded-full transition-all duration-300 shadow-lg font-bold cursor-pointer drop-shadow-lg"
                >
                  Book a Table
                </button>
              )}
            </div>
            
            {/* Description */}
            <p className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl 2xl:text-3xl text-[#e4dcd1]/95 mb-3 sm:mb-4 md:mb-6 lg:mb-8 xl:mb-10 leading-relaxed drop-shadow-lg font-medium">
              {eventData.description}
            </p>
            
            {/* Event Date */} 
            <div className="border-[#e4dcd1]/40 border-t pt-2 sm:pt-3 md:pt-4 lg:pt-5 xl:pt-6">
              <p className="text-[#e4dcd1] font-bold text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl 2xl:text-3xl drop-shadow-lg">
                📍{formatEventDate(eventData.eventDate)}
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default EventBooking;