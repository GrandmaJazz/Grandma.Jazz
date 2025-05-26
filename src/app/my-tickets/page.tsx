//src/app/my-tickets/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Clock, Users, Ticket, Download } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';

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
  status: 'pending' | 'paid' | 'cancelled';
  purchaseDate: string;
}

export default function MyTicketsPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [loading, setLoading] = useState(true);

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

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
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
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-28 pb-16 bg-[#F5F1E6] flex justify-center items-center">
        <div className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen pt-28 pb-16 bg-[#F5F1E6]">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-[#0A0A0A] mb-4">
            My Tickets
          </h1>
          <p className="text-[#9C6554] text-lg">
            Your jazz experience tickets and booking history
          </p>
        </motion.div>

        {/* Current Tickets Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-8 shadow-lg border border-[#9C6554]/20 mb-8"
        >
          <h2 className="text-2xl font-bold text-[#0A0A0A] mb-6">Current Tickets</h2>
          
          {tickets.filter(ticket => ticket.status === 'paid').length === 0 ? (
            <div className="text-center py-8">
              <Ticket className="mx-auto text-[#9C6554] mb-4" size={64} />
              <p className="text-[#9C6554] text-lg">No confirmed tickets yet</p>
              <p className="text-[#0A0A0A] mt-2">Book your first jazz experience!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tickets
                .filter(ticket => ticket.status === 'paid')
                .map((ticket) => (
                  <div key={ticket._id} className="bg-[#F5F1E6] rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Ticket className="text-[#D4AF37]" size={20} />
                      <span className="font-bold text-[#0A0A0A]">{ticket.event.title}</span>
                    </div>
                    <p className="text-[#9C6554] text-sm mb-2">
                      {ticket.quantity} ticket{ticket.quantity > 1 ? 's' : ''}
                    </p>
                    <div className="space-y-1">
                      {ticket.attendees.map((attendee, index) => (
                        <p key={index} className="text-[#0A0A0A] text-sm">
                          • {attendee.firstName} {attendee.lastName}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </motion.div>

        {/* Tickets History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <h2 className="text-2xl font-bold text-[#0A0A0A]">Booking History</h2>

          {tickets.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 shadow-lg border border-[#9C6554]/20 text-center">
              <Ticket className="mx-auto text-[#9C6554] mb-4" size={64} />
              <h3 className="text-xl font-semibold text-[#0A0A0A] mb-2">No tickets yet</h3>
              <p className="text-[#9C6554] mb-6">
                Start your jazz journey by booking your first event
              </p>
              <button
                onClick={() => router.push('/')}
                className="bg-[#D4AF37] hover:bg-[#b88c41] text-[#0A0A0A] px-6 py-3 rounded-lg font-bold transition-colors"
              >
                Browse Events
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {tickets.map((ticket) => (
                <motion.div
                  key={ticket._id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-2xl shadow-lg border border-[#9C6554]/20 overflow-hidden"
                >
                  {/* Ticket Header */}
                  <div className="bg-gradient-to-r from-[#D4AF37] to-[#b88c41] p-6 text-[#0A0A0A]">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-2xl font-bold mb-2">{ticket.event.title}</h3>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Calendar size={16} />
                            <span>{formatDate(ticket.event.eventDate)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock size={16} />
                            <span>{formatTime(ticket.event.eventDate)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(ticket.status)}`}>
                          {getStatusText(ticket.status)}
                        </div>
                        <p className="text-xs mt-2 opacity-80">#{ticket.ticketNumber}</p>
                      </div>
                    </div>
                  </div>

                  {/* Ticket Body */}
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Event Details */}
                      <div>
                        <h4 className="font-bold text-[#0A0A0A] mb-3">Event Details</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <MapPin className="text-[#D4AF37]" size={16} />
                            <span className="text-[#0A0A0A]">Grandma Jazz Venue, Phuket</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="text-[#D4AF37]" size={16} />
                            <span className="text-[#0A0A0A]">{ticket.quantity} ticket{ticket.quantity > 1 ? 's' : ''}</span>
                          </div>
                        </div>
                      </div>

                      {/* Attendees */}
                      <div>
                        <h4 className="font-bold text-[#0A0A0A] mb-3">Attendees</h4>
                        <div className="space-y-2">
                          {ticket.attendees.map((attendee, index) => (
                            <div key={index} className="bg-[#F5F1E6] rounded-lg p-3">
                              <p className="font-medium text-[#0A0A0A]">
                                {attendee.firstName} {attendee.lastName}
                              </p>
                              <p className="text-xs text-[#9C6554]">Ticket #{index + 1}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Ticket Footer */}
                    <div className="mt-6 pt-6 border-t border-[#9C6554]/20 flex justify-between items-center">
                      <div>
                        <p className="text-sm text-[#9C6554]">Total Amount</p>
                        <p className="text-2xl font-bold text-[#D4AF37]">
                          ฿{ticket.totalAmount.toLocaleString()}
                        </p>
                        <p className="text-xs text-[#9C6554]">
                          Purchased on {new Date(ticket.purchaseDate).toLocaleDateString()}
                        </p>
                      </div>
                      
                      {ticket.status === 'paid' && (
                        <div className="flex gap-3">
                          <button className="flex items-center gap-2 bg-[#9C6554] text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition-colors">
                            <Download size={16} />
                            Download
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
} 