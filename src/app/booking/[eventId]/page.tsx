//src/app/booking/[eventId]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Plus, Minus, Calendar, MapPin, Clock, Users } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';

interface Event {
  _id: string;
  title: string;
  description: string;
  eventDate: string;
  ticketPrice: number;
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

  // Fetch event details
  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/events/${eventId}`);
        setEvent(response.data);
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
    if (newQuantity >= 1 && newQuantity <= 10) {
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

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-28 pb-16 bg-[#F5F1E6] flex justify-center items-center">
        <div className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!event || !isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen pt-28 pb-16 bg-[#F5F1E6]">
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-[#0A0A0A] mb-4">
            Book Your Tickets
          </h1>
          <p className="text-[#9C6554] text-lg">
            Reserve your spot for an unforgettable jazz experience
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Event Details */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-2xl p-8 shadow-lg border border-[#9C6554]/20"
          >
            <h2 className="text-2xl font-bold text-[#0A0A0A] mb-6">Event Details</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-[#0A0A0A] mb-2">{event.title}</h3>
                <p className="text-[#9C6554]">{event.description}</p>
              </div>

              <div className="flex items-center gap-3 text-[#0A0A0A]">
                <Calendar className="text-[#D4AF37]" size={20} />
                <span>{formatDate(event.eventDate)}</span>
              </div>

              <div className="flex items-center gap-3 text-[#0A0A0A]">
                <Clock className="text-[#D4AF37]" size={20} />
                <span>{formatTime(event.eventDate)}</span>
              </div>

              <div className="flex items-center gap-3 text-[#0A0A0A]">
                <MapPin className="text-[#D4AF37]" size={20} />
                <span>Grandma Jazz Venue, Phuket</span>
              </div>

              <div className="bg-[#F5F1E6] rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-[#0A0A0A] font-medium">Ticket Price:</span>
                  <span className="text-2xl font-bold text-[#D4AF37]">฿{event.ticketPrice}</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Booking Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-2xl p-8 shadow-lg border border-[#9C6554]/20"
          >
            <h2 className="text-2xl font-bold text-[#0A0A0A] mb-6">Booking Information</h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Quantity Selection */}
              <div>
                <label className="block text-[#0A0A0A] font-medium mb-3">
                  Number of Tickets (Max 10)
                </label>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(quantity - 1)}
                    className="w-10 h-10 rounded-full bg-[#9C6554] text-white flex items-center justify-center hover:bg-opacity-90 transition-colors"
                    disabled={quantity <= 1}
                  >
                    <Minus size={16} />
                  </button>
                  <span className="text-2xl font-bold text-[#0A0A0A] min-w-[3rem] text-center">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(quantity + 1)}
                    className="w-10 h-10 rounded-full bg-[#9C6554] text-white flex items-center justify-center hover:bg-opacity-90 transition-colors"
                    disabled={quantity >= 10}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              {/* Attendees Information */}
              <div>
                <label className="block text-[#0A0A0A] font-medium mb-3">
                  <Users className="inline mr-2" size={20} />
                  Attendee Information
                </label>
                <div className="space-y-4">
                  {Array.from({ length: quantity }, (_, index) => (
                    <div key={index} className="bg-[#F5F1E6] rounded-lg p-4">
                      <h4 className="text-[#0A0A0A] font-medium mb-3">
                        Attendee {index + 1}
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="First Name"
                          value={attendees[index]?.firstName || ''}
                          onChange={(e) => handleAttendeeChange(index, 'firstName', e.target.value)}
                          className="w-full p-3 border border-[#9C6554]/30 rounded-lg focus:outline-none focus:border-[#D4AF37] bg-white"
                          required
                        />
                        <input
                          type="text"
                          placeholder="Last Name"
                          value={attendees[index]?.lastName || ''}
                          onChange={(e) => handleAttendeeChange(index, 'lastName', e.target.value)}
                          className="w-full p-3 border border-[#9C6554]/30 rounded-lg focus:outline-none focus:border-[#D4AF37] bg-white"
                          required
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="bg-[#F5F1E6] rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-[#0A0A0A] font-medium">Total Amount:</span>
                  <span className="text-2xl font-bold text-[#D4AF37]">
                    ฿{(event.ticketPrice * quantity).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#D4AF37] hover:bg-[#b88c41] text-[#0A0A0A] py-4 rounded-lg font-bold text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Processing...' : 'Proceed to Payment'}
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
} 