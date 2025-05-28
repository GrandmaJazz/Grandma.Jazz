'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import axios from 'axios';

// Import ReactPlayer dynamically to avoid SSR issues
const ReactPlayer = dynamic(() => import('react-player/lazy'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-[#F5F1E6] flex items-center justify-center">
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
      x: -60,
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
      x: 60,
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
      <section className="bg-[#F5F1E6] w-full flex items-center justify-center" style={{ aspectRatio: '16/9' }}>
        <div className="w-10 h-10 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
      </section>
    );
  }

  // Error state
  if (error || !eventData) {
    return (
      <section className="bg-[#F5F1E6] w-full flex items-center justify-center" style={{ aspectRatio: '16/9' }}>
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
        className="bg-[#F5F1E6] w-full flex flex-col md:flex-row items-center justify-center relative px-6 pb-6 md:pb-8"
        style={{ aspectRatio: '16/9' }}
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        {/* Noise texture overlay */}
        <div className="absolute inset-0 opacity-15 mix-blend-overlay pointer-events-none" style={noiseTexture} />
        
        {/* Video */}
        <motion.div 
          className="w-full md:w-[70%] p-3 md:p-4 flex items-center justify-center"
          variants={videoVariants}
          style={{ willChange: "transform, opacity" }}
        >
          <div className="w-full rounded-[40px] sm:rounded-[48px] lg:rounded-[100px] overflow-hidden" style={{aspectRatio: '4/3'}}>
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
        
        {/* Text content */}
        <motion.div 
          className="w-full md:w-[40%] mt-4 md:mt-0 flex items-center justify-center px-3 md:px-4 pb-4 md:pb-6"
          variants={textVariants}
          style={{ willChange: "transform, opacity" }}
        >
          <div className="max-w-sm md:max-w-md">
            {/* Title */}
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#0A0A0A] mt-2">
              {eventData.title}
            </h2>
            
            {/* Description */}
            <p className="text-sm sm:text-base text-[#0A0A0A] opacity-90 mt-3">
              {eventData.description}
            </p>
            
            {/* Event Date */}
            <div className="border-[#9C6554]/30 border-t mt-4 pt-3">
              <p className="text-[#0A0A0A] font-bold text-sm sm:text-base ">
              📍{formatEventDate(eventData.eventDate)}
              </p>
            </div>

            {/* Book Now Button */}
            <div className="mt-6 mb-4 md:mb-6">
              <Link 
                href={`/booking/${eventData._id}`}
                className="inline-block bg-[#b88c41] text-[#0A0A0A] text-sm sm:text-base py-3 px-6 rounded-2xl hover:bg-opacity-90 transition-all duration-300 border border-transparent hover:border-[#D4AF37] shadow-lg font-bold cursor-pointer"
              >
                Book a Table
              </Link>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default EventBooking;