import type { PublicEvent } from './publishedEvents';

// Announcement only. Keep the corresponding booking record in draft until
// Family enforcement and paid reservation acceptance are released and verified.
export const analogAnnouncement = {
  slug: 'analog-by-beycan-001',
  title: 'ANALOG by BEYCAN — 001',
  subtitle: 'Coming soon — vinyl listening, a curated record corner and 20 places. ฿420 including a welcome drink.',
  startsAt: '2026-12-12T18:30:00+07:00',
  endsAt: '2026-12-12T21:30:00+07:00',
  timezone: 'Asia/Bangkok',
  venueName: 'Grandma Jazz, Kamala, Phuket',
  heroImagePath: '/events/uploads/85149af1c6f6f7a888ca684837766967.webp',
  heroImageAlt: 'ANALOG by BEYCAN — 001',
  registration: { state: 'closed' },
  ticketPriceMinor: 42000,
  announcement: true,
} satisfies PublicEvent & { ticketPriceMinor: number; announcement: boolean };

/** One listing per session, including when the bookable event is later released. */
export function withEventAnnouncements(published: PublicEvent[]): PublicEvent[] {
  return published.some(event => event.slug === analogAnnouncement.slug)
    ? published
    : [...published, analogAnnouncement];
}
