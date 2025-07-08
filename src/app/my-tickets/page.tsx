'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Users, Ticket, Download, CreditCard } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { AnimatedSection } from '@/components/AnimatedSection';
import { MusicProtectedRoute } from '@/components/MusicProtectedRoute';
import html2canvas from 'html2canvas';

interface Event {
  _id: string;
  title: string;
  eventDate: string;
  eventTime: string;
  ticketPrice: number;
}

interface Attendee {
  firstName: string;
  lastName: string;
}

interface TicketData {
  _id: string;
  event: Event;
  attendees: Attendee[];
  quantity: number;
  totalAmount: number;
  ticketNumber: string;
  status: 'pending' | 'paid' | 'cancelled' | 'expired';
  expiresAt?: string;
  isExpired?: boolean;
  purchaseDate: string;
}

interface IndividualTicketProps {
  event: Event;
  attendee: Attendee;
}



const IndividualTicket = React.forwardRef<HTMLDivElement, IndividualTicketProps>(({ event, attendee }, ref) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Format time for display in AM/PM format
  const formatTime = (timeString: string) => {
    if (!timeString) return '7:00 PM';
    
    const [hours, minutes] = timeString.split(':');
    const hour24 = Number.parseInt(hours);
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    const ampm = hour24 >= 12 ? 'PM' : 'AM';
    
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Format complete date and time
  const formatDateTime = (dateString: string, timeString: string) => {
    const date = formatDate(dateString);
    const time = formatTime(timeString);
    return `${date} / ${time}`;
  };

  return (
    <div className="flex justify-center mb-4 sm:mb-6 lg:mb-8 px-2 sm:px-4" ref={ref}>
      <div className="relative w-full max-w-5xl">
        {/* Main Ticket Container */}
        <div className="shadow-2xl flex overflow-hidden relative w-full"
             style={{ 
               aspectRatio: '8/3',
               minHeight: '150px',
               maxHeight: '300px',
               backgroundColor: '#ff914d',
               border: 'clamp(2px, 0.5vw, 6px) solid #2D3748'
             }}>
          
          {/* Left Section - ADMIT ONE */}
          <div className="flex items-center justify-center relative"
               style={{ 
                 width: 'clamp(50px, 12%, 80px)',
                 backgroundColor: '#ff914d', 
                 borderRight: 'clamp(2px, 0.5vw, 6px) solid #2D3748' 
               }}>
            <div className="text-gray-800 font-bold tracking-widest transform -rotate-90 whitespace-nowrap"
                 style={{ 
                   fontFamily: 'serif',
                   fontSize: 'clamp(0.6rem, 1.5vw, 1.1rem)'
                 }}>
              ADMIT ONE
            </div>
          </div>

          {/* Main Content Section */}
          <div className="flex-1 relative flex flex-col justify-center"
               style={{ 
                 backgroundColor: '#ff914d',
                 padding: 'clamp(8px, 2vw, 32px) clamp(12px, 3vw, 48px)'
               }}>
            
            {/* Top Center - GRANDMA JAZZ */}
            <div className="text-center flex-1 flex flex-col justify-center">
              <h1 className="text-gray-800 font-bold"
                  style={{ 
                    fontSize: 'clamp(0.7rem, 1.8vw, 1.3rem)',
                    letterSpacing: '0.3em',
                    fontFamily: 'serif',
                    marginBottom: 'clamp(4px, 1vw, 16px)'
                  }}>
                GRANDMA JAZZ
              </h1>
              
              {/* Main Title - Event Title */}
              <h2 className="text-gray-800 font-bold"
                  style={{ 
                    fontSize: 'clamp(1.2rem, 4.5vw, 3.5rem)',
                    lineHeight: '0.85',
                    letterSpacing: '0.1em',
                    fontFamily: 'serif',
                    textShadow: 'clamp(1px, 0.3vw, 4px) clamp(1px, 0.3vw, 4px) 0px rgba(45, 55, 72, 0.4)'
                  }}>
                {event.title.split(' ').map((word, index) => (
                  <span key={index}>
                    {word}
                    {index < event.title.split(' ').length - 1 && <br/>}
                  </span>
                ))}
              </h2>
            </div>

            {/* Bottom Section */}
            <div className="mt-auto">
              <div style={{ 
                borderTop: 'clamp(1px, 0.3vw, 4px) solid #2D3748', 
                paddingTop: 'clamp(4px, 1vw, 12px)' 
              }}>
                <div className="flex justify-between items-end">
                  <div className="text-gray-800">
                    <div className="font-medium"
                         style={{ 
                           fontSize: 'clamp(0.6rem, 1.4vw, 1.1rem)',
                           fontFamily: 'serif'
                         }}>
                      {attendee.firstName} {attendee.lastName}
                    </div>
                  </div>
                  <div className="text-gray-800 text-right">
                    <div className="font-medium"
                         style={{ 
                           fontSize: 'clamp(0.6rem, 1.4vw, 1.1rem)',
                           fontFamily: 'serif'
                         }}>
                      {formatDateTime(event.eventDate, event.eventTime)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Section - Price */}
          <div className="relative flex flex-col items-center justify-center"
               style={{ 
                 width: 'clamp(80px, 18%, 140px)',
                 backgroundColor: '#ff914d',
                 borderLeft: 'clamp(2px, 0.5vw, 6px) solid #2D3748',
                 padding: 'clamp(8px, 2vw, 24px) clamp(4px, 1vw, 16px)'
               }}>

            <div className="text-center flex flex-col justify-center h-full">
              {/* BAHT */}
              <div className="text-gray-800 font-bold"
                   style={{ 
                     fontSize: 'clamp(0.6rem, 1.3vw, 1.2rem)',
                     letterSpacing: '0.3em',
                     fontFamily: 'serif',
                     marginBottom: 'clamp(4px, 1vw, 16px)'
                   }}>
                BAHT
              </div>
              
              {/* Price */}
              <div className="text-gray-800 font-bold"
                   style={{ 
                     fontSize: 'clamp(1.5rem, 4.5vw, 4.5rem)',
                     fontFamily: 'serif',
                     textShadow: 'clamp(1px, 0.3vw, 4px) clamp(1px, 0.3vw, 4px) 0px rgba(45, 55, 72, 0.4)',
                     lineHeight: '1',
                     marginBottom: 'clamp(6px, 1.5vw, 24px)'
                   }}>
                {event.ticketPrice}
              </div>
              
              {/* Entry text */}
              <div className="text-gray-800 font-bold text-center leading-tight"
                   style={{ 
                     fontSize: 'clamp(0.4rem, 0.8vw, 0.7rem)',
                     letterSpacing: '0.1em',
                     fontFamily: 'serif'
                   }}>
                ENTRY<br/>& COMPLIMENTARY DRINK
              </div>
            </div>
          </div>
        </div>

        {/* Drop shadow */}
        <div className="absolute w-full h-full -z-10"
             style={{ 
               backgroundColor: '#2D3748',
               top: 'clamp(2px, 0.5vw, 8px)',
               left: 'clamp(2px, 0.5vw, 8px)'
             }}></div>
      </div>
    </div>
  );
});

