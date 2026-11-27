import { analogAnnouncement as event } from './eventAnnouncements';

export const analogEventUrl = 'https://www.grandmajazz.com/events/analog-by-beycan-001/';
export const analogMapUrl = 'https://www.google.com/maps/search/?api=1&query=7.943122400000001%2C98.2781763&query_place_id=ChIJ3TSF6sk7UDARzQs68sOWa7s';
export const analogInstagramUrl = 'https://instagram.com/beycanmusic';
const calendarStamp = (date: string) => new Date(date).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
const dates = `${calendarStamp(event.startsAt)}/${calendarStamp(event.endsAt)}`;

export const analogGoogleCalendarUrl = `https://calendar.google.com/calendar/render?${new URLSearchParams({
  action: 'TEMPLATE', text: event.title, dates, ctz: event.timezone,
  location: 'Grandma Jazz, Kamala, Phuket, Thailand',
  details: `Coming soon. Saving this date does not reserve a place.\n${analogEventUrl}`,
})}`;

/** Public save-the-date only: no attendee, RSVP, reminder or ticket confirmation. */
export function analogCalendar(): string {
  // All values are fixed announcement content; each UTF-8 line is below 75 octets.
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0',
    'PRODID:-//Grandma Jazz//ANALOG Announcement//EN',
    'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
    'UID:analog-by-beycan-001-announcement@grandmajazz.com',
    'DTSTAMP:20261127T110000Z',
    `DTSTART:${calendarStamp(event.startsAt)}`,
    `DTEND:${calendarStamp(event.endsAt)}`,
    `SUMMARY:${event.title}`,
    'LOCATION:Grandma Jazz\\, Kamala\\, Phuket\\, Thailand',
    'DESCRIPTION:Coming soon. Saving this date does not reserve a place.',
    `URL:${analogEventUrl}`, 'STATUS:TENTATIVE', 'END:VEVENT', 'END:VCALENDAR', '',
  ].join('\r\n');
}

type ShareApi = {
  share?: (data: { title: string; text: string; url: string }) => Promise<void>;
  clipboard?: { writeText: (text: string) => Promise<void> };
};

/** Cancellation never copies or sends anything through a different channel. */
export async function shareAnalogEvent(api: ShareApi): Promise<'shared' | 'copied' | 'cancelled' | 'unavailable'> {
  if (api.share) {
    try {
      await api.share({ title: event.title, text: '12 December · 18:30–21:30 · Grandma Jazz. Reservations coming soon.', url: analogEventUrl });
      return 'shared';
    } catch (error) {
      if ((error as { name?: string })?.name === 'AbortError') return 'cancelled';
    }
  }
  try {
    if (!api.clipboard) return 'unavailable';
    await api.clipboard.writeText(analogEventUrl);
    return 'copied';
  } catch {
    return 'unavailable';
  }
}
