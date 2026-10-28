import type { Metadata } from 'next';
import RecordFlightPreview from '@/components/RecordFlightPreview';

export const metadata: Metadata = {
  title: 'Under the Needle — Intro preview',
  robots: { index: false, follow: false },
};

export default function IntroPreviewPage() { return <RecordFlightPreview />; }
