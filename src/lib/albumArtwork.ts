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
