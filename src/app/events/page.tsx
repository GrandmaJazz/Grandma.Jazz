// src/app/events/page.tsx
//
// Server-rendered. The whole page — intro copy, every upcoming night, and every
// internal link — is in the HTML on first paint, so Google sees a real page
// without executing any JavaScript. This is the fix for the /events
// "Soft 404" in Search Console.
//
// Two sources of nights, deliberately:
//
//  1. RECURRING nights come from src/lib/recurringEvents.ts, not the database.
//     A database row holds one fixed date, so the weekly Quiz Session went
//     stale the moment its date passed and the page had nothing to book. The
//     recurrence rolls forward on its own — no weekly admin, ever.
//
//  2. ONE-OFF specials come from the API's active event, but only when its
//     date is still in the future. (GET /api/events and /api/events/:id are
//     admin-only — 401 to the public — so /api/events/active is the only
//     public endpoint, and /booking/[eventId] is dead for the same reason.)
//
// Ticketing lives on Brad's system (EVENTS_BOOKING_URL); every CTA hands off
// there rather than to the dead in-house booking route.

import Link from 'next/link';
import Contact from '@/components/Contact';
import { AnimatedSection } from '@/components/AnimatedSection';
import { EVENTS_BOOKING_URL } from '@/lib/externalLinks';
import {
  upcomingOccurrences,
  formatOccurrenceDate,
  relativeLabel,
  RECURRING_SERIES,
  type Occurrence,
} from '@/lib/recurringEvents';

export const revalidate = 300;

const UPCOMING_COUNT = 4;

