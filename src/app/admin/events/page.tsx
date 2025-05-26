//src/app/admin/events/page.tsx
'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, Eye, EyeOff, Calendar, Video } from 'lucide-react';
import { AnimatedSection } from '@/components/AnimatedSection';
import { toast } from 'react-hot-toast';

interface Event {
  _id: string;
  title: string;
  description: string;
  eventDate: string;
  ticketPrice: number;
  videoPath: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface EventFormData {
  title: string;
  description: string;
  eventDate: string;
  ticketPrice: string;
  video?: File;
}

export default function EventsAdminPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    eventDate: '',
    ticketPrice: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Fetch events
  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/events`);
      setEvents(response.data);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Unable to load events data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('eventDate', formData.eventDate);
      formDataToSend.append('ticketPrice', formData.ticketPrice);
      
      if (formData.video) {
        formDataToSend.append('video', formData.video);
      }

      if (editingEvent) {
        // Update existing event
        formDataToSend.append('isActive', editingEvent.isActive.toString());
        await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/api/events/${editingEvent._id}`, formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Event updated successfully!');
      } else {
        // Create new event
        await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/events`, formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Event created successfully!');
      }

      // Reset form and refresh data
      setFormData({ title: '', description: '', eventDate: '', ticketPrice: '' });
      setEditingEvent(null);
      setShowForm(false);
      fetchEvents();
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error('Error occurred while saving event');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle edit
  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description,
      eventDate: new Date(event.eventDate).toISOString().split('T')[0],
      ticketPrice: event.ticketPrice?.toString() || '0',
    });
    setShowForm(true);
  };

  // Handle delete
  const handleDelete = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/events/${eventId}`);
      toast.success('Event deleted successfully!');
      fetchEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Error occurred while deleting event');
    }
  };

  // Toggle active status
  const toggleActiveStatus = async (eventId: string) => {
    try {
      await axios.patch(`${process.env.NEXT_PUBLIC_API_URL}/api/events/${eventId}/toggle-status`);
      fetchEvents();
    } catch (error) {
      console.error('Error toggling event status:', error);
      toast.error('Error occurred while changing event status');
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-28 pb-16 bg-[#0A0A0A] flex justify-center items-center relative overflow-hidden">
        <div className="w-14 h-14 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      <AnimatedSection animation="fadeIn">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-editorial-ultralight text-[#F5F1E6]">
              Manage <span className="text-[#D4AF37]">Events</span>
            </h1>
            <p className="text-[#e3dcd4] mt-2">Manage event information and performances</p>
          </div>
          
          <button
            onClick={() => {
              setEditingEvent(null);
              setFormData({ title: '', description: '', eventDate: '', ticketPrice: '' });
              setShowForm(true);
            }}
            className="bg-[#D4AF37] hover:bg-[#b88c41] text-[#0A0A0A] py-2.5 px-5 rounded-full transition-colors duration-300 font-suisse-intl-mono text-sm uppercase tracking-wider flex items-center gap-2"
          >
            <Plus size={18} />
            Add New Event
          </button>
        </div>
        
        <div className="h-0.5 bg-gradient-to-r from-transparent via-[#7c4d33] to-transparent w-48 mb-8"></div>
      </AnimatedSection>

      {/* Form Modal */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#0A0A0A] border border-[#7c4d33]/30 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-2xl font-editorial-ultralight text-[#F5F1E6] mb-6">
              {editingEvent ? 'Edit Event' : 'Add New Event'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div>
                <label className="block text-[#e3dcd4] font-suisse-intl-mono text-sm uppercase tracking-wider mb-2">Event Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full p-3 bg-[#31372b] border border-[#7c4d33]/30 rounded-lg focus:outline-none focus:border-[#D4AF37] text-[#F5F1E6] placeholder-[#e3dcd4]/60"
                  placeholder="Event name"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-[#e3dcd4] font-suisse-intl-mono text-sm uppercase tracking-wider mb-2">Event Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-3 bg-[#31372b] border border-[#7c4d33]/30 rounded-lg focus:outline-none focus:border-[#D4AF37] h-32 resize-none text-[#F5F1E6] placeholder-[#e3dcd4]/60"
                  placeholder="Event details"
                  required
                />
              </div>

              {/* Event Date */}
              <div>
                <label className="block text-[#e3dcd4] font-suisse-intl-mono text-sm uppercase tracking-wider mb-2">Event Date</label>
                <input
                  type="date"
                  value={formData.eventDate}
                  onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                  className="w-full p-3 bg-[#31372b] border border-[#7c4d33]/30 rounded-lg focus:outline-none focus:border-[#D4AF37] text-[#F5F1E6]"
                  required
                />
              </div>

              {/* Ticket Price */}
              <div>
                <label className="block text-[#e3dcd4] font-suisse-intl-mono text-sm uppercase tracking-wider mb-2">Ticket Price (฿)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.ticketPrice}
                  onChange={(e) => setFormData({ ...formData, ticketPrice: e.target.value })}
                  className="w-full p-3 bg-[#31372b] border border-[#7c4d33]/30 rounded-lg focus:outline-none focus:border-[#D4AF37] text-[#F5F1E6] placeholder-[#e3dcd4]/60"
                  placeholder="0.00"
                  required
                />
              </div>

              {/* Video Upload */}
              <div>
                <label className="block text-[#e3dcd4] font-suisse-intl-mono text-sm uppercase tracking-wider mb-2">Event Video</label>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => setFormData({ ...formData, video: e.target.files?.[0] })}
                  className="w-full p-3 bg-[#31372b] border border-[#7c4d33]/30 rounded-lg focus:outline-none focus:border-[#D4AF37] text-[#F5F1E6] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-medium file:bg-[#D4AF37] file:text-[#0A0A0A] hover:file:bg-[#b88c41]"
                />
                <p className="text-sm text-[#e3dcd4]/80 mt-1">
                  Supported formats: MP4, WebM, MOV, AVI (Max size: 100MB)
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-[#D4AF37] hover:bg-[#b88c41] text-[#0A0A0A] py-3 rounded-lg font-suisse-intl-mono text-sm uppercase tracking-wider transition-all duration-300 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingEvent ? 'Update Event' : 'Create Event'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 bg-[#7c4d33] hover:bg-[#31372b] text-[#F5F1E6] py-3 rounded-lg font-suisse-intl-mono text-sm uppercase tracking-wider transition-all duration-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}

      {/* Events List */}
      <AnimatedSection animation="fadeIn">
        <div className="bg-[#0A0A0A] rounded-xl border border-[#7c4d33]/40 overflow-hidden shadow-lg">
          <div className="p-6 border-b border-[#7c4d33]/30">
            <h2 className="text-[#F5F1E6] text-xl font-suisse-intl">All Events</h2>
          </div>
          
          {events.length === 0 ? (
            <div className="text-center py-12">
              <Calendar size={64} className="mx-auto text-[#e3dcd4]/60 mb-4" />
              <h3 className="text-xl font-suisse-intl text-[#F5F1E6] mb-2">No Events Found</h3>
              <p className="text-[#e3dcd4]/80">Create your first event to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs font-suisse-intl-mono uppercase text-[#e3dcd4] bg-[#0A0A0A]">
                  <tr>
                    <th className="px-6 py-3 border-b border-[#7c4d33]/30">Title</th>
                    <th className="px-6 py-3 border-b border-[#7c4d33]/30">Status</th>
                    <th className="px-6 py-3 border-b border-[#7c4d33]/30">Event Date</th>
                    <th className="px-6 py-3 border-b border-[#7c4d33]/30">Price</th>
                    <th className="px-6 py-3 border-b border-[#7c4d33]/30">Video</th>
                    <th className="px-6 py-3 border-b border-[#7c4d33]/30">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr key={event._id} className="border-b border-[#7c4d33]/30 hover:bg-[#7c4d33]/10 transition-colors duration-300">
                      <td className="px-6 py-4">
                        <div className="max-w-xs">
                          <h3 className="text-[#F5F1E6] font-suisse-intl truncate">{event.title}</h3>
                          <p className="text-[#e3dcd4]/80 text-sm mt-1 line-clamp-2">{event.description}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleActiveStatus(event._id)}
                          className={`px-3 py-1 rounded-full text-xs font-suisse-intl-mono uppercase ${
                            event.isActive 
                              ? 'bg-[#7EB47E]/20 text-[#7EB47E]' 
                              : 'bg-[#E6B05E]/20 text-[#E6B05E]'
                          }`}
                        >
                          {event.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-[#e3dcd4] font-suisse-intl">
                        {formatDate(event.eventDate)}
                      </td>
                      <td className="px-6 py-4 text-[#D4AF37] font-suisse-intl-mono">
                        ฿{event.ticketPrice?.toLocaleString() || '0'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-1 text-[#e3dcd4]">
                          <Video size={16} />
                          {event.videoPath ? 'Available' : 'No Video'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-3">
                          <button
                            onClick={() => handleEdit(event)}
                            className="px-3 py-1 text-xs font-suisse-intl-mono uppercase text-[#D4AF37] hover:text-[#b88c41] border border-[#D4AF37] hover:border-[#b88c41] rounded-full transition-colors duration-300"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(event._id)}
                            className="px-3 py-1 text-xs font-suisse-intl-mono uppercase text-[#E67373] hover:text-[#b35151] border border-[#E67373] hover:border-[#b35151] rounded-full transition-colors duration-300"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </AnimatedSection>
    </div>
  );
} 