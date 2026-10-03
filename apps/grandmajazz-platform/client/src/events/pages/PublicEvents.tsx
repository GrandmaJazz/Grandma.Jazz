import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { api, fmtDate, fmtTime } from "../api";
import { EventsLayout, EmptyState, MicroLabel, PageTitle, Spinner, StateBanner } from "../ui";
import { apiUrl } from "@/lib/api";

interface PublicEventSummary {
  slug: string;
  title: string;
  subtitle: string | null;
  heroImagePath: string | null;
  heroImageAlt: string | null;
  startsAt: string;
  endsAt: string;
  timezone: string;
  venueName: string | null;
  city: string | null;
  status: string;
  registration: { state: string; remaining: number | null };
}

const STATE_LABEL: Record<string, string> = {
  not_yet_open: "Registration opens soon",
  open: "Registration open",
  limited: "Few places left",
  full: "Fully booked",
  closed: "Registration closed",
  cancelled: "Cancelled",
  completed: "Past event",
};

export default function PublicEvents() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["public-events"],
    queryFn: () => api<{ events: PublicEventSummary[] }>("/events"),
  });

  return (
    <EventsLayout wide>
      <PageTitle sub="Live nights at Grandma Jazz, Phuket. Free entry — reserve your place.">
        Events
      </PageTitle>

      {isLoading && <Spinner label="Loading events" />}
      {isError && <StateBanner kind="error">We couldn't load the events. Please refresh the page.</StateBanner>}

      {data && data.events.length === 0 && (
        <EmptyState title="Nothing on the calendar just yet">
          <p>
            New nights are announced here and on{" "}
            <a href="https://www.instagram.com/grandmajazzphuket" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">
              Instagram
            </a>
            . Come back soon, my dear.
          </p>
        </EmptyState>
      )}

      {data && data.events.length > 0 && (
        <ul className="grid gap-6 sm:grid-cols-2" role="list">
          {data.events.map((event) => (
            <li key={event.slug}>
              <Link
                href={`/events/${event.slug}`}
                className="group block border-2 border-white/90 rounded-[10px] bg-black overflow-hidden transition-colors duration-300 hover:bg-white hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                {event.heroImagePath && (
                  <img
                    src={apiUrl(event.heroImagePath)}
                    alt={event.heroImageAlt || ""}
                    loading="lazy"
                    className="w-full aspect-[16/9] object-cover border-b-2 border-white/90"
                  />
                )}
                <div className="p-5">
                  <MicroLabel className="group-hover:text-black/60">
                    {fmtDate(event.startsAt, event.timezone)} · {fmtTime(event.startsAt, event.timezone)}
                  </MicroLabel>
                  <h2 className="mt-2 text-xl font-galvji-light tracking-extra-wide">{event.title}</h2>
                  {event.subtitle && (
                    <p className="mt-1 text-sm font-light text-white/70 group-hover:text-black/70">{event.subtitle}</p>
                  )}
                  <p className="mt-3 text-xs font-sans uppercase tracking-[0.18em] text-white/60 group-hover:text-black/60">
                    {[event.venueName, event.city].filter(Boolean).join(", ")}
                  </p>
                  <p className="mt-4 inline-block border border-current rounded-full px-3 py-1 text-[11px] font-sans uppercase tracking-[0.18em]">
                    {STATE_LABEL[event.registration.state] ?? event.registration.state}
                    {event.registration.state === "limited" && event.registration.remaining != null &&
                      ` — ${event.registration.remaining} left`}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </EventsLayout>
  );
}
