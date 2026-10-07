import { upcomingOccurrences, type Occurrence } from './recurringEvents';
import { eventBookingPath, registrationIsOpen, type PublicEvent } from './publishedEvents';
import { SITE_URL } from './structuredData';

export function quizPath(occurrence: Occurrence): string {
  return `/quiz-sessions/${occurrence.isoWithOffset.slice(0, 10)}/`;
}

export function quizForDate(date: string): Occurrence | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const start = new Date(`${date}T00:00:00+07:00`);
  if (!Number.isFinite(start.getTime())) return null;
  const occurrence = upcomingOccurrences(1, start)[0];
  return occurrence?.isoWithOffset.slice(0, 10) === date ? occurrence : null;
}

export function quizSchema(occurrence: Occurrence, event?: PublicEvent) {
  const url = `${SITE_URL}${quizPath(occurrence)}`;
  return {
    '@context': 'https://schema.org', '@type': 'Event', '@id': `${url}#event`,
    name: 'Quiz Session at Grandma Jazz', description: occurrence.description,
    startDate: occurrence.isoWithOffset, endDate: occurrence.endIsoWithOffset,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    image: [`${SITE_URL}/images/og-image.jpg`], url,
    isAccessibleForFree: true,
    location: {
      '@type': 'Place', name: 'Grandma Jazz',
      address: {
        '@type': 'PostalAddress', streetAddress: '13/20 Moo 6',
        addressLocality: 'Kamala', addressRegion: 'Phuket', postalCode: '83150', addressCountry: 'TH',
      },
    },
    organizer: { '@type': 'Organization', '@id': `${SITE_URL}/#business`, name: 'Grandma Jazz', url: `${SITE_URL}/` },
    ...(event && (registrationIsOpen(event) || event.registration.state === 'full') ? {
      offers: { '@type': 'Offer', price: occurrence.priceTHB, priceCurrency: 'THB',
        url: `${SITE_URL}${eventBookingPath(event)}`,
        availability: event.registration.state === 'full' ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
      },
    } : {}),
  };
}
