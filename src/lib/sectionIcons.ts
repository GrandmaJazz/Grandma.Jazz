import type { Metadata } from 'next';

export function sectionIconPaths(garments: boolean) {
  const prefix = garments ? '/icons/garments-g' : '/icons/grandma-jazz-digital';
  return {
    small: `${prefix}-32-v4.png`,
    large: `${prefix}-192-v4.png`,
    apple: `${prefix}-180-v4.png`,
    manifest: garments ? '/garments-manifest-v4.json' : '/manifest-v4.json',
  };
}

export function sectionIconMetadata(garments: boolean): Pick<Metadata, 'icons' | 'manifest'> {
  const paths = sectionIconPaths(garments);
  return {
    icons: {
      icon: [
        { url: paths.small, sizes: '32x32', type: 'image/png' },
        { url: paths.large, sizes: '192x192', type: 'image/png' },
      ],
      shortcut: paths.small,
      apple: [{ url: paths.apple, sizes: '180x180', type: 'image/png' }],
    },
    manifest: paths.manifest,
  };
}
