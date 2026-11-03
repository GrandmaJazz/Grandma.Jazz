import { notFound, permanentRedirect } from 'next/navigation';
import { getPublishedEvent, getPublishedEvents, publishedQuiz } from '@/lib/publishedEvents';
import { quizForDate } from '@/lib/quizSeo';

export const dynamic = 'force-dynamic';

// Consolidate legacy date URLs onto the actual published event. A Saturday
// alone is not evidence that an event has been scheduled.
export default async function QuizDatePage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  const quiz = quizForDate(date);
  if (!quiz) notFound();
  const event = publishedQuiz(quiz, await getPublishedEvents(true))
    || await getPublishedEvent(`quiz-session-${date}`);
  if (!event || !publishedQuiz(quiz, [event])) notFound();
  permanentRedirect(`/events/${encodeURIComponent(event.slug)}/`);
}
