import { publishedQuiz, type PublicEvent } from './publishedEvents';
import { formatOccurrenceDate, relativeLabel, type Occurrence } from './recurringEvents';
import { quizPath } from './quizSeo';

const registrationLabels: Record<string, string> = {
  open: 'Booking open', limited: 'Few places left', full: 'Fully booked',
  closed: 'Booking closed', not_yet_open: 'Booking opens soon', cancelled: 'Cancelled',
};

/** End times decide when an event moves to the archive, in every visitor timezone. */
export function buildEventListing(published: PublicEvent[], occurrences: Occurrence[], now = new Date()) {
  const cards = published.map((event: PublicEvent & { inviteOnly?: boolean; ticketPriceMinor?: number | null; announcement?: boolean }) => {
    // Until the events backend migration is released, the existing Ferry Christmas
    // record has no price/invitation fields. Never advertise it as free.
    const ferry = event.slug === 'ferry-christmas';
    const inviteOnly = event.inviteOnly ?? ferry;
    const price = typeof event.ticketPriceMinor === 'number' && event.ticketPriceMinor > 0 ? event.ticketPriceMinor / 100 : ferry ? 2000 : 0;
    return ({
    title: event.title,
    start: Date.parse(event.startsAt),
    end: Date.parse(event.endsAt),
    when: new Date(event.startsAt).toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: event.timezone,
    }),
    time: new Date(event.startsAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: event.timezone }),
    location: event.venueName || 'Grandma Jazz, Kamala, Phuket',
    description: event.subtitle || undefined,
    price,
    heroImagePath: event.heroImagePath || undefined,
    heroImageAlt: event.heroImageAlt || event.title,
    badge: Date.parse(event.endsAt) <= now.getTime() ? 'Past event'
      : event.announcement ? 'Coming soon' : inviteOnly ? 'Invitation only' : registrationLabels[event.registration.state] || 'View details',
    href: `/events/${encodeURIComponent(event.slug)}/`,
  }); });
  for (const occurrence of occurrences) {
    if (publishedQuiz(occurrence, published)) continue;
    cards.push({
      title: occurrence.title, start: occurrence.start.getTime(), end: occurrence.end.getTime(),
      when: formatOccurrenceDate(occurrence.start), time: occurrence.isoWithOffset.slice(11, 16),
      location: occurrence.location, description: occurrence.description, price: occurrence.priceTHB,
      heroImagePath: undefined, heroImageAlt: occurrence.title,
      badge: relativeLabel(occurrence.start, now) || 'Upcoming', href: quizPath(occurrence),
    });
  }
  return {
    upcoming: cards.filter(event => event.end > now.getTime()).sort((a, b) => a.start - b.start),
    past: cards.filter(event => event.end <= now.getTime()).sort((a, b) => b.start - a.start),
  };
}
