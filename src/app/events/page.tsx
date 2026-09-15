// src/app/events/page.tsx
//
// Server-rendered. The whole page — intro copy, the live event, and every
// internal link — is in the HTML on first paint, so Google sees a real page
// without executing any JavaScript. This is the fix for the /events
// "Soft 404" in Search Console.
//
// Note on the data source: GET /api/events and GET /api/events/:id are both
// admin-only (401 to the public), so the old client-side fetch of /api/events
// ALWAYS failed and every visitor saw the empty state. The only public
// endpoint is /api/events/active, which returns the current live event.
// Ticketing itself lives on Brad's system (EVENTS_BOOKING_URL), so the CTA
// hands off there rather than to the dead in-house /booking route.

import Link from 'next/link';
import Contact from '@/components/Contact';
import { AnimatedSection } from '@/components/AnimatedSection';
import { EVENTS_BOOKING_URL } from '@/lib/externalLinks';

export const revalidate = 300;

interface ActiveEvent {
  _id: string;
  title: string;
  description?: string;
  eventDate: string;
  eventTime?: string;
  ticketPrice?: number;
  availableTickets?: number;
  isSoldOut?: boolean;
  isActive?: boolean;
}

const VENUE = {
  name: 'Grandma Jazz',
  street: '13, 20 Moo 6',
  locality: 'Kamala',
  region: 'Phuket',
  postcode: '83150',
  country: 'TH',
} as const;

async function getActiveEvent(): Promise<ActiveEvent | null> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/events/active`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const ev: ActiveEvent | null = data?._id ? data : (data?.event ?? null);
    if (!ev || ev.isActive === false) return null;
    return ev;
  } catch (error) {
    console.error('Events: could not fetch the active event', error);
    return null;
  }
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Bangkok',
    });
  } catch {
    return dateStr;
  }
}

/* Inline icons — kept inline so this page stays a pure server component. */
const ICON = 'inline-block align-[-2px] text-[#B49B73]';

const CalendarIcon = () => (
  <svg className={ICON} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M8 2v4M16 2v4M3 10h18" /><rect x="3" y="4" width="18" height="18" rx="2" />
  </svg>
);

const ClockIcon = () => (
  <svg className={ICON} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
  </svg>
);

const PinIcon = () => (
  <svg className={ICON} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
  </svg>
);

const TicketIcon = () => (
  <svg className="mx-auto text-[#B49B73] mb-4" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" /><path d="M13 5v14" strokeDasharray="2 3" />
  </svg>
);

function eventJsonLd(ev: ActiveEvent | null) {
  const base = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: ev?.title ?? 'Live nights at Grandma Jazz',
    description:
      ev?.description?.trim() ||
      'Live music, vinyl and jazz sessions, quiz nights and community gatherings at Grandma Jazz, a plastic-free cannabis and coffee café in Kamala, Phuket.',
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    startDate: ev?.eventDate
      ? `${ev.eventDate.slice(0, 10)}${ev.eventTime ? `T${ev.eventTime}:00+07:00` : ''}`
      : undefined,
    url: 'https://www.grandmajazz.com/events',
    image: ['https://www.grandmajazz.com/images/og-image.jpg'],
    location: {
      '@type': 'Place',
      name: VENUE.name,
      address: {
        '@type': 'PostalAddress',
        streetAddress: VENUE.street,
        addressLocality: VENUE.locality,
        addressRegion: VENUE.region,
        postalCode: VENUE.postcode,
        addressCountry: VENUE.country,
      },
    },
    organizer: {
      '@type': 'Organization',
      name: 'Grandma Jazz',
      url: 'https://www.grandmajazz.com',
    },
    offers: {
      '@type': 'Offer',
      price: ev?.ticketPrice && ev.ticketPrice > 0 ? ev.ticketPrice : 0,
      priceCurrency: 'THB',
      availability:
        ev?.isSoldOut === true
          ? 'https://schema.org/SoldOut'
          : 'https://schema.org/InStock',
      url: EVENTS_BOOKING_URL,
    },
  };
  return JSON.stringify(base);
}

const breadcrumbJsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.grandmajazz.com' },
    { '@type': 'ListItem', position: 2, name: 'Events', item: 'https://www.grandmajazz.com/events' },
  ],
});

export default async function EventsPage() {
  const ev = await getActiveEvent();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: eventJsonLd(ev) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd }}
      />

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

          <AnimatedSection animation="fadeIn">
            <div className="max-w-3xl mx-auto mb-14 text-[#e3dcd4]/75 font-roboto-light space-y-4 leading-relaxed">
              <p>
                Grandma Jazz is a plastic-free cannabis and coffee café tucked into the hills of
                Kamala, Phuket. Most weeks we host a rotating line-up of <strong className="text-[#e3dcd4]">live
                music nights</strong>, <strong className="text-[#e3dcd4]">vinyl and jazz sessions</strong>,
                <strong className="text-[#e3dcd4]"> quiz nights</strong>, and relaxed
                <strong className="text-[#e3dcd4]"> community gatherings</strong> — good coffee, good
                company, and a warm, unhurried atmosphere under the trees.
              </p>
              <p>
                Nights usually run in the evening at our café on the Kamala hillside. Some events are
                free to join; ticketed nights are simple to reserve online, and your ticket lands
                straight in Apple Wallet — just show it at the door. Seating is limited, so we
                recommend booking ahead for the popular nights.
              </p>
              <p>
                New to us? Our{' '}
                <Link href="/blogs/visiting-grandma-jazz-a-guide-to-finding-us/" className="text-[#B49B73] underline underline-offset-4 hover:text-[#e3dcd4] transition-colors duration-200">
                  guide to finding us
                </Link>{' '}
                covers how to get up the hill, and the{' '}
                <Link href="/blogs/" className="text-[#B49B73] underline underline-offset-4 hover:text-[#e3dcd4] transition-colors duration-200">
                  journal
                </Link>{' '}
                explains why we do things the way we do. You can also browse the{' '}
                <Link href="/products/" className="text-[#B49B73] underline underline-offset-4 hover:text-[#e3dcd4] transition-colors duration-200">
                  shop
                </Link>{' '}
                or join the{' '}
                <Link href="/family/" className="text-[#B49B73] underline underline-offset-4 hover:text-[#e3dcd4] transition-colors duration-200">
                  Grandma Jazz family
                </Link>
                . For private bookings, the contact details are at the bottom of this page.
              </p>
            </div>
          </AnimatedSection>

          <div className="max-w-4xl mx-auto">
            <AnimatedSection animation="fadeIn">
              {ev ? (
                <div className="bg-[#181818]/80 backdrop-blur-sm border border-[#B49B73]/20 rounded-box p-6 sm:p-8 hover:border-[#B49B73]/50 transition-colors duration-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <h2 className="text-2xl font-editorial-ultralight text-[#e3dcd4] mb-3">
                        {ev.title}
                      </h2>
                      <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#e3dcd4]/70 font-roboto-light">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarIcon /> {formatDate(ev.eventDate)}
                        </span>
                        {ev.eventTime && (
                          <span className="inline-flex items-center gap-1.5">
                            <ClockIcon /> {ev.eventTime}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1.5">
                          <PinIcon /> Grandma Jazz, Kamala, Phuket
                        </span>
                      </div>
                      {ev.description && (
                        <p className="text-[#e3dcd4]/60 font-roboto-light text-sm mt-3 whitespace-pre-line">
                          {ev.description.trim()}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-start sm:items-end gap-3 shrink-0">
                      <span className="text-[#B49B73] font-roboto-light">
                        {ev.ticketPrice && ev.ticketPrice > 0 ? `฿${ev.ticketPrice}` : 'Free'}
                      </span>
                      <a
                        href={EVENTS_BOOKING_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-[#B49B73] hover:bg-[#A98D60] text-[#0A0A0A] px-6 py-2.5 rounded-full font-roboto uppercase tracking-wider text-sm transition-all duration-200 ease-out hover:-translate-y-px active:translate-y-0 active:scale-[0.97]"
                      >
                        Reserve
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center bg-[#181818]/80 border border-[#B49B73]/20 rounded-box p-10">
                  <TicketIcon />
                  <p className="text-[#e3dcd4] font-roboto-light">
                    No dates on the calendar right now.
                  </p>
                  <p className="text-[#e3dcd4]/50 font-roboto-light text-sm mt-1">
                    New nights are added regularly — check back soon, or follow us on Instagram for
                    announcements.
                  </p>
                </div>
              )}
            </AnimatedSection>
          </div>
        </div>
      </div>
      <Contact />
    </>
  );
}
