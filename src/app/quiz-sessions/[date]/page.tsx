import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Contact from '@/components/Contact';
import { formatOccurrenceDate } from '@/lib/recurringEvents';
import { quizForDate, quizPath, quizSchema } from '@/lib/quizSeo';
import { SITE_URL, serializeJsonLd } from '@/lib/structuredData';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ date: string }> }): Promise<Metadata> {
  const { date } = await params;
  const quiz = quizForDate(date);
  if (!quiz) notFound();
  const title = `Free Quiz Session — ${formatOccurrenceDate(quiz.start)}`;
  const description = 'Join Grandma Jazz’s free Saturday quiz at 4:20 pm in Kamala, Phuket. Music, general knowledge, good coffee and good company.';
  return {
    title, description, alternates: { canonical: `${SITE_URL}${quizPath(quiz)}` },
    openGraph: { title, description, url: `${SITE_URL}${quizPath(quiz)}`, images: ['/images/og-image.jpg'] },
  };
}

export default async function QuizDatePage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  const quiz = quizForDate(date);
  if (!quiz) notFound();
  const past = quiz.end < new Date();
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(quizSchema(quiz)) }} />
    <article className="min-h-screen bg-[#181818] pt-28 pb-16 px-4">
      <div className="max-w-3xl mx-auto text-[#e3dcd4]">
        <Link href="/events/" className="gj-cta mb-8">All sessions</Link>
        <p className="font-suisse-intl-mono uppercase tracking-widest text-[#B49B73] text-sm mb-4">Saturday at Grandma Jazz</p>
        <h1 className="gj-display-title mb-6">Quiz Session</h1>
        <p className="text-xl mb-3"><time dateTime={quiz.isoWithOffset}>{formatOccurrenceDate(quiz.start)} · 4:20 pm</time></p>
        <p className="text-[#B49B73] mb-6">Free to join · Grandma Jazz, Kamala, Phuket</p>
        {past && <p className="mb-6">This date has passed. See our events page for the next Saturday session.</p>}
        <p className="font-roboto-light leading-relaxed mb-6">{quiz.description}</p>
        <p className="font-roboto-light leading-relaxed mb-6">Our weekly quiz brings people together over music, general knowledge and good conversation in the Kamala hills. Come with friends or meet your team here.</p>
        <p className="font-roboto-light leading-relaxed mb-8">13/20 Moo 6, Kamala, Phuket 83150, Thailand. Seating is limited; contact us if you have a question before coming up the hill.</p>
        <div className="flex flex-wrap gap-4">
          <Link href="/visit/" className="gj-cta">Directions & opening hours</Link>
          <a href="https://wa.me/66948605652" className="gj-cta">Ask us on WhatsApp</a>
        </div>
      </div>
    </article>
    <Contact />
  </>;
}
