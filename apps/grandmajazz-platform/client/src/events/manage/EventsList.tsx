import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { api, fmtDate } from "../api";
import { ManageLayout } from "./ManageLayout";
import { StatusChip } from "./Dashboard";
import { BrickLinkButton, EmptyState, Spinner, StateBanner } from "../ui";

export interface ManagedEvent {
  id: string; title: string; slug: string; subtitle: string | null;
  status: string; startsAt: string; endsAt: string; timezone: string;
  startsAtLocal: string; endsAtLocal: string;
  registrationOpensAtLocal: string | null; registrationClosesAtLocal: string | null;
  capacity: number | null; showRemainingCapacity: boolean;
  descriptionHtml: string; heroImagePath: string | null; heroImageAlt: string | null;
  gallery: Array<{ path: string; alt: string }>;
  dressCode: string | null; minAge: number | null;
  faqs: Array<{ q: string; a: string }>;
  contactEmail: string | null; contactPhone: string | null;
  ogTitle: string | null; ogDescription: string | null;
  venueId: string | null;
  publishedAt: string | null; cancelledAt: string | null;
  confirmed?: number; checkedIn?: number;
}

export default function EventsList() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["manage-events"],
    queryFn: () => api<{ events: ManagedEvent[] }>("/manage/events"),
  });

  return (
    <ManageLayout title="Events" minRole="event_manager">
      <div className="mb-6">
        <BrickLinkButton href="/events/manage/events/new">Create event</BrickLinkButton>
      </div>
      {isLoading && <Spinner label="Loading events" />}
      {isError && <StateBanner kind="error">Couldn't load events. Please refresh.</StateBanner>}
      {data && data.events.length === 0 && (
        <EmptyState title="No events yet">
          <p>Your first event is one click away.</p>
        </EmptyState>
      )}
      {data && data.events.length > 0 && (
        <ul className="space-y-3" role="list">
          {data.events.map((event) => (
            <li key={event.id} className="border-2 border-white/40 rounded-[10px] px-4 py-3 flex flex-wrap items-center gap-3 justify-between">
              <div className="min-w-0">
                <Link href={`/events/manage/events/${event.id}`} className="text-base font-light underline hover:text-white/70">
                  {event.title}
                </Link>
                <p className="mt-0.5 text-xs text-white/50 font-light">
                  {fmtDate(event.startsAt, event.timezone)} · /events/{event.slug}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs font-light text-white/60">
                  {event.confirmed ?? 0}{event.capacity != null && `/${event.capacity}`} registered
                </span>
                <StatusChip status={event.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </ManageLayout>
  );
}
