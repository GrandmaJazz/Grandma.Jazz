//src/app/ticket-checkout/[ticketId]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { TicketAPI } from '@/lib/api';
import { AnimatedSection } from '@/components/AnimatedSection';
import { Button } from '@/components/ui/Button';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Clock, Users, CreditCard, Ticket } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Event {
  _id: string;
  title: string;
  eventDate: string;
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
}

export default function TicketCheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, isAuthLoading } = useAuth();
  const ticketId = params.ticketId as string;

  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [loading, setLoading] = useState(true);
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
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      toast.error('Please login to proceed with payment');
      router.push('/login');
    }
  }, [isAuthenticated, isAuthLoading, router]);

  // Fetch ticket details
  useEffect(() => {
    const fetchTicket = async () => {
      if (!isAuthenticated || !ticketId) return;

      try {
        setLoading(true);
        const response = await TicketAPI.getById(ticketId);
        
        if (response.success) {
          setTicket(response.ticket);
          
          // ตรวจสอบสถานะ ticket
          if (response.ticket.status === 'paid') {
            toast.success('This ticket is already paid');
            router.push('/my-tickets');
          } else if (response.ticket.status === 'cancelled') {
            toast.error('This ticket has been cancelled');
            router.push('/my-tickets');
          }
        }
      } catch (error: any) {
        console.error('Error fetching ticket:', error);
        toast.error(error.message || 'Error loading ticket');
        router.push('/my-tickets');
      } finally {
        setLoading(false);
      }
    };

    fetchTicket();
  }, [isAuthenticated, ticketId, router]);

  // Handle checkout
  const handleCheckout = async () => {
    if (!ticket) return;

    // Check if event has passed
    if (isEventPassed(ticket.event.eventDate)) {
      toast.error('Cannot proceed with payment for past events. This event has already occurred.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await TicketAPI.createCheckoutSession(ticket._id);
      
      if (response.success && response.sessionUrl) {
        // เก็บ ticketId ไว้ใน sessionStorage สำหรับ success page
        sessionStorage.setItem('latestTicketId', ticket._id);
        
        // Redirect ไป Stripe Checkout
        window.location.href = response.sessionUrl;
      } else {
        toast.error('Failed to create checkout session');
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error(error.message || 'An error occurred during checkout');
    } finally {
      setSubmitting(false);
    }
  };

  // Format date and time
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Check if event date has passed
  const isEventPassed = (eventDate: string) => {
    const now = new Date();
    const event = new Date(eventDate);
    return event < now;
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
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const isExpiringSoon = (expiresAt: string) => {
    const now = new Date();
    const expiration = new Date(expiresAt);
    const timeDiff = expiration.getTime() - now.getTime();
    const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
    
    return timeDiff > 0 && timeDiff <= oneHour;
  };

  if (isAuthLoading || loading) {
    return (
      <div className="min-h-screen pt-28 pb-16 bg-[#0A0A0A] flex justify-center items-center">
        <div className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated || !ticket) {
    return null;
  }

  return (
    <div className="min-h-screen pt-28 pb-16 bg-[#0A0A0A]">
      {/* Noise texture overlay */}
      <div 
        className="fixed inset-0 opacity-15 mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundSize: '150px',
          backgroundRepeat: 'repeat',
          zIndex: -1
        }}
      />
      
      <AnimatedSection animation="fadeIn" className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <div className="h-0.5 w-6 bg-[#D4AF37]/30 mr-4"></div>
            <h1 
              className="text-4xl md:text-5xl font-editorial-ultralight"
              style={{ 
                textShadow: '0 0 10px rgba(212, 175, 55, 0.3)'
              }}
            >
              <span className="text-[#F5F1E6]">Ticket</span> <span className="text-[#D4AF37]">Checkout</span>
            </h1>
            <div className="h-0.5 w-6 bg-[#D4AF37]/30 ml-4"></div>
          </div>
          <p className="text-[#e3dcd4]/80">
            {ticket?.status === 'pending' ? 'Complete your pending payment' : 'Complete your ticket purchase'}
          </p>
          {isEventPassed(ticket?.event.eventDate) && (
            <div className="mt-2 inline-flex items-center gap-2 rounded-full px-4 py-2 bg-[#E67373]/10 border border-[#E67373]/30">
              <div className="w-2 h-2 rounded-full bg-[#E67373]"></div>
              <span className="text-sm font-suisse-intl-mono uppercase tracking-wider text-[#E67373]">
                Event Has Passed - Payment Unavailable
              </span>
            </div>
          )}
          {ticket?.status === 'pending' && ticket.expiresAt && !isEventPassed(ticket?.event.eventDate) && (
            <div className={`mt-2 inline-flex items-center gap-2 rounded-full px-4 py-2 ${
              isExpiringSoon(ticket.expiresAt)
                ? 'bg-[#E67373]/10 border border-[#E67373]/30'
                : 'bg-[#E6B05E]/10 border border-[#E6B05E]/30'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                isExpiringSoon(ticket.expiresAt)
                  ? 'bg-[#E67373] animate-pulse'
                  : 'bg-[#E6B05E] animate-pulse'
              }`}></div>
              <span className={`text-sm font-suisse-intl-mono uppercase tracking-wider ${
                isExpiringSoon(ticket.expiresAt)
                  ? 'text-[#E67373]'
                  : 'text-[#E6B05E]'
              }`}>
                {isExpiringSoon(ticket.expiresAt)
                  ? `Expires in ${getTimeRemaining(ticket.expiresAt)} - Pay Now!`
                  : `Payment expires in ${getTimeRemaining(ticket.expiresAt)}`
                }
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Ticket Details */}
          <div 
            className="bg-[#1a1a1a]/70 backdrop-blur-sm p-8 rounded-3xl shadow-lg border border-[#7c4d33]/20 relative overflow-hidden"
            style={{ animation: 'fadeInSlide 0.5s ease-out forwards' }}
          >
            {/* Subtle glow effect at top */}
            <div 
              className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl overflow-hidden"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.2), transparent)',
                animation: 'pulse 3s infinite'
              }}
            ></div>
            
            <h2 className="text-2xl font-suisse-intl text-[#F5F1E6] mb-6 flex items-center">
              <Ticket className="text-[#D4AF37] mr-2" size={24} />
              Ticket Details
            </h2>
            
            <div className="space-y-6">
              {/* Event Info */}
              <div>
                <h3 className="text-xl font-semibold text-[#F5F1E6] mb-2">{ticket.event.title}</h3>
                <p className="text-[#e3dcd4]/80 text-sm mb-4">
                  Ticket #{ticket.ticketNumber}
                </p>
              </div>

              {/* Event Details */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-[#e3dcd4]">
                  <Calendar className="text-[#D4AF37]" size={20} />
                  <span>{formatDate(ticket.event.eventDate)}</span>
                </div>

                <div className="flex items-center gap-3 text-[#e3dcd4]">
                  <MapPin className="text-[#D4AF37]" size={20} />
                  <span>Grandma Jazz Venue, Phuket</span>
                </div>

                <div className="flex items-center gap-3 text-[#e3dcd4]">
                  <Users className="text-[#D4AF37]" size={20} />
                  <span>{ticket.quantity} ticket{ticket.quantity > 1 ? 's' : ''}</span>
                </div>
              </div>

              {/* Attendees */}
              <div>
                <h4 className="font-semibold text-[#F5F1E6] mb-3">Attendees:</h4>
                <div className="space-y-2">
                  {ticket.attendees.map((attendee, index) => (
                    <div key={index} className="bg-[#0A0A0A]/50 rounded-lg p-3">
                      <p className="text-[#e3dcd4]">
                        {index + 1}. {attendee.firstName} {attendee.lastName}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Payment Summary */}
          <div 
            className="bg-[#1a1a1a]/70 backdrop-blur-sm p-8 rounded-3xl shadow-lg border border-[#7c4d33]/20 relative overflow-hidden"
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
            
            <h2 className="text-2xl font-suisse-intl text-[#F5F1E6] mb-6 flex items-center">
              <CreditCard className="text-[#D4AF37] mr-2" size={24} />
              Payment Summary
            </h2>
            
            <div className="space-y-6">
              {/* Price Breakdown */}
              <div className="space-y-3">
                <div className="flex justify-between text-[#e3dcd4]">
                  <span>Ticket Price</span>
                  <span>฿{ticket.event.ticketPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[#e3dcd4]">
                  <span>Quantity</span>
                  <span>×{ticket.quantity}</span>
                </div>
                <div className="flex justify-between text-[#e3dcd4]">
                  <span>Processing Fee</span>
                  <span>Free</span>
                </div>
                
                <div className="border-t border-[#7c4d33]/30 pt-3">
                  <div className="flex justify-between text-[#F5F1E6] font-semibold text-lg">
                    <span>Total Amount</span>
                    <span className="text-[#D4AF37]">฿{ticket.totalAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Payment Button */}
              <div className="space-y-4">
                {isEventPassed(ticket.event.eventDate) ? (
                  <div className="w-full bg-[#E67373]/20 border border-[#E67373]/30 text-[#E67373] py-4 rounded-full font-suisse-intl-mono text-center text-lg">
                    Event Has Passed - Payment Not Available
                  </div>
                ) : (
                  <Button
                    onClick={handleCheckout}
                    loading={submitting}
                    fullWidth
                    rounded="full"
                    className="border-[#D4AF37]/50 hover:bg-[#D4AF37]/10 shadow-lg py-4 text-lg"
                  >
                    {submitting ? 'Processing...' : 'Proceed to Payment'}
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={() => router.push('/my-tickets')}
                  fullWidth
                  rounded="full"
                  className="border-[#7c4d33]/50 hover:bg-[#7c4d33]/10 hover:border-[#7c4d33]"
                >
                  Back to My Tickets
                </Button>
              </div>

              {/* Payment Info */}
              <div className="text-center text-[#e3dcd4]/60 text-xs">
                <p>Secure payment processing by Stripe</p>
                <p className="mt-2">
                  Your payment information is encrypted and secure
                </p>
              </div>
            </div>
          </div>
        </div>
      </AnimatedSection>
    </div>
  );
}