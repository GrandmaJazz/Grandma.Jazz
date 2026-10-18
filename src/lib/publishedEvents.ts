import type { Occurrence } from './recurringEvents';

export interface PublicEvent {
  slug: string;
  title: string;
  subtitle?: string | null;
  startsAt: string;
  endsAt: string;
  timezone: string;
  venueName?: string | null;
  registration: { state: string };
}

export async function getPublishedEvents(strict = false): Promise<PublicEvent[]> {
  try {
    const origin = process.env.EVENTS_PLATFORM_ORIGIN || 'https://185-111-159-228.sslip.io';
    const response = await fetch(`${origin}/events/api/v1/events`, {
      cache: 'no-store', signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`Published event fetch failed: ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data?.events)) throw new Error('Invalid published event list');
    return data.events;
  } catch (error) {
    if (strict) throw error;
    console.error('Events: could not fetch published events', error);
    return [];
  }
}

/** Match the actual quiz at the same instant, never another event on that day. */
export function publishedQuiz(occurrence: Occurrence, events: PublicEvent[]): PublicEvent | undefined {
  return events.find(event =>
    /\bquiz\b/i.test(event.title) &&
    Date.parse(event.startsAt) === occurrence.start.getTime(),
  );
}

export function registrationIsOpen(event: PublicEvent): boolean {
  return event.registration.state === 'open' || event.registration.state === 'limited';
}

export function eventBookingPath(event: PublicEvent): string {
  return `/events/${encodeURIComponent(event.slug)}/register/`;
}
