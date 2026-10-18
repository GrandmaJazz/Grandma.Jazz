import { cache } from 'react';
import { SITE_URL } from './structuredData';

export interface GarmentsEdition {
  slug: string;
  title: string;
  issueNumber: string;
  publicationDate: string;
  cover: { image: string; thumbnail?: string; alt?: string; text?: string };
  pages?: { text?: string }[];
}

// Read the same published manifest as the magazine renderer. Drafts never enter
// metadata or the sitemap; a direct public lookup also supports archived issues.
export const getGarmentsEditions = cache(async (archive = false, slug?: string): Promise<GarmentsEdition[]> => {
  const origin = process.env.EVENTS_PLATFORM_ORIGIN || 'https://185-111-159-228.sslip.io';
  const endpoint = slug ? `/api/garments/issues/${encodeURIComponent(slug)}` : `/api/garments/issues${archive ? '?archive=1' : ''}`;
  const response = await fetch(`${origin}${endpoint}`, { cache: 'no-store', signal: AbortSignal.timeout(8000) });
  if (response.status === 404 && slug) return [];
  if (!response.ok) throw new Error(`Garments publication fetch failed: ${response.status}`);
  const data = await response.json();
  if (!Array.isArray(data?.issues)) throw new Error('Invalid Garments publication manifest');
  return data.issues.filter((issue: GarmentsEdition) =>
    typeof issue.slug === 'string' && /^[a-z0-9][a-z0-9-]*$/.test(issue.slug) &&
    typeof issue.title === 'string' && issue.title.trim() && typeof issue.cover?.image === 'string',
  );
});

export function garmentsDescription(issue?: GarmentsEdition) {
  return issue
    ? `${issue.title}. Explore edition ${issue.issueNumber || ''} of Garments: vintage, upcycled and uniquely found clothing from Grandma Jazz in Kamala, Phuket.`.replace(/\s+/g, ' ').trim()
    : 'Explore Garments magazine editions: vintage, upcycled and uniquely found clothing from Grandma Jazz in Kamala, Phuket.';
}

export function garmentsEditionSchema(issue: GarmentsEdition) {
  return {
    '@context': 'https://schema.org', '@type': 'CreativeWork',
    '@id': `${SITE_URL}/garments/${issue.slug}/#edition`,
    name: issue.title, description: garmentsDescription(issue),
    url: `${SITE_URL}/garments/${issue.slug}/`,
    image: new URL(issue.cover.image, SITE_URL).href,
    ...(issue.publicationDate && /^\d{4}-\d{2}-\d{2}$/.test(issue.publicationDate) ? { datePublished: issue.publicationDate } : {}),
    ...(issue.issueNumber ? { position: issue.issueNumber } : {}),
    publisher: { '@id': `${SITE_URL}/#business`, '@type': 'Organization', name: 'Grandma Jazz', url: `${SITE_URL}/` },
    isPartOf: { '@type': 'CreativeWorkSeries', name: 'Garments', url: `${SITE_URL}/garments/` },
  };
}
