'use client';

import type React from 'react';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import axios from 'axios';
import { getFileUrl } from '@/utils/fileHelper';
import { EVENTS_BOOKING_URL } from '@/lib/externalLinks';
import SessionVideo from '@/components/SessionVideo';
import { YOUTUBE_CHANNEL_URL } from '@/lib/businessDetails';


// Interface for Event item
interface EventItem {
  _id: string;
  title: string;
  description: string;
  eventDate: string;
  eventTime: string;
  ticketPrice: number;
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
  // Fetch active event data
  useEffect(() => {
    const fetchActiveEvent = async () => {
      try {
        const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/events/active`, { timeout: 8000 });
        setEventData(response.data);
      } catch (err) {
        console.warn('Active event unavailable; showing the sessions introduction.', err);
      }
    };

    fetchActiveEvent();
  }, []);

  // Animation variants 
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.2,
        delayChildren: 0.1
      }
    }
  };
  
  const videoVariants: Variants = {
    hidden: { 
      opacity: 0, 
      scale: 0.95,
    },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { 
        type: "tween",
        ease: [0.16, 1, 0.3, 1],
        duration: 0.8
      }
    }
  };
  
  const textVariants: Variants = {
    hidden: { 
      opacity: 0, 
      y: 30,
    },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        type: "tween",
        ease: [0.16, 1, 0.3, 1],
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

  // Format time for display in AM/PM format
  const formatEventTime = (timeString: string) => {
    if (!timeString) return '7:00 PM';
    
    const [hours, minutes] = timeString.split(':');
    const hour24 = Number.parseInt(hours);
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    const ampm = hour24 >= 12 ? 'PM' : 'AM';
    
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Format ticket price for display
  const formatTicketPrice = (price: number) => {
    return price ? `$${price.toLocaleString()}` : 'Free';
  };

  // Format complete event info in one line
  const formatEventInfo = (eventData: EventItem) => {
    const date = formatEventDate(eventData.eventDate);
    const time = formatEventTime(eventData.eventTime);
    const price = formatTicketPrice(eventData.ticketPrice);
    
    return `${date} / ${time} / ${price}`;
  };

  return (
    <section id="event-booking" className="contain-paint">
      <div className="bg-[#181818] px-6 pt-16 pb-10 sm:pt-24 sm:pb-12 text-center">
        <p className="uppercase tracking-[0.25em] text-[#B49B73]/70 text-xs sm:text-sm font-label-mono mb-3">
          The Sessions
        </p>
        <h2 className="gj-display-title">
          Pull up a chair.
        </h2>
        <p className="text-[#e3dcd4]/80 text-sm sm:text-base md:text-lg leading-relaxed max-w-2xl mx-auto mt-5">
          {eventData?.description || 'Music, conversation and easy afternoons in the Kamala hills. Pull up a chair and stay a while.'}
        </p>
        {eventData && Date.parse(eventData.eventDate) >= Date.now() - 86_400_000 && (
          <p className="font-label-mono text-[#B49B73] text-xs sm:text-sm mt-4">
            {formatEventInfo(eventData)}
          </p>
        )}
      </div>
      <motion.div
        className="bg-[#181818] w-full relative px-6 min-h-[50vh] sm:min-h-0 sm:aspect-[16/9] overflow-hidden isolate"
        variants={containerVariants}
        initial="visible"
        animate="visible"
      >
        {/* Noise texture overlay */}
        <div className="absolute inset-0 opacity-15 mix-blend-overlay pointer-events-none" style={noiseTexture} />
        
        {/* Video Background - Full Container */}
        <motion.div 
          className="absolute inset-0 p-3 md:p-4 flex items-center justify-center"
          variants={videoVariants}
        >
          <div className="relative w-[95%] h-[90%] rounded-box overflow-hidden">
            <SessionVideo source={eventData?.videoPath ? getFileUrl(eventData.videoPath) : '/videos/quiz-sessions-v1.mp4'} />
            <div className="absolute inset-0 bg-black/30 pointer-events-none" aria-hidden="true" />
          </div>
        </motion.div>
        
        {/* Text Overlay - Centered on Container */}
        <motion.div 
          className="absolute inset-0 z-10 w-full h-full pointer-events-none flex items-center justify-center px-4 md:px-6"
          variants={textVariants}
        >
          <div className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl text-center">
            {/* Title */}
            <h3 className="gj-display-title mb-5 drop-shadow-2xl">
              {eventData?.title || 'Sessions at Grandma Jazz'}
            </h3>
            
            {/* Book Now Button */}
            <div>
                <a
                  href={EVENTS_BOOKING_URL}
                  className="gj-cta pointer-events-auto bg-black/50"
                >
                  Book a session
                </a>
            </div>
            
          </div>
        </motion.div>
      </motion.div>
      <div className="bg-[#181818] px-6 pt-8 pb-16 sm:pb-24 text-center">
        <a
          href={YOUTUBE_CHANNEL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="gj-cta"
        >
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
          </svg>
          Watch on YouTube <span aria-hidden="true">→</span>
        </a>
      </div>
    </section>
  );
};

export default EventBooking;