interface ActiveEvent {
  _id: string;
  title: string;
  description?: string;
  eventDate: string;
  eventTime?: string;
  ticketPrice?: number;
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

const SITE = 'https://www.grandmajazz.com';
// The public booking page and its offers went live with the Event schema.
const EVENT_OFFERS_VALID_FROM = '2026-09-15T20:42:28+07:00';

/**
 * The API's active event, but only if it's a genuine future one-off.
 * A past date means it's the stale weekly record, which the recurrence
 * layer now owns — showing it again would double up.
 */
async function getFutureSpecial(now: Date): Promise<ActiveEvent | null> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/events/active`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const ev: ActiveEvent | null = data?._id ? data : (data?.event ?? null);
    if (!ev || ev.isActive === false || !ev.eventDate) return null;

    const when = new Date(ev.eventDate);
    if (Number.isNaN(when.getTime())) return null;
    // Give it the whole day — an event dated today is still on.
    if (when.getTime() + 24 * 60 * 60 * 1000 < now.getTime()) return null;

    // Don't duplicate a recurring night that also exists as a row.
    const clashes = RECURRING_SERIES.some(
      (s) => s.title.trim().toLowerCase() === ev.title.trim().toLowerCase(),
    );
    return clashes ? null : ev;
  } catch (error) {
    console.error('Events: could not fetch the active event', error);
    return null;
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

function eventNode(opts: {
  name: string;
  description: string;
  startIso: string;
  endIso?: string;
  price: number;
  soldOut?: boolean;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: opts.name,
    description: opts.description,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    startDate: opts.startIso,
    ...(opts.endIso ? { endDate: opts.endIso } : {}),
    url: `${SITE}/events`,
    image: [`${SITE}/images/og-image.jpg`],
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
    organizer: { '@type': 'Organization', name: 'Grandma Jazz', url: SITE },
    performer: {
      '@type': 'PerformingGroup',
      name: 'Grandma Jazz',
    },
    offers: {
      '@type': 'Offer',
      price: opts.price,
      priceCurrency: 'THB',
      validFrom: EVENT_OFFERS_VALID_FROM,
      availability: opts.soldOut
        ? 'https://schema.org/SoldOut'
        : 'https://schema.org/InStock',
      url: EVENTS_BOOKING_URL,
    },
  };
}

const breadcrumbJsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: SITE },
    { '@type': 'ListItem', position: 2, name: 'Events', item: `${SITE}/events` },
  ],
});

/* ------------------------------- card ---------------------------------- */

function NightCard({
  title,
  when,
  time,
  location,
  description,
  price,
  badge,
}: {
  title: string;
  when: string;
  time?: string;
  location: string;
  description?: string;
  price: number;
  badge?: string;
}) {
  return (
    <div className="bg-[#181818]/80 backdrop-blur-sm border border-[#B49B73]/20 rounded-box p-6 sm:p-8 hover:border-[#B49B73]/50 transition-colors duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <h3 className="text-2xl font-editorial-ultralight text-[#e3dcd4]">{title}</h3>
            {badge && (
              <span className="font-label-mono text-[10px] uppercase tracking-[0.2em] text-[#B49B73] border border-[#B49B73]/40 rounded-full px-2.5 py-1">
                {badge}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#e3dcd4]/70 font-roboto-light">
            <span className="inline-flex items-center gap-1.5">
              <CalendarIcon /> {when}
            </span>
            {time && (
              <span className="inline-flex items-center gap-1.5">
                <ClockIcon /> {time}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <PinIcon /> {location}
            </span>
          </div>
          {description && (
            <p className="text-[#e3dcd4]/60 font-roboto-light text-sm mt-3 whitespace-pre-line">
              {description}
            </p>
          )}
        </div>
        <div className="flex flex-col items-start sm:items-end gap-3 shrink-0">
          <span className="text-[#B49B73] font-roboto-light">
            {price > 0 ? `฿${price}` : 'Free'}
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
  );
}

/* ------------------------------- page ---------------------------------- */

export default async function EventsPage() {
  const now = new Date();
  const occurrences: Occurrence[] = upcomingOccurrences(UPCOMING_COUNT, now).slice(
    0,
    UPCOMING_COUNT,
  );
  const special = await getFutureSpecial(now);

  const jsonLd = [
    ...occurrences.map((o) =>
      eventNode({
        name: o.title,
        description: o.description,
        startIso: o.isoWithOffset,
        endIso: o.endIsoWithOffset,
        price: o.priceTHB,
      }),
    ),
    ...(special
      ? [
          eventNode({
            name: special.title,
            description: special.description?.trim() || special.title,
            startIso: `${special.eventDate.slice(0, 10)}${special.eventTime ? `T${special.eventTime}:00+07:00` : ''}`,
            price: special.ticketPrice ?? 0,
            soldOut: special.isSoldOut === true,
          }),
        ]
      : []),
  ];

  return (
    <>
      {jsonLd.map((node, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(node) }}
        />
      ))}
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
                Our <strong className="text-[#e3dcd4]">Quiz Session runs every Saturday at 4.20pm</strong> and
                it&apos;s free to join — music, general knowledge, cannabis culture, and sponsored
                prizes. Seating is limited, so reserve ahead. Your ticket lands straight in Apple
                Wallet; just show it at the door.
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
              <h2 className="font-label-mono text-[10px] uppercase tracking-[0.32em] text-[#e3dcd4]/45 mb-6">
                Upcoming nights
              </h2>
              <div className="grid gap-5 sm:gap-6">
                {special && (
                  <NightCard
                    title={special.title}
                    when={new Date(special.eventDate).toLocaleDateString('en-GB', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      timeZone: 'Asia/Bangkok',
                    })}
                    time={special.eventTime}
                    location="Grandma Jazz, Kamala, Phuket"
                    description={special.description?.trim()}
                    price={special.ticketPrice ?? 0}
                    badge="Special"
                  />
                )}
                {occurrences.map((o, i) => (
                  <NightCard
                    key={`${o.seriesId}-${o.isoWithOffset}`}
                    title={o.title}
                    when={formatOccurrenceDate(o.start)}
                    time={o.isoWithOffset.slice(11, 16)}
                    location={o.location}
                    description={i === 0 ? o.description : undefined}
                    price={o.priceTHB}
                    badge={i === 0 ? relativeLabel(o.start, now) || 'Next' : undefined}
                  />
                ))}
              </div>
              <p className="text-[#e3dcd4]/40 font-roboto-light text-sm mt-6">
                Private bookings and one-off nights — message us on WhatsApp or Instagram, the
                details are just below.
              </p>
            </AnimatedSection>
          </div>
        </div>
      </div>
      <Contact />
    </>
  );
}
