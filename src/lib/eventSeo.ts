import type { PublicEventDetail } from './publishedEvents';
import { SITE_URL } from './structuredData';

export function publishedEventSchema(event: PublicEventDetail) {
  const url = `${SITE_URL}/events/${encodeURIComponent(event.slug)}/`;
  const cancelled = event.status === 'cancelled' || event.registration.state === 'cancelled';
  return {
    '@context': 'https://schema.org', '@type': 'Event', '@id': `${url}#event`,
    name: event.title, description: event.subtitle || undefined, url,
    startDate: event.startsAt, endDate: event.endsAt,
    eventStatus: cancelled ? 'https://schema.org/EventCancelled' : 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    image: [event.heroImagePath ? new URL(event.heroImagePath, SITE_URL).href : `${SITE_URL}/images/og-image.jpg`],
    organizer: { '@type': 'Organization', '@id': `${SITE_URL}/#business`, name: 'Grandma Jazz', url: `${SITE_URL}/` },
    ...(event.venue ? { location: {
      '@type': 'Place', name: event.venue.name,
      address: { '@type': 'PostalAddress', streetAddress: [event.venue.addressLine1, event.venue.addressLine2].filter(Boolean).join(', '), addressLocality: event.venue.city, addressCountry: event.venue.country },
    } } : {}),
    // The public API does not expose a ticket price. Do not invent offers.
  };
}
