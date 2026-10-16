import PlatformPublicationFrame from '@/components/PlatformPublicationFrame';
export const metadata = {
  title: 'Garments',
  description: 'Vintage, up-cycled, uniquely found. Explore the Garments magazine editions from Grandma Jazz.',
  // Set the top-level tab icon here; the reader runs inside an iframe, whose
  // own document icon cannot change the surrounding Safari tab.
  icons: {
    icon: [
      { url: '/icons/garments-g-32-v2.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/garments-g-192-v2.png', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: '/icons/garments-g-32-v2.png',
    apple: [{ url: '/icons/garments-g-180-v2.png', sizes: '180x180', type: 'image/png' }],
  },
};
export default function GarmentsPublication() { return <PlatformPublicationFrame section="garments" />; }
