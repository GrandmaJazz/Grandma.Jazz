import { analogCalendar } from '@/lib/eventAnnouncementTools';

export function GET() {
  return new Response(analogCalendar(), { headers: {
    'Content-Type': 'text/calendar; charset=utf-8',
    'Content-Disposition': 'attachment; filename="analog-by-beycan-001.ics"',
    'Cache-Control': 'public, max-age=300',
    'X-Content-Type-Options': 'nosniff',
    'X-Robots-Tag': 'noindex',
  } });
}
