// src/app/events/page.tsx
//
// Server-rendered. The whole page — intro copy, every upcoming night, and every
// internal link — is in the HTML on first paint, so Google sees a real page
// without executing any JavaScript. This is the fix for the /events
// "Soft 404" in Search Console.
//
// Two sources of nights:
//
//  1. RECURRING nights come from src/lib/recurringEvents.ts, not the database.
//     A database row holds one fixed date, so the weekly Quiz Session went
//     stale the moment its date passed and the page had nothing to book. The
//     recurrence rolls forward on its own — no weekly admin, ever.
//
//  2. Published events come from the independent events database. Each date
//     links to its registration page on this same domain.

import Link from 'next/link';
import Contact from '@/components/Contact';
import { quizPath } from '@/lib/quizSeo';
import { getPublishedEvents, publishedQuiz, registrationIsOpen } from '@/lib/publishedEvents';
import { serializeJsonLd } from '@/lib/structuredData';
import { AnimatedSection } from '@/components/AnimatedSection';
import {
  upcomingOccurrences,
  formatOccurrenceDate,
  relativeLabel,
  type Occurrence,
} from '@/lib/recurringEvents';

// An admin can publish at any time; the public list must reflect it immediately.
export const dynamic = 'force-dynamic';

const UPCOMING_COUNT = 4;

const SITE = 'https://www.grandmajazz.com';

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

const breadcrumbJsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: SITE },
    { '@type': 'ListItem', position: 2, name: 'Events', item: `${SITE}/events/` },
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
  href,
}: {
  title: string;
  when: string;
  time?: string;
  location: string;
  description?: string;
  price: number;
  badge?: string;
  href?: string;
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
          {href ? <Link
            href={href}
            className="gj-cta"
          >
            View event
          </Link> : <span className="text-[#e3dcd4]/50 text-xs uppercase tracking-widest">Booking details coming soon</span>}
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
  const published = await getPublishedEvents();
  const bookable = published.some((event) =>
    new Date(event.startsAt) > now && registrationIsOpen(event),
  );

  // The overview links to single-event pages; Event markup belongs there.
  const entries = [
    ...occurrences.map(o => ({ name: o.title, url: `${SITE}${quizPath(o)}` })),
    ...published.filter(event => new Date(event.startsAt) > now).map(event => ({
      name: event.title, url: `${SITE}/events/${event.slug}/`,
    })),
  ];
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'ItemList',
    name: 'Upcoming sessions at Grandma Jazz',
    itemListElement: entries.map((entry, index) => ({ '@type': 'ListItem', position: index + 1, ...entry })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
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
              <h1 className="gj-display-title mb-4">
                Quiz sessions & gatherings at Grandma Jazz
              </h1>
              <p className="text-[#e3dcd4]/70 font-roboto-light">
                Free quiz sessions every Saturday at 4:20 pm in the hills of Kamala, Phuket.
                {bookable
                  ? ' Reserve your place and add your ticket to Apple Wallet.'
                  : ' Booking details will appear here when the next dates are published.'}
              </p>
            </div>
          </AnimatedSection>

          <AnimatedSection animation="fadeIn">
            <div className="max-w-3xl mx-auto mb-14 text-[#e3dcd4]/75 font-roboto-light space-y-4 leading-relaxed">
              <p>
                Grandma Jazz is a plastic-free cannabis and coffee café tucked into the hills of
                Kamala, Phuket. Our main weekly gathering is the <strong className="text-[#e3dcd4]">Saturday
                Quiz Session</strong> — good coffee, good company, and a warm, unhurried atmosphere.
                Live music and DJ sessions happen occasionally; check the published dates below
                for confirmed performances.
              </p>
              <p>
                Our <strong className="text-[#e3dcd4]">Quiz Session runs every Saturday at 4:20 pm</strong> and
                it&apos;s free to join — music, general knowledge, cannabis culture, and sponsored
                prizes. Seating is limited; published dates above have their own reservation pages
                and Apple Wallet tickets.
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
                Published events and upcoming nights
              </h2>
              <div className="grid gap-5 sm:gap-6">
                {published.map((event) => (
                  <NightCard
                    key={event.slug}
                    title={event.title}
                    when={new Date(event.startsAt).toLocaleDateString('en-GB', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      timeZone: event.timezone,
                    })}
                    time={new Date(event.startsAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: event.timezone })}
                    location={event.venueName || 'Grandma Jazz, Kamala, Phuket'}
                    description={event.subtitle || undefined}
                    price={0}
                    badge={new Date(event.startsAt) < now ? 'Past date' : event.registration.state === 'full' ? 'Fully booked' : event.registration.state === 'closed' ? 'Booking closed' : 'Booking open'}
                    href={`/events/${event.slug}/`}
                  />
                ))}
                {occurrences.filter((o) => !publishedQuiz(o, published)).map((o, i) => (
                  <NightCard
                    key={`${o.seriesId}-${o.isoWithOffset}`}
                    title={o.title}
                    when={formatOccurrenceDate(o.start)}
                    time={o.isoWithOffset.slice(11, 16)}
                    location={o.location}
                    description={i === 0 ? o.description : undefined}
                    price={o.priceTHB}
                    href={quizPath(o)}
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
