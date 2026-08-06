// src/app/events/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Clock, Ticket } from 'lucide-react';
import { Footer } from '@/components/Footer';
import { AnimatedSection } from '@/components/AnimatedSection';

interface EventItem {
  _id: string;
  title: string;
  description?: string;
  eventDate: string;
  eventTime?: string;
  ticketPrice?: number;
  location?: string;
  availableTickets?: number;
  isActive?: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/events`, { cache: 'no-store' });
        const data = await res.json();
        const list: EventItem[] = Array.isArray(data) ? data : (data.events ?? data.data ?? []);
        setEvents(list.filter((e) => e.isActive !== false));
      } catch {
        setEvents([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <>
      <div className="min-h-screen pt-28 pb-16 bg-[#181818] relative overflow-hidden">
        <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[640px] h-[640px] rounded-full bg-[#B49B73]/10 blur-3xl" />

        <div className="container mx-auto px-4 relative">
          <AnimatedSection animation="fadeIn">
            <div className="max-w-2xl mx-auto text-center mb-12">
              <p className="uppercase tracking-[0.25em] text-[#B49B73] text-xs sm:text-sm font-roboto-light mb-4">
                Events
              </p>
              <h1 className="text-4xl sm:text-5xl font-editorial-ultralight text-[#e3dcd4] mb-4">
                Live nights at Grandma Jazz
              </h1>
              <p className="text-[#e3dcd4]/70 font-roboto-light">
                Music, quiz sessions, and gatherings in the hills of Kamala, Phuket.
                Reserve your place — your ticket lands straight in Apple Wallet.
              </p>
            </div>
          </AnimatedSection>

          <div className="max-w-4xl mx-auto">
            {loading ? (
              <p className="text-center text-[#e3dcd4]/40 font-roboto-light">Loading events…</p>
            ) : events.length === 0 ? (
              <div className="text-center bg-[#141414]/80 border border-[#B49B73]/20 rounded-3xl p-10">
                <Ticket className="mx-auto text-[#B49B73] mb-4" size={40} />
                <p className="text-[#e3dcd4] font-roboto-light">No events on the calendar right now.</p>
                <p className="text-[#e3dcd4]/50 font-roboto-light text-sm mt-1">Check back soon — or follow us on Instagram.</p>
              </div>
            ) : (
              <div className="grid gap-5 sm:gap-6">
                {events.map((ev, i) => (
                  <motion.div
                    key={ev._id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: Math.min(i * 0.05, 0.4) }}
                    className="bg-[#141414]/80 backdrop-blur-sm border border-[#B49B73]/20 rounded-3xl p-6 sm:p-8 hover:border-[#B49B73]/50 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1">
                        <h2 className="text-2xl font-editorial-ultralight text-[#e3dcd4] mb-3">{ev.title}</h2>
                        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#e3dcd4]/70 font-roboto-light">
                          <span className="inline-flex items-center gap-1.5">
                            <Calendar size={15} className="text-[#B49B73]" /> {formatDate(ev.eventDate)}
                          </span>
                          {ev.eventTime && (
                            <span className="inline-flex items-center gap-1.5">
                              <Clock size={15} className="text-[#B49B73]" /> {ev.eventTime}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin size={15} className="text-[#B49B73]" /> {ev.location || 'Grandma Jazz, Kamala'}
                          </span>
                        </div>
                        {ev.description && (
                          <p className="text-[#e3dcd4]/60 font-roboto-light text-sm mt-3 line-clamp-2">{ev.description}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-start sm:items-end gap-3">
                        <span className="text-[#B49B73] font-roboto-light">
                          {ev.ticketPrice && ev.ticketPrice > 0 ? `฿${ev.ticketPrice}` : 'Free'}
                        </span>
                        <Link
                          href={`/booking/${ev._id}`}
                          className="inline-flex items-center gap-2 bg-[#B49B73] hover:bg-[#A98D60] text-[#0A0A0A] px-6 py-2.5 rounded-full font-roboto uppercase tracking-wider text-sm transition-all duration-300"
                        >
                          Reserve
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
