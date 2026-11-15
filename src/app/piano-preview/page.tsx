import type { Metadata } from 'next';
import PianoScrollPreview from '@/components/PianoScrollPreview';

export const metadata: Metadata = {
  title: 'Play It Back — Piano Scroll Preview',
  robots: { index: false, follow: false },
};

export default function PianoPreviewPage() {
  return <PianoScrollPreview />;
}
