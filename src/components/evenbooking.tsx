'use client';

import type React from 'react';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import axios from 'axios';
import { getFileUrl } from '@/utils/fileHelper';
import { EVENTS_BOOKING_URL } from '@/lib/externalLinks';
import LogoLoadingSpinner from '@/components/LogoLoadingSpinner';
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

  // Loading state
  // contain-paint on every state of this section (loading/error/main,
  // all three below): a hard, browser-guaranteed paint containment
  // boundary — unlike `isolate` (stacking-context only) or a compositing
  // hint like translateZ(0), `contain: paint` tells the rendering engine
  // that NOTHING outside this box can ever be painted inside it, and
  // nothing inside can paint outside it. Added specifically because the
  // Family Wall embed's floating names were confirmed bleeding into this
  // exact section — diagnosed as a compositor/rasterization artifact, not
  // a layout or z-index bug (DOM hit-testing at the bleed spot found
  // nothing there) — and the two sections sit only ~400px apart on a real
  // page, close enough to be on-screen together on a phone, so no amount
  // of iframe mount/unmount timing alone can guarantee they're never both
  // rendering at once. Paint containment is the one guarantee that holds
  // regardless of what's happening elsewhere on the page.
  if (loading) {
    return (
      <section id="event-booking" className="relative bg-[#0A0A0A] w-full min-h-[50vh] sm:min-h-0 sm:aspect-[16/9] flex items-center justify-center overflow-hidden contain-paint">
        <LogoLoadingSpinner width={160} />
      </section>
    );
  }

  // Error state
  if (error || !eventData) {
    return (
      <section id="event-booking" className="relative bg-[#181818] w-full min-h-[50vh] sm:min-h-0 sm:aspect-[16/9] flex items-center justify-center overflow-hidden contain-paint">
        <div className="relative text-center px-4">
          <p className="text-[#e3dcd4] text-lg mb-4 drop-shadow-lg">{error || 'No upcoming events available'}</p>
          <p className="text-[#e3dcd4]/70 text-sm drop-shadow-lg">Please try again or contact system administrator</p>
        </div>
      </section>
    );
  }

  return (
    <section id="event-booking" className="contain-paint">
      <div className="bg-[#181818] px-6 pt-12 pb-8 sm:pt-16 sm:pb-10 text-center">
        <p className="uppercase tracking-[0.25em] text-[#B49B73]/70 text-xs sm:text-sm font-label-mono mb-3">
          The Sessions
        </p>
        <h2 className="font-silver-garden text-[#e3dcd4] text-6xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[1.05]">
          Pull up a chair.
        </h2>
        <p className="text-[#e3dcd4]/80 text-sm sm:text-base md:text-lg leading-relaxed max-w-2xl mx-auto mt-5">
          {eventData.description}
        </p>
        {Date.parse(eventData.eventDate) >= Date.now() - 86_400_000 && (
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
            <SessionVideo source={getFileUrl(eventData.videoPath)} />
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
            <h3 className="font-silver-garden text-3xl sm:text-4xl md:text-5xl lg:text-7xl xl:text-8xl 2xl:text-9xl font-black tracking-tight text-[#e3dcd4] mb-5 sm:mb-6 leading-[1.05] drop-shadow-2xl">
              {eventData.title}
            </h3>
            
            {/* Book Now Button */}
            <div>
                <a
                  href={EVENTS_BOOKING_URL}
                  className="inline-block bg-transparent border-[1.5px] border-[#B49B73]/70 text-[#B49B73] hover:bg-[#B49B73] hover:text-[#0A0A0A] hover:border-[#B49B73] bg-black/30 pointer-events-auto text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl py-2 px-6 sm:py-3 sm:px-8 md:py-4 md:px-10 lg:py-5 lg:px-12 xl:py-6 xl:px-14 rounded-box transition-all duration-200 ease-out will-change-transform hover:-translate-y-px active:translate-y-0 active:scale-[0.97] font-label-mono cursor-pointer normal-case tracking-[0.15em]"
                >
                  Book a session
                </a>
            </div>
            
          </div>
        </motion.div>
      </motion.div>
      <div className="bg-[#181818] px-6 pt-7 pb-12 text-center">
        <a
          href={YOUTUBE_CHANNEL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-2.5 font-label-mono text-[#B49B73] text-xs sm:text-sm tracking-[0.12em] hover:text-[#e3dcd4] transition-colors"
        >
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
          </svg>
          Watch Sessions with Grandma
          <span className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true">&rarr;</span>
        </a>
      </div>
    </section>
  );
};

export default EventBooking;
