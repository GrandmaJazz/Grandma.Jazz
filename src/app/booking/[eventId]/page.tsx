//src/app/booking/[eventId]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Plus, Minus, Calendar, MapPin, Users } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { AnimatedSection } from '@/components/AnimatedSection';
import { MusicProtectedRoute } from '@/components/MusicProtectedRoute';

interface Event {
  _id: string;
  title: string;
  description: string;
  eventDate: string;
  ticketPrice: number;
  totalTickets: number;
  soldTickets: number;
  availableTickets: number;
  isSoldOut: boolean;
  videoPath: string;
  isActive: boolean;
}

interface Attendee {
  firstName: string;
  lastName: string;
}

export default function BookingPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const eventId = params.eventId as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [attendees, setAttendees] = useState<Attendee[]>([{ firstName: '', lastName: '' }]);
  const [submitting, setSubmitting] = useState(false);

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

  // Fetch event details
  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/events/${eventId}`);
        setEvent(response.data);
        
        // Set initial quantity to 1 or 0 if sold out
        if (response.data.isSoldOut) {
          setQuantity(0);
        } else {
          setQuantity(1);
        }
      } catch (error) {
        console.error('Error fetching event:', error);
        toast.error('Event not found');
        router.push('/');
      } finally {
        setLoading(false);
      }
    };

    if (eventId) {
      fetchEvent();
    }
  }, [eventId, router]);

  // Check if event date has passed
  const isEventPassed = (eventDate: string) => {
    const now = new Date();
    const event = new Date(eventDate);
    return event < now;
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      toast.error('Please login to book tickets');
      router.push('/login');
    }
  }, [isAuthenticated, loading, router]);

  // Update attendees when quantity changes
  useEffect(() => {
    const newAttendees = Array.from({ length: quantity }, (_, index) => 
      attendees[index] || { firstName: '', lastName: '' }
    );
    setAttendees(newAttendees);
  }, [quantity]);

  const handleQuantityChange = (newQuantity: number) => {
    const maxQuantity = Math.min(10, event?.availableTickets || 0);
    if (newQuantity >= 1 && newQuantity <= maxQuantity) {
      setQuantity(newQuantity);
    }
  };

  const handleAttendeeChange = (index: number, field: 'firstName' | 'lastName', value: string) => {
    const newAttendees = [...attendees];
    newAttendees[index] = { ...newAttendees[index], [field]: value };
    setAttendees(newAttendees);
  };

  const validateForm = () => {
    // Check if all attendees have names
    for (let i = 0; i < quantity; i++) {
      if (!attendees[i]?.firstName.trim() || !attendees[i]?.lastName.trim()) {
        toast.error(`Please fill in all names for attendee ${i + 1}`);
        return false;
      }
    }

    // Check for duplicate names
    const names = attendees.slice(0, quantity).map(a => `${a.firstName.trim()} ${a.lastName.trim()}`.toLowerCase());
    const uniqueNames = new Set(names);
    if (names.length !== uniqueNames.size) {
      toast.error('Attendee names must be unique');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    // Check if event has passed
    if (event && isEventPassed(event.eventDate)) {
      toast.error('Cannot book tickets for past events. This event has already occurred.');
      return;
    }
  
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/tickets`,
        {
          eventId,
          attendees: attendees.slice(0, quantity),
          quantity
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
  
      if (response.data.success) {
        // Redirect ไปหน้า ticket checkout แทน
        router.push(`/ticket-checkout/${response.data.ticket._id}`);
      }
    } catch (error: any) {
      console.error('Error creating ticket:', error);
      toast.error(error.response?.data?.message || 'Error creating booking');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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

  if (!event || !isAuthenticated) {
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

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
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
              Book Your Tickets
            </h1>
            <div className="h-0.5 w-4 sm:w-6 bg-[#D4AF37]/30 ml-2 sm:ml-4"></div>
          </div>
          
          {/* Decorative line */}
          <div className="flex items-center justify-center mt-4">
            <div className="h-px w-12 sm:w-16 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent"></div>
          </div>
        </AnimatedSection>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Event Details */}
          <AnimatedSection animation="fadeIn">
            <div 
              className="bg-[#1a1a1a]/70 backdrop-blur-sm rounded-3xl p-6 sm:p-8 shadow-lg border border-[#7c4d33]/20 relative overflow-hidden"
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
              
              <h2 className="text-xl sm:text-2xl font-suisse-intl text-[#F5F1E6] mb-6">Event Details</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg sm:text-xl font-suisse-intl text-[#F5F1E6] mb-2">{event.title}</h3>
                  <p className="text-[#e3dcd4]/80 font-suisse-intl text-sm sm:text-base">{event.description}</p>
                </div>

                <div className="flex items-center gap-3 text-[#e3dcd4] font-suisse-intl-mono text-sm">
                  <Calendar className="text-[#D4AF37]" size={18} />
                  <span>{formatDate(event.eventDate)}</span>
                </div>

                <div className="flex items-center gap-3 text-[#e3dcd4] font-suisse-intl-mono text-sm">
                  <MapPin className="text-[#D4AF37]" size={18} />
                  <span>Grandma Jazz Venue, Phuket</span>
                </div>

                <div className="bg-[#0A0A0A]/50 rounded-xl p-4 border border-[#D4AF37]/20">
                  <div className="flex justify-between items-center">
                    <span className="text-[#e3dcd4] font-suisse-intl text-sm uppercase tracking-wider">Ticket Price:</span>
                    <span className="text-xl sm:text-2xl font-suisse-intl text-[#D4AF37]">฿{event.ticketPrice}</span>
                  </div>
                </div>

                {/* Ticket Availability */}
                <div className="bg-[#0A0A0A]/50 rounded-xl p-4 border border-[#7c4d33]/20">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[#e3dcd4] font-suisse-intl text-sm uppercase tracking-wider">Available Tickets:</span>
                      <span className={`text-lg font-suisse-intl ${event.isSoldOut ? 'text-[#E67373]' : 'text-[#7EB47E]'}`}>
                        {event.isSoldOut ? 'SOLD OUT' : `${event.availableTickets} / ${event.totalTickets}`}
                      </span>
                    </div>
                    {!event.isSoldOut && (
                      <div className="w-full bg-[#7c4d33]/30 rounded-full h-2">
                        <div 
                          className="bg-[#D4AF37] h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(event.soldTickets / event.totalTickets) * 100}%` }}
                        ></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </AnimatedSection>

          {/* Booking Form */}
          <AnimatedSection animation="fadeIn">
            <div 
              className="bg-[#1a1a1a]/70 backdrop-blur-sm rounded-3xl p-6 sm:p-8 shadow-lg border border-[#7c4d33]/20 relative overflow-hidden"
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
              
              <h2 className="text-xl sm:text-2xl font-suisse-intl text-[#F5F1E6] mb-6">Booking Information</h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Quantity Selection */}
                <div>
                  <label className="block text-[#D4AF37] font-suisse-intl text-sm uppercase tracking-wider mb-3">
                    Number of Tickets {isEventPassed(event.eventDate) ? '(EVENT PASSED)' : event.isSoldOut ? '(SOLD OUT)' : `(Max ${Math.min(10, event.availableTickets)})`}
                  </label>
                  {isEventPassed(event.eventDate) ? (
                    <div className="flex items-center justify-center p-4 bg-[#E67373]/10 border border-[#E67373]/30 rounded-xl">
                      <span className="text-[#E67373] font-suisse-intl text-lg">This event has already occurred</span>
                    </div>
                  ) : event.isSoldOut ? (
                    <div className="flex items-center justify-center p-4 bg-[#E67373]/10 border border-[#E67373]/30 rounded-xl">
                      <span className="text-[#E67373] font-suisse-intl text-lg">This event is sold out</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(quantity - 1)}
                        className="w-10 h-10 rounded-full bg-[#7c4d33] text-[#F5F1E6] flex items-center justify-center hover:bg-[#9C6554] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={quantity <= 1}
                      >
                        <Minus size={16} />
                      </button>
                      <span className="text-2xl font-suisse-intl text-[#D4AF37] min-w-[3rem] text-center">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(quantity + 1)}
                        className="w-10 h-10 rounded-full bg-[#7c4d33] text-[#F5F1E6] flex items-center justify-center hover:bg-[#9C6554] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={quantity >= Math.min(10, event.availableTickets)}
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Attendees Information */}
                {!isEventPassed(event.eventDate) && !event.isSoldOut && (
                  <div>
                    <label className="block text-[#D4AF37] font-suisse-intl text-sm uppercase tracking-wider mb-3">
                      <Users className="inline mr-2" size={18} />
                      Attendee Information
                    </label>
                    <div className="space-y-4">
                      {Array.from({ length: quantity }, (_, index) => (
                        <div key={index} className="bg-[#0A0A0A]/50 rounded-xl p-4 border border-[#7c4d33]/30">
                          <h4 className="text-[#e3dcd4] font-suisse-intl-mono text-sm uppercase tracking-wider mb-3">
                            Attendee {index + 1}
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <input
                              type="text"
                              placeholder="First Name"
                              value={attendees[index]?.firstName || ''}
                              onChange={(e) => handleAttendeeChange(index, 'firstName', e.target.value)}
                              className="w-full p-3 border border-[#7c4d33]/30 rounded-xl focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 bg-[#1a1a1a] text-[#F5F1E6] font-suisse-intl transition-all duration-300"
                              required
                            />
                            <input
                              type="text"
                              placeholder="Last Name"
                              value={attendees[index]?.lastName || ''}
                              onChange={(e) => handleAttendeeChange(index, 'lastName', e.target.value)}
                              className="w-full p-3 border border-[#7c4d33]/30 rounded-xl focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 bg-[#1a1a1a] text-[#F5F1E6] font-suisse-intl transition-all duration-300"
                              required
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Total */}
                {!isEventPassed(event.eventDate) && !event.isSoldOut && (
                  <div className="bg-[#0A0A0A]/50 rounded-xl p-4 border border-[#D4AF37]/20">
                    <div className="flex justify-between items-center">
                      <span className="text-[#e3dcd4] font-suisse-intl text-sm uppercase tracking-wider">Total Amount:</span>
                      <span className="text-xl sm:text-2xl font-suisse-intl text-[#D4AF37]">
                        ฿{(event.ticketPrice * quantity).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                {isEventPassed(event.eventDate) ? (
                  <div className="w-full bg-[#E67373]/20 border border-[#E67373]/30 text-[#E67373] py-3 sm:py-4 rounded-full font-suisse-intl-mono text-sm sm:text-base uppercase tracking-wide text-center">
                    Event Has Passed - Booking Closed
                  </div>
                ) : !event.isSoldOut ? (
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-[#D4AF37] hover:bg-[#b88c41] text-[#0A0A0A] py-3 sm:py-4 rounded-full font-suisse-intl-mono text-sm sm:text-base uppercase tracking-wide transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {submitting ? 'Processing...' : 'Proceed to Payment'}
                  </button>
                ) : (
                  <div className="w-full bg-[#E67373]/20 border border-[#E67373]/30 text-[#E67373] py-3 sm:py-4 rounded-full font-suisse-intl-mono text-sm sm:text-base uppercase tracking-wide text-center">
                    Event Sold Out
                  </div>
                )}
              </form>
            </div>
          </AnimatedSection>
        </div>
      </div>
      </div>
    </MusicProtectedRoute>
  );
} 