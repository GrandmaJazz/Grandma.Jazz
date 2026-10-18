import PlatformPublicationFrame from '@/components/PlatformPublicationFrame';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getGarmentsEditions, garmentsDescription, garmentsEditionSchema } from '@/lib/garmentsSeo';
import { garmentsRoute } from '@/lib/publicationRoutes';
import { SITE_URL, serializeJsonLd } from '@/lib/structuredData';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ path?: string[] }> };

async function publication(params: Props['params']) {
  const { path } = await params;
  const route = garmentsRoute(path);
  if (!route) notFound();
  const editions = await getGarmentsEditions(route.archive, route.slug || undefined);
  const edition = route.slug ? editions.find(issue => issue.slug === route.slug) : undefined;
  if (route.slug && !edition) notFound();
  return { route, editions, edition };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { route, edition } = await publication(params);
  const title = edition ? `${edition.title} — Garments` : route.archive ? 'Garments Archive' : 'Garments';
  const description = garmentsDescription(edition);
  const url = `${SITE_URL}${route.canonical}`;
  return {
    title, description, alternates: { canonical: url },
    openGraph: { title: `${title} | Grandma Jazz`, description, url, type: 'website', images: [{ url: edition?.cover.image || '/images/og-image.jpg', alt: edition?.cover.alt || title }] },
    twitter: { card: 'summary_large_image', title, description, images: [edition?.cover.image || '/images/og-image.jpg'] },
    // Set the surrounding Safari tab icon; the reader's iframe cannot change it.
    icons: {
      icon: [
        { url: '/icons/garments-g-32-v2.png', sizes: '32x32', type: 'image/png' },
        { url: '/icons/garments-g-192-v2.png', sizes: '192x192', type: 'image/png' },
      ],
      shortcut: '/icons/garments-g-32-v2.png',
      apple: [{ url: '/icons/garments-g-180-v2.png', sizes: '180x180', type: 'image/png' }],
    },
  };
}

export default async function GarmentsPublication({ params }: Props) {
  const { route, editions, edition } = await publication(params);
  const schema = edition ? garmentsEditionSchema(edition) : {
    '@context': 'https://schema.org', '@type': 'CollectionPage',
    name: route.archive ? 'Garments Archive' : 'Garments',
    url: `${SITE_URL}${route.canonical}`, description: garmentsDescription(),
    mainEntity: { '@type': 'ItemList', itemListElement: editions.map((issue, index) => ({
      '@type': 'ListItem', position: index + 1, name: issue.title, url: `${SITE_URL}/garments/${issue.slug}/`,
    })) },
  };
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(schema) }} />
    {/* The canvas reader displays these same editions visually. Keep its public
        titles and links available to assistive technology and HTML crawlers. */}
    <section className="sr-only focus-within:not-sr-only focus-within:absolute focus-within:z-50 focus-within:bg-black focus-within:p-6" aria-label="Garments publication details">
      <h1>{edition?.title || (route.archive ? 'Garments Archive' : 'Garments — vintage, upcycled and uniquely found')}</h1>
      <p>{garmentsDescription(edition)}</p>
      {edition ? <>
        {edition.publicationDate && <p>Published <time dateTime={edition.publicationDate}>{edition.publicationDate}</time></p>}
        {[edition.cover, ...(edition.pages || [])].map((page, index) => page.text ? <p key={index}>{page.text}</p> : null)}
      </> : <nav aria-label="Garments editions"><ul>{editions.map(issue => <li key={issue.slug}><Link href={`/garments/${issue.slug}/`}>{issue.title}</Link></li>)}</ul></nav>}
      <nav aria-label="Explore Grandma Jazz">
        <Link href="/garments/">Garments newsstand</Link>{' · '}
        <Link href="/garments/archive/">Earlier editions</Link>{' · '}
        <Link href="/products/">Shop Grandma Jazz</Link>{' · '}
        <Link href="/visit/">Visit us in Kamala, Phuket</Link>
      </nav>
    </section>
    <PlatformPublicationFrame section="garments" />
  </>;
}