IndividualTicket.displayName = 'IndividualTicket';

export default function MyTicketsPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [ticketRefs, setTicketRefs] = useState<{ [key: string]: React.RefObject<HTMLDivElement> }>({});

  // Add animation keyframes
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeInSlide {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
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

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      toast.error('Please login to view your tickets');
      router.push('/login');
    }
  }, [isAuthenticated, loading, router]);

  // Fetch user's tickets
  useEffect(() => {
    const fetchTickets = async () => {
      if (!isAuthenticated) return;

      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/tickets/my-tickets`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        if (response.data.success) {
          setTickets(response.data.tickets);
        }
      } catch (error) {
        console.error('Error fetching tickets:', error);
        toast.error('Error loading tickets');
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, [isAuthenticated]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Format time for display in AM/PM format
  const formatTime = (timeString: string) => {
    if (!timeString) return '7:00 PM';
    
    const [hours, minutes] = timeString.split(':');
    const hour24 = Number.parseInt(hours);
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    const ampm = hour24 >= 12 ? 'PM' : 'AM';
    
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Format complete date and time for booking history
  const formatDateTime = (dateString: string, timeString: string) => {
    const date = formatDate(dateString);
    const time = formatTime(timeString);
    return `${date} / ${time}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-900/30 text-green-400 border-green-500/30';
      case 'pending':
        return 'bg-yellow-900/30 text-yellow-400 border-yellow-500/30';
      case 'cancelled':
        return 'bg-red-900/30 text-red-400 border-red-500/30';
      case 'expired':
        return 'bg-gray-900/30 text-gray-400 border-gray-500/30';
      default:
        return 'bg-gray-900/30 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Confirmed';
      case 'pending':
        return 'Pending Payment';
      case 'cancelled':
        return 'Cancelled';
      case 'expired':
        return 'Expired';
      default:
        return status;
    }
  };

  // Check if ticket is current (not expired by more than 1 day)
  const isCurrentTicket = (eventDate: string) => {
    const eventDateTime = new Date(eventDate);
    const now = new Date();
    const oneDayAfterEvent = new Date(eventDateTime.getTime() + 24 * 60 * 60 * 1000);
    return now <= oneDayAfterEvent;
  };

  // Get current tickets (paid and not expired) - memoized to prevent infinite loops
  const currentTickets = React.useMemo(() => 
    tickets.filter(ticket => 
      ticket.status === 'paid' && isCurrentTicket(ticket.event.eventDate)
    ), [tickets]
  );

  // Create refs for tickets
  useEffect(() => {
    // Create refs for each ticket
    const refs: { [key: string]: React.RefObject<HTMLDivElement> } = {};
    currentTickets.forEach((ticket) => {
      ticket.attendees.forEach((attendee, index) => {
        const key = `${ticket._id}-${index}`;
        refs[key] = React.createRef<HTMLDivElement>();
      });
    });
    setTicketRefs(refs);
  }, [currentTickets]);

  const downloadTicketAsPNG = async (element: HTMLElement, filename: string) => {
    try {
      const canvas = await html2canvas(element, {
        backgroundColor: null,
        scale: 2,
        logging: false,
        useCORS: true
      });
      
      const link = document.createElement('a');
      link.download = filename;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Error downloading ticket:', error);
      toast.error('Error downloading ticket');
    }
  };

  const handleDownloadAll = async () => {
    setIsDownloading(true);
    
    try {
      // Download all tickets
      for (const ticket of currentTickets) {
        for (let index = 0; index < ticket.attendees.length; index++) {
          const key = `${ticket._id}-${index}`;
          const ref = ticketRefs[key];
          if (ref?.current) {
            const attendee = ticket.attendees[index];
            const filename = `ticket-${attendee.firstName}-${attendee.lastName}-${ticket.event.title.replace(/\s+/g, '-')}.png`;
            await downloadTicketAsPNG(ref.current, filename);
            // Add small delay between downloads
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }
      
      if (currentTickets.length === 1 && currentTickets[0].attendees.length === 1) {
        toast.success('Ticket downloaded successfully!');
      } else {
        toast.success(`All ${currentTickets.reduce((total, ticket) => total + ticket.attendees.length, 0)} tickets downloaded successfully!`);
      }
    } catch (error) {
      toast.error('Error downloading tickets');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCancelTicket = async (ticketId: string) => {
    if (!confirm('Are you sure you want to cancel this ticket booking? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/api/tickets/${ticketId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        toast.success('Ticket cancelled successfully');
        // Refresh tickets list
        const updatedResponse = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/tickets/my-tickets`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
        
        if (updatedResponse.data.success) {
          setTickets(updatedResponse.data.tickets);
        }
      }
    } catch (error: any) {
      console.error('Error cancelling ticket:', error);
      toast.error(error.response?.data?.message || 'Error cancelling ticket');
    }
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiration = new Date(expiresAt);
    const timeDiff = expiration.getTime() - now.getTime();
    
    if (timeDiff <= 0) {
      return 'Expired';
    }
    
    const hours = Math.floor(timeDiff / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    } else {
      return `${minutes}m remaining`;
    }
  };

  const isExpiringSoon = (expiresAt: string) => {
    const now = new Date();
    const expiration = new Date(expiresAt);
    const timeDiff = expiration.getTime() - now.getTime();
    const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
    
    return timeDiff > 0 && timeDiff <= oneHour;
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-28 pb-16 bg-[#0A0A0A] flex justify-center items-center relative overflow-hidden">
        {/* Ambient background elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-40 mix-blend-soft-light">
          <div className="absolute top-0 left-0 w-1/3 h-1/2 rounded-full bg-[#7c4d33]/10 blur-[150px] transform -translate-x-1/2"></div>
          <div className="absolute bottom-0 right-0 w-1/2 h-1/2 rounded-full bg-[#b88c41]/10 blur-[180px] transform translate-x-1/4"></div>
        </div>
        
        <div className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <MusicProtectedRoute>
      <div className="min-h-screen pt-28 pb-16 bg-[#0A0A0A] relative overflow-hidden">
      {/* Ambient background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-40 mix-blend-soft-light">
        <div className="absolute top-0 left-0 w-1/3 h-1/2 rounded-full bg-[#7c4d33]/10 blur-[150px] transform -translate-x-1/2"></div>
        <div className="absolute bottom-0 right-0 w-1/2 h-1/2 rounded-full bg-[#b88c41]/10 blur-[180px] transform translate-x-1/4"></div>
      </div>
      
      {/* Noise texture overlay */}
      <div 
        className="absolute inset-0 opacity-15 mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundSize: '150px',
          backgroundRepeat: 'repeat',
          zIndex: -1
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <AnimatedSection animation="fadeIn" className="text-center mb-8 sm:mb-10 lg:mb-12">
          <div className="flex items-center justify-center mb-4">
            <div className="h-0.5 w-4 sm:w-6 bg-[#D4AF37]/30 mr-2 sm:mr-4"></div>
            <h1 
              className="text-3xl sm:text-4xl md:text-5xl font-editorial-ultralight px-2"
              style={{ 
                background: 'linear-gradient(90deg, #D4AF37, #b88c41, #D4AF37)',
                backgroundSize: '400% 100%',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                animation: 'shimmer 8s ease-in-out infinite',
                textShadow: '0 0 20px rgba(212, 175, 55, 0.2)'
              }}
            >
              My Tickets
            </h1>
            <div className="h-0.5 w-4 sm:w-6 bg-[#D4AF37]/30 ml-2 sm:ml-4"></div>
          </div>
          
          {/* Decorative line */}
          <div className="flex items-center justify-center mt-4">
            <div className="h-px w-12 sm:w-16 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent"></div>
          </div>
        </AnimatedSection>

        {/* Pending Tickets Alert */}
        {tickets.filter(ticket => ticket.status === 'pending').length > 0 && (
          <AnimatedSection animation="fadeIn" className="mb-8 sm:mb-10 lg:mb-12">
            <div className={`border rounded-3xl p-4 sm:p-6 relative overflow-hidden ${
              tickets.some(ticket => ticket.status === 'pending' && ticket.expiresAt && isExpiringSoon(ticket.expiresAt))
                ? 'bg-[#E67373]/10 border-[#E67373]/30'
                : 'bg-[#E6B05E]/10 border-[#E6B05E]/30'
            }`}>
              <div className="flex items-start gap-3 sm:gap-4">
                <div className={`mt-1 ${
                  tickets.some(ticket => ticket.status === 'pending' && ticket.expiresAt && isExpiringSoon(ticket.expiresAt))
                    ? 'text-[#E67373]'
                    : 'text-[#E6B05E]'
                }`}>
                  <CreditCard size={20} />
                </div>
                <div className="flex-1">
                  <h3 className={`font-suisse-intl text-sm sm:text-base font-semibold mb-1 ${
                    tickets.some(ticket => ticket.status === 'pending' && ticket.expiresAt && isExpiringSoon(ticket.expiresAt))
                      ? 'text-[#E67373]'
                      : 'text-[#E6B05E]'
                  }`}>
                    {tickets.some(ticket => ticket.status === 'pending' && ticket.expiresAt && isExpiringSoon(ticket.expiresAt))
                      ? 'Urgent: Payment Required Soon!'
                      : 'Pending Payment Required'
                    }
                  </h3>
                  <p className="text-[#e3dcd4]/80 text-xs sm:text-sm font-suisse-intl mb-3">
                    You have {tickets.filter(ticket => ticket.status === 'pending').length} ticket{tickets.filter(ticket => ticket.status === 'pending').length > 1 ? 's' : ''} waiting for payment. 
                    {tickets.some(ticket => ticket.status === 'pending' && ticket.expiresAt && isExpiringSoon(ticket.expiresAt)) && (
                      <span className="block mt-1 font-semibold text-[#E67373]">
                        Some tickets expire within 1 hour!
                      </span>
                    )}
                  </p>
                  <button
                    onClick={() => {
                      const firstPendingTicket = tickets.find(ticket => ticket.status === 'pending');
                      if (firstPendingTicket) {
                        router.push(`/ticket-checkout/${firstPendingTicket._id}`);
                      }
                    }}
                    className={`px-4 py-2 rounded-full font-suisse-intl-mono text-xs uppercase tracking-wide transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 ${
                      tickets.some(ticket => ticket.status === 'pending' && ticket.expiresAt && isExpiringSoon(ticket.expiresAt))
                        ? 'bg-[#E67373] hover:bg-[#d45a5a] text-[#0A0A0A] animate-pulse'
                        : 'bg-[#E6B05E] hover:bg-[#d4a054] text-[#0A0A0A]'
                    }`}
                  >
                    Complete Payment Now
                  </button>
                </div>
              </div>
            </div>
          </AnimatedSection>
        )}

        {/* Current Tickets */}
        <AnimatedSection animation="fadeIn" className="mb-8 sm:mb-10 lg:mb-12">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4">
            <h2 
              className="text-2xl sm:text-3xl font-editorial-ultralight text-[#D4AF37]"
              style={{ 
                textShadow: '0 0 10px rgba(212, 175, 55, 0.3)'
              }}
            >
              Current Tickets
            </h2>
            
            {/* Download Button */}
            {currentTickets.length > 0 && (
              <button
                onClick={handleDownloadAll}
                disabled={isDownloading}
                className="flex items-center gap-2 bg-[#D4AF37] hover:bg-[#b88c41] text-[#0A0A0A] px-4 sm:px-6 py-2 sm:py-3 rounded-full font-suisse-intl-mono text-xs sm:text-sm uppercase tracking-wide transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none w-full sm:w-auto justify-center sm:justify-start"
              >
                <Download size={14} className="sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">
                  {isDownloading ? 'Downloading...' : 'Download All Tickets'}
                </span>
                <span className="sm:hidden">
                  {isDownloading ? 'Downloading...' : 'Download All'}
                </span>
              </button>
            )}
          </div>
          
                    {currentTickets.length === 0 ? (
            <div 
              className="bg-[#1a1a1a]/70 backdrop-blur-sm p-6 sm:p-8 lg:p-12 rounded-3xl shadow-lg border border-[#7c4d33]/20 relative overflow-hidden text-center"
              style={{ animation: 'fadeInSlide 0.6s ease-out forwards' }}
            >
              {/* Subtle glow effect at top */}
              <div 
                className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl overflow-hidden"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.2), transparent)',
                  animation: 'pulse 3s infinite'
                }}
              ></div>
              
              <Ticket className="mx-auto text-[#D4AF37] mb-4" size={48} />
              <p className="text-[#e3dcd4] text-base sm:text-lg font-suisse-intl mb-2">No current tickets</p>
              <p className="text-[#e3dcd4]/60 font-suisse-intl-mono text-xs sm:text-sm uppercase tracking-wider mb-6">Book your next jazz experience!</p>
              <button
                onClick={() => router.push('/')}
                className="bg-[#D4AF37] hover:bg-[#b88c41] text-[#0A0A0A] px-6 sm:px-8 py-2 sm:py-3 rounded-full font-suisse-intl-mono text-xs sm:text-sm uppercase tracking-wide transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 w-full sm:w-auto"
              >
                Browse Events
              </button>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6 lg:space-y-8">
              {currentTickets.map((ticket) => (
                <div key={ticket._id}>
                  {ticket.attendees.map((attendee, index) => {
                    const key = `${ticket._id}-${index}`;
                    return (
                      <IndividualTicket
                        key={key}
                        ref={ticketRefs[key]}
                        event={ticket.event}
                        attendee={attendee}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </AnimatedSection>

        {/* Booking History */}
        <AnimatedSection animation="fadeIn" className="space-y-4 sm:space-y-6">
          <h2 
            className="text-2xl sm:text-3xl font-editorial-ultralight text-[#D4AF37] mb-6 sm:mb-8 text-center"
            style={{ 
              textShadow: '0 0 10px rgba(212, 175, 55, 0.3)'
            }}
          >
            Booking History
          </h2>

          {tickets.length === 0 ? (
            <div 
              className="bg-[#1a1a1a]/70 backdrop-blur-sm p-6 sm:p-8 lg:p-12 rounded-3xl shadow-lg border border-[#7c4d33]/20 relative overflow-hidden text-center"
              style={{ animation: 'fadeInSlide 0.6s ease-out forwards' }}
            >
              {/* Subtle glow effect at top */}
              <div 
                className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl overflow-hidden"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.2), transparent)',
                  animation: 'pulse 3s infinite'
                }}
              ></div>
              
              <Ticket className="mx-auto text-[#D4AF37] mb-4" size={48} />
              <h3 className="text-lg sm:text-xl font-suisse-intl text-[#F5F1E6] mb-2">No bookings yet</h3>
              <p className="text-[#e3dcd4]/60 font-suisse-intl-mono text-xs sm:text-sm uppercase tracking-wider mb-6">
                Start your jazz journey by booking your first event
              </p>
              <button
                onClick={() => router.push('/')}
                className="bg-[#D4AF37] hover:bg-[#b88c41] text-[#0A0A0A] px-6 sm:px-8 py-2 sm:py-3 rounded-full font-suisse-intl-mono text-xs sm:text-sm uppercase tracking-wide transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 w-full sm:w-auto"
              >
                Browse Events
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:gap-6">
              {tickets.map((ticket) => (
                <motion.div
                  key={ticket._id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-[#1a1a1a]/70 backdrop-blur-sm rounded-3xl shadow-lg border border-[#7c4d33]/20 p-4 sm:p-6 lg:p-8 relative overflow-hidden"
                  style={{ animation: 'fadeInSlide 0.6s ease-out forwards' }}
                >
                  {/* Subtle glow effect at top */}
                  <div 
                    className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl overflow-hidden"
                    style={{
                      background: 'linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.2), transparent)',
                      animation: 'pulse 3s infinite'
                    }}
                  ></div>
                  
                  <div className="flex flex-col sm:flex-row justify-between items-start mb-4 gap-3 sm:gap-0">
                    <div className="flex-1">
                      <h3 className="text-lg sm:text-xl font-suisse-intl text-[#F5F1E6] mb-2">{ticket.event.title}</h3>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-[#e3dcd4]/80 font-suisse-intl-mono">
                        <div className="flex items-center gap-1">
                          <Calendar size={14} className="sm:w-4 sm:h-4" />
                          <span>{formatDateTime(ticket.event.eventDate, ticket.event.eventTime)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin size={14} className="sm:w-4 sm:h-4" />
                          <span className="hidden sm:inline">Grandma Jazz, Phuket</span>
                          <span className="sm:hidden">Phuket</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <div className={`px-2 sm:px-3 py-1 rounded-full text-xs font-suisse-intl-mono uppercase tracking-wider border ${getStatusColor(ticket.status)} mb-2 inline-block`}>
                        {getStatusText(ticket.status)}
                      </div>
                      {ticket.status === 'pending' && ticket.expiresAt && (
                        <div className={`text-xs font-suisse-intl-mono mb-1 ${
                          isExpiringSoon(ticket.expiresAt) ? 'text-[#E67373] animate-pulse' : 'text-[#E6B05E]'
                        }`}>
                          ⏰ {getTimeRemaining(ticket.expiresAt)}
                        </div>
                      )}
                      {ticket.status === 'pending' && !ticket.expiresAt && (
                        <div className="text-xs text-[#E6B05E] font-suisse-intl-mono mb-1 animate-pulse">
                          ⚠️ Payment Required
                        </div>
                      )}
                      {ticket.status === 'expired' && (
                        <div className="text-xs text-gray-400 font-suisse-intl-mono mb-1">
                          ❌ Payment Expired
                        </div>
                      )}
                      <p className="text-xs text-[#e3dcd4]/60 font-suisse-intl-mono">#{ticket.ticketNumber}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                    <div>
                      <h4 className="font-suisse-intl text-[#D4AF37] mb-2 text-xs sm:text-sm uppercase tracking-wider">Attendees ({ticket.quantity})</h4>
                      <div className="space-y-1">
                        {ticket.attendees.map((attendee, index) => (
                          <p key={index} className="text-[#e3dcd4] text-xs sm:text-sm font-suisse-intl">
                            • {attendee.firstName} {attendee.lastName}
                          </p>
                        ))}
                      </div>
                    </div>
                    <div className="text-left lg:text-right">
                      <h4 className="font-suisse-intl text-[#D4AF37] mb-2 text-xs sm:text-sm uppercase tracking-wider">Payment Details</h4>
                      <p className="text-xl sm:text-2xl font-suisse-intl text-[#D4AF37] mb-1">
                        ฿{ticket.totalAmount.toLocaleString()}
                      </p>
                      <p className="text-xs text-[#e3dcd4]/60 font-suisse-intl-mono">
                        Purchased on {new Date(ticket.purchaseDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Retry Payment Button for Pending Tickets */}
                  {ticket.status === 'pending' && (
                    <div className="mt-4 pt-4 border-t border-[#7c4d33]/30">
                      {ticket.expiresAt && new Date() > new Date(ticket.expiresAt) ? (
                        // Ticket has expired
                        <div className="text-center p-4 bg-gray-900/30 border border-gray-500/30 rounded-xl">
                          <p className="text-gray-400 font-suisse-intl text-sm mb-2">
                            This ticket has expired. Please book a new ticket.
                          </p>
                          <button
                            onClick={() => router.push('/')}
                            className="bg-[#D4AF37] hover:bg-[#b88c41] text-[#0A0A0A] py-2 px-4 rounded-full font-suisse-intl-mono text-xs uppercase tracking-wide transition-all duration-300"
                          >
                            Book New Ticket
                          </button>
                        </div>
                      ) : (
                        // Ticket is still valid
                        <>
                          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                            <button
                              onClick={() => router.push(`/ticket-checkout/${ticket._id}`)}
                              className={`flex-1 py-2 sm:py-3 px-4 sm:px-6 rounded-full font-suisse-intl-mono text-xs sm:text-sm uppercase tracking-wide transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-2 ${
                                ticket.expiresAt && isExpiringSoon(ticket.expiresAt)
                                  ? 'bg-[#E67373] hover:bg-[#d45a5a] text-[#0A0A0A] animate-pulse'
                                  : 'bg-[#D4AF37] hover:bg-[#b88c41] text-[#0A0A0A]'
                              }`}
                            >
                              <CreditCard size={16} />
                              {ticket.expiresAt && isExpiringSoon(ticket.expiresAt) ? 'Pay Now - Expiring Soon!' : 'Complete Payment'}
                            </button>
                            <button
                              onClick={() => handleCancelTicket(ticket._id)}
                              className="flex-1 sm:flex-none bg-transparent border border-[#E67373]/50 hover:bg-[#E67373]/10 text-[#E67373] py-2 sm:py-3 px-4 sm:px-6 rounded-full font-suisse-intl-mono text-xs sm:text-sm uppercase tracking-wide transition-all duration-300 flex items-center justify-center gap-2"
                            >
                              Cancel Booking
                            </button>
                          </div>
                          <p className="text-xs text-[#e3dcd4]/60 font-suisse-intl-mono text-center mt-2">
                            {ticket.expiresAt ? (
                              <>Complete payment within {getTimeRemaining(ticket.expiresAt).toLowerCase()} to secure your tickets</>
                            ) : (
                              <>Complete your payment to secure your tickets</>
                            )}
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </AnimatedSection>
      </div>
      </div>
    </MusicProtectedRoute>
  );
}