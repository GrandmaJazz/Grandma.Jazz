import PlatformPublicationFrame from '@/components/PlatformPublicationFrame';
import { getPublishedEvents } from '@/lib/publishedEvents';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ path: string[] }> };
async function details(params: Props['params']) { const { path } = await params; return { path, event: (await getPublishedEvents()).find(event => event.slug === path[0]) }; }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { path, event } = await details(params);
  return { title: event?.title || 'Event details', description: event?.subtitle || 'Events and gatherings at Grandma Jazz, Kamala, Phuket.', alternates: { canonical: `/events/${path.map(encodeURIComponent).join('/')}/` } };
}
export default async function EventPublication({ params }: Props) {
  const { event } = await details(params);
  return <>{event && <div className="sr-only"><h1>{event.title}</h1><p>{event.subtitle}</p><time dateTime={event.startsAt}>{event.startsAt}</time><p>{event.venueName || 'Grandma Jazz, Kamala, Phuket'}</p></div>}<PlatformPublicationFrame section="events" /></>;
}
