import type { Metadata } from 'next';
import Link from 'next/link';
import { analogAnnouncement as event } from '@/lib/eventAnnouncements';
import { publishedEventSchema } from '@/lib/eventSeo';
import { SITE_URL, serializeJsonLd } from '@/lib/structuredData';

const path = `/events/${event.slug}/`;
const description = 'Coming soon: 12 December 2026, 18:30–21:30 at Grandma Jazz, Kamala. Vinyl listening for 20 guests. ฿420 including a welcome drink. Reservations are not open yet.';

export const metadata: Metadata = {
  title: event.title,
  description,
  alternates: { canonical: path },
  openGraph: { title: event.title, description, url: `${SITE_URL}${path}`, type: 'website', images: [{ url: event.heroImagePath, alt: event.heroImageAlt }] },
  twitter: { card: 'summary_large_image', title: event.title, description, images: [event.heroImagePath] },
};

// A server-rendered announcement, with no booking form, payment link or signup
// action. The native booking record stays private; /register remains unavailable.
export default function AnalogAnnouncementPage() {
  const schema = publishedEventSchema({ ...event, status: 'draft', venue: { name: 'Grandma Jazz', city: 'Kamala, Phuket', country: 'TH' } });
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(schema) }} />
      <div className="min-h-screen bg-[#181818] pt-28 pb-20 px-4 sm:px-6">
        <article className="max-w-4xl mx-auto">
          <Link href="/events/" className="font-label-mono text-xs text-[#e3dcd4]/70 hover:text-[#B49B73]">← All events</Link>
          <img src={event.heroImagePath} alt={event.heroImageAlt} width={1672} height={941} className="mt-8 w-full aspect-video object-cover border border-[#B49B73]/40 rounded-[20px]" fetchPriority="high" />
          <p className="mt-8 font-label-mono uppercase tracking-[0.2em] text-xs text-[#B49B73]">Saturday 12 December 2026 · Kamala, Phuket</p>
          <h1 className="gj-display-title mt-4">ANALOG <span className="gj-title-accent">by BEYCAN</span> — 001</h1>
          <p className="gj-section-copy mt-5">Vinyl listening. A curated record corner. Twenty places to settle in.</p>

          <section aria-label="Reservation status" className="mt-8 border border-[#B49B73]/40 rounded-box bg-black/30 p-6 sm:p-8">
            <h2 className="font-label-mono uppercase tracking-[0.2em] text-sm text-[#B49B73]">Coming soon</h2>
            <p className="mt-3 font-roboto-light text-[#e3dcd4]">Reservations are not open yet.</p>
            <p className="mt-2 font-roboto-light text-sm text-[#e3dcd4]/65">This page is an announcement only. Booking and payment details will follow when reservations open.</p>
          </section>

          <dl className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-6 border border-[#B49B73]/20 rounded-box p-6 sm:p-8 text-[#e3dcd4]">
            <div><dt className="font-label-mono text-xs uppercase tracking-widest text-[#B49B73]">When</dt><dd className="mt-2 font-roboto-light"><time dateTime={event.startsAt}>12 December 2026 · 18:30</time>–<time dateTime={event.endsAt}>21:30</time><br /><span className="text-sm text-[#e3dcd4]/65">Bangkok time (UTC+7)</span></dd></div>
            <div><dt className="font-label-mono text-xs uppercase tracking-widest text-[#B49B73]">Where</dt><dd className="mt-2 font-roboto-light">Grandma Jazz<br />Kamala, Phuket</dd></div>
            <div><dt className="font-label-mono text-xs uppercase tracking-widest text-[#B49B73]">Entry</dt><dd className="mt-2 font-roboto-light"><span className="text-[#B49B73]">฿420</span> including a welcome drink</dd></div>
            <div><dt className="font-label-mono text-xs uppercase tracking-widest text-[#B49B73]">The room</dt><dd className="mt-2 font-roboto-light">Limited to 20 guests</dd></div>
          </dl>
          <div className="mt-8 space-y-5 font-roboto-light text-[#e3dcd4]/75 leading-relaxed">
            <p>The first ANALOG by BEYCAN session brings vinyl listening to Grandma Jazz. Settle in for a relaxed evening of analog music, with a selection of second-hand records to browse and buy.</p>
            <p>Family membership will be required to reserve a place when bookings open.</p>
          </div>
          <Link href="/events/" className="gj-cta mt-10">Explore our sessions</Link>
        </article>
      </div>
    </>
  );
}
