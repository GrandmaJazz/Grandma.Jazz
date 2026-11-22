import { getOptimizedImageUrl } from '@/utils/fileHelper';

// Smaller versions of the current cover artwork, keyed by its exact source URL.
// Newly uploaded or changed albums keep using their own source image.
const artwork: Record<string, string> = {
  "https://grandma-jazz-uploads.s3.ap-southeast-2.amazonaws.com/cards/75BAB9D9-1D81-4355-B2F3-B67060F7CB81-1778212325558.png": "/images/records/4ccf343a498659.webp",
  "https://grandma-jazz-uploads.s3.ap-southeast-2.amazonaws.com/cards/B39069BB-EB52-4D21-BA1E-1E5B0D3912AC-1778212276911.png": "/images/records/62b22d7cd1e4e2.webp",
  "https://grandma-jazz-uploads.s3.ap-southeast-2.amazonaws.com/cards/AADE9311-745B-4B10-8112-67950C807EE5-1778212261668.png": "/images/records/a8b97e29ae6f36.webp",
  "https://grandma-jazz-uploads.s3.ap-southeast-2.amazonaws.com/cards/8E0E98B6-269F-4958-AF2A-34CEC6BC09F5-1778212139437.png": "/images/records/e2f7c781c855de.webp",
  "https://grandma-jazz-uploads.s3.ap-southeast-2.amazonaws.com/cards/439B9568-EF0C-4EF0-A786-EC6321D36CE0-1778212030462.png": "/images/records/ffbed2540eb424.webp",
  "https://grandma-jazz-uploads.s3.ap-southeast-2.amazonaws.com/cards/C84461EC-142B-4CE8-B1B1-F3C506F8B4D3-1778211978052.png": "/images/records/965f3b262e52c6.webp"
};

export const getAlbumArtworkUrl = (source: string) => artwork[source] || getOptimizedImageUrl(source);

// Sampled from the solid ink in the current artwork. Resolve synchronously so
// picking a record adds no image download, canvas readback or reveal delay.
const artworkAccents: Record<string, string> = {
  '/images/records/4ccf343a498659.webp': '#88bce8',
  '/images/records/62b22d7cd1e4e2.webp': '#cc0478',
  '/images/records/a8b97e29ae6f36.webp': '#f2f2f2',
  '/images/records/e2f7c781c855de.webp': '#0159fa',
  '/images/records/ffbed2540eb424.webp': '#ec6601',
  '/images/records/965f3b262e52c6.webp': '#019457',
};


// The approved nine-sleeve collection has independent, text-free record stickers.
// Recognise only the known sleeve filenames, including timestamped admin reuploads.
const labelCollection: Record<string, { label: string; accent: string }> = {
  'GJ-01-Day-Vision': { label: '/images/records/labels/GJ-01-Day-Vision-Label.jpg', accent: '#00E4E2' },
  'GJ-02-Grandmas-Groove': { label: '/images/records/labels/GJ-02-Grandmas-Groove-Label.jpg', accent: '#8715EF' },
  'GJ-03-Saturday-Sessions': { label: '/images/records/labels/GJ-03-Saturday-Sessions-Label.jpg', accent: '#F3E9CE' },
  'GJ-04-Sativa': { label: '/images/records/labels/GJ-04-Sativa-Label.jpg', accent: '#0754FF' },
  'GJ-05-Indica': { label: '/images/records/labels/GJ-05-Indica-Label.jpg', accent: '#FF5300' },
  'GJ-06-Ensemble': { label: '/images/records/labels/GJ-06-Ensemble-Label.jpg', accent: '#00AF72' },
  'GJ-07-Cafe-Daytime': { label: '/images/records/labels/GJ-07-Cafe-Daytime-Label.jpg', accent: '#F6E500' },
  'GJ-08-Cafe-Evening': { label: '/images/records/labels/GJ-08-Cafe-Evening-Label.jpg', accent: '#E51D24' },
  'GJ-09-The-Duet': { label: '/images/records/labels/GJ-09-The-Duet-Label.jpg', accent: '#D49D36' },
};
const legacyLabelKeys: Record<string, string> = {
  '/images/records/4ccf343a498659.webp': 'GJ-01-Day-Vision',
  '/images/records/62b22d7cd1e4e2.webp': 'GJ-02-Grandmas-Groove',
  '/images/records/a8b97e29ae6f36.webp': 'GJ-03-Saturday-Sessions',
  '/images/records/e2f7c781c855de.webp': 'GJ-04-Sativa',
  '/images/records/ffbed2540eb424.webp': 'GJ-05-Indica',
  '/images/records/965f3b262e52c6.webp': 'GJ-06-Ensemble',
};
const collectionKey = (source?: string) => {
  if (!source) return undefined;
  const legacy = legacyLabelKeys[artwork[source] || source];
  if (legacy) return legacy;
  const match = source.match(/^https:\/\/grandma-jazz-uploads\.s3\.ap-southeast-2\.amazonaws\.com\/cards\/(GJ-0[1-9]-[A-Za-z-]+)-\d+\.jpg$/);
  return match && labelCollection[match[1]] ? match[1] : undefined;
};
export const getAlbumLabelUrl = (source: string) => {
  const key = collectionKey(source);
  return key ? labelCollection[key].label : source;
};
const getCollectionAccent = (source?: string) => {
  if (!source || legacyLabelKeys[artwork[source] || source]) return undefined;
  const key = collectionKey(source);
  return key ? labelCollection[key].accent : undefined;
};

export const getAlbumAccentColor = (source?: string) =>
  getCollectionAccent(source) || (source && artworkAccents[artwork[source] || source]) || '#B49B73';

// Existing catalogue rows have the placeholder “Music Card”. Use the album
// printed on that exact cover everywhere, without exposing audio filenames.
const albumTitles: Record<string, string> = {
  '/images/records/4ccf343a498659.webp': 'Day Vision',
  '/images/records/62b22d7cd1e4e2.webp': 'Grandma’s Groove',
  '/images/records/a8b97e29ae6f36.webp': 'Saturday Sessions',
  '/images/records/e2f7c781c855de.webp': 'Sativa',
  '/images/records/ffbed2540eb424.webp': 'Indica',
  '/images/records/965f3b262e52c6.webp': 'Ensemble',
};

export const getAlbumTitle = (source?: string, title?: string) =>
  (title?.trim() && title.trim() !== 'Music Card' ? title.trim() : undefined)
  || (source && albumTitles[artwork[source] || source]) || 'Grandma Jazz';
