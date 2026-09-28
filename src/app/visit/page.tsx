import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { BUSINESS_HOURS, GOOGLE_MAPS_URL } from '@/lib/businessDetails';

export const metadata: Metadata = {
  title: 'Cannabis Shop & Café in Kamala, Phuket | Visit Us',
  description:
    'Grandma Jazz is a cannabis shop and café in the Kamala hills of Phuket. Find our entrance, opening hours and Google Maps directions before you set off.',
  alternates: { canonical: '/visit' },
  openGraph: {
    title: 'Visit Grandma Jazz in Kamala, Phuket',
    description: 'Our address, opening hours, entrance photo and directions to the café in the Kamala hills.',
    url: '/visit',
    images: [{ url: '/images/exterior.webp', alt: 'The hillside entrance to Grandma Jazz in Kamala' }],
  },
};

export default function VisitPage() {
  return (
    <article className="min-h-screen bg-[#0A0A0A] px-5 pb-20 pt-28 text-[#e3dcd4] sm:px-8 sm:pt-36">
      <div className="mx-auto max-w-5xl">
        <p className="mb-4 font-label-mono text-sm uppercase tracking-[0.2em] text-[#B49B73]">Kamala, Phuket</p>
        <h1 className="font-silver-garden text-4xl font-black leading-tight sm:text-6xl">Come and find us.</h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[#F5F1E6]/80">
          Grandma Jazz is a cannabis shop and café in the hills above Kamala, away from the beach road. Come for Phuket-roasted coffee,
          music and a little time to slow down. Use the map pin for the final turn and look for the entrance pictured below.
        </p>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
          <div className="overflow-hidden rounded-box border border-[#B49B73]/60">
            <Image
              src="/images/exterior.webp"
              alt="Grandma Jazz hillside entrance with string lights and the Kamala hills behind it"
              width={1200}
              height={800}
              className="h-auto w-full"
              priority
            />
            <p className="px-5 py-4 text-sm text-[#F5F1E6]/70">Look for this building when you arrive.</p>
          </div>

          <div className="rounded-box border border-[#B49B73]/60 p-6 sm:p-8">
            <h2 className="font-silver-garden text-2xl font-bold">The details</h2>
            <address className="mt-5 not-italic leading-relaxed text-[#F5F1E6]/80">
              Grandma Jazz<br />13/20 Moo 6<br />Kamala, Kathu, Phuket 83150<br />Thailand
            </address>
            <p className="mt-6 text-[#F5F1E6]/80">{BUSINESS_HOURS.display}</p>
            <p className="mt-2 text-sm text-[#F5F1E6]/60">Check Google Maps for holiday hours before travelling.</p>
            <a
              href={GOOGLE_MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex min-h-12 items-center rounded-box border border-[#B49B73] px-6 py-3 font-label-mono text-sm tracking-wide text-[#e3dcd4] transition-colors hover:bg-[#B49B73] hover:text-[#0A0A0A]"
            >
              Open directions in Google Maps ↗
            </a>
            <p className="mt-6 text-sm leading-relaxed text-[#F5F1E6]/70">
              Coming by taxi? Share the map link with your driver. Walking or riding? Follow the pin up from Kamala
              and allow time for the hill.
            </p>
          </div>
        </div>

        <section className="mt-12 max-w-2xl" aria-labelledby="visit-cafe-shop">
          <h2 id="visit-cafe-shop" className="font-silver-garden text-2xl font-bold">A weed shop and a café?</h2>
          <p className="mt-3 text-base leading-relaxed text-[#F5F1E6]/75">
            Yes. Grandma Jazz is a cannabis store and coffee café in Kamala. Come for Phuket-roasted coffee,
            music and a mountain view, whether you found us searching for a weed shop or a place to slow down.
          </p>
        </section>

        <p className="mt-12 text-base leading-relaxed text-[#F5F1E6]/75">
          Want a feel for the place first? <Link href="/events" className="text-[#B49B73] underline underline-offset-4">See what’s on</Link>,
          {' '}or <Link href="/blogs/visiting-grandma-jazz-a-guide-to-finding-us/" className="text-[#B49B73] underline underline-offset-4">read the full visiting guide</Link>.
        </p>
      </div>
    </article>
  );
}
