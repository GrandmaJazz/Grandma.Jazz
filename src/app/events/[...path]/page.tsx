import PlatformPublicationFrame from '@/components/PlatformPublicationFrame';
import { getPublishedEvent } from '@/lib/publishedEvents';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { publishedEventSchema } from '@/lib/eventSeo';
import { SITE_URL, serializeJsonLd } from '@/lib/structuredData';
import { eventRoute } from '@/lib/publicationRoutes';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ path: string[] }> };
async function details(params: Props['params']) {
  const { path } = await params;
  const route = eventRoute(path);
  if (!route) notFound();
  const event = await getPublishedEvent(route.slug);
  if (!event) notFound();
  return { route, event };
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { route, event } = await details(params);
  return {
    title: event.title, description: event.subtitle || 'Events and gatherings at Grandma Jazz, Kamala, Phuket.',
    alternates: { canonical: route.canonical },
    openGraph: { title: event.title, description: event.subtitle || 'Events and gatherings at Grandma Jazz, Kamala, Phuket.', url: `${SITE_URL}${route.canonical}`, type: 'website', images: [event.heroImagePath || '/images/og-image.jpg'] },
    twitter: { card: 'summary_large_image', title: event.title, description: event.subtitle || 'Events and gatherings at Grandma Jazz, Kamala, Phuket.', images: [event.heroImagePath || '/images/og-image.jpg'] },
    // Reservation forms are steps within an event, not additional search pages.
    ...(route.registration ? { robots: { index: false, follow: true } } : {}),
  };
}
export default async function EventPublication({ params }: Props) {
  const { route, event } = await details(params);
  return <>{!route.registration && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(publishedEventSchema(event)) }} />}{event && <div className="sr-only"><h1>{event.title}</h1><p>{event.subtitle}</p><time dateTime={event.startsAt}>{event.startsAt}</time><p>{event.venueName || 'Grandma Jazz, Kamala, Phuket'}</p></div>}<PlatformPublicationFrame section="events" /></>;
}
