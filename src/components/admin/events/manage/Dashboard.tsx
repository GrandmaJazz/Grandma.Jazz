import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useState } from "react";
import { api, fmtDate } from "../api";
import { ManageLayout } from "./ManageLayout";
import { BrickLinkButton, BrickTile, EmptyState, MicroLabel, Spinner, StateBanner } from "../ui";

interface DashboardData {
  totals: { upcoming: number; published: number; drafts: number; completed: number };
  events: Array<{
    id: string; title: string; slug: string; status: string;
    startsAt: string; timezone: string; capacity: number | null;
    confirmed: number; checkedIn: number;
  }>;
  recentRegistrations: Array<{
    id: string; fullName: string; status: string; eventTitle: string; registeredAt: string;
  }>;
}

function CopyLink({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(`${window.location.origin}/events/${slug}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="text-[11px] font-sans uppercase tracking-[0.15em] text-white/60 underline hover:text-white cursor-pointer"
      aria-live="polite"
    >
      {copied ? "Copied" : "Copy link"}
    </button>
  );
}

export default function Dashboard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["manage-dashboard"],
    queryFn: () => api<DashboardData>("/manage/dashboard"),
  });

  return (
    <ManageLayout title="Dashboard" minRole="event_manager">
      {isLoading && <Spinner label="Loading dashboard" />}
      {isError && <StateBanner kind="error">Couldn't load the dashboard. Please refresh.</StateBanner>}
      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {[
              ["Upcoming", data.totals.upcoming],
              ["Published", data.totals.published],
              ["Drafts", data.totals.drafts],
              ["Completed", data.totals.completed],
            ].map(([label, value]) => (
              <BrickTile key={String(label)} className="text-center py-4">
                <p className="text-3xl font-galvji-light">{value}</p>
                <MicroLabel className="mt-1 text-center">{label}</MicroLabel>
              </BrickTile>
            ))}
          </div>

          <div className="flex flex-wrap gap-3 mb-8">
            <BrickLinkButton href="/events/manage/events/new">Create event</BrickLinkButton>
            <BrickLinkButton href="/events/manage/events" className="border-white/40">All events</BrickLinkButton>
          </div>

          <h2 className="text-lg font-galvji-light tracking-extra-wide mb-3">Events</h2>
          {data.events.length === 0 ? (
            <EmptyState title="No events yet">
              <p>Create your first event and share its link — everything else follows from there.</p>
            </EmptyState>
          ) : (
            <div className="overflow-x-auto border-2 border-white/40 rounded-[10px] mb-10">
              <table className="w-full text-sm font-light min-w-[640px]">
                <thead>
                  <tr className="border-b border-white/20 text-left">
                    {["Event", "Date", "Status", "Registered", "Checked in", ""].map((h) => (
                      <th key={h} className="px-4 py-3 text-[11px] font-sans uppercase tracking-[0.18em] text-white/50 font-normal">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.events.map((event) => (
                    <tr key={event.id} className="border-b border-white/10 last:border-0">
                      <td className="px-4 py-3">
                        <Link href={`/events/manage/events/${event.id}`} className="underline hover:text-white/70">{event.title}</Link>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{fmtDate(event.startsAt, event.timezone)}</td>
                      <td className="px-4 py-3"><StatusChip status={event.status} /></td>
                      <td className="px-4 py-3">{event.confirmed}{event.capacity != null && ` / ${event.capacity}`}</td>
                      <td className="px-4 py-3">
                        {event.checkedIn}
                        {event.confirmed > 0 && ` (${Math.round((event.checkedIn / event.confirmed) * 100)}%)`}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap space-x-3">
                        {event.status === "published" && <CopyLink slug={event.slug} />}
                        <Link href={`/events/manage/events/${event.id}/check-in`} className="text-[11px] font-sans uppercase tracking-[0.15em] text-white/60 underline hover:text-white">
                          Check-in
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h2 className="text-lg font-galvji-light tracking-extra-wide mb-3">Recent registrations</h2>
          {data.recentRegistrations.length === 0 ? (
            <p className="text-sm font-light text-white/50">No registrations yet.</p>
          ) : (
            <ul className="space-y-2">
              {data.recentRegistrations.map((reg) => (
                <li key={reg.id} className="flex flex-wrap justify-between gap-2 border border-white/15 rounded-[10px] px-4 py-2.5 text-sm font-light">
                  <span>
                    {reg.fullName}
                    {reg.status === "cancelled" && <span className="ml-2 text-red-300 text-xs">(cancelled)</span>}
                    <span className="text-white/50"> — {reg.eventTitle}</span>
                  </span>
                  <span className="text-white/40 text-xs">{new Date(reg.registeredAt).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </ManageLayout>
  );
}

export function StatusChip({ status }: { status: string }) {
  const style: Record<string, string> = {
    draft: "border-white/40 text-white/60",
    published: "border-white text-white",
    registration_closed: "border-amber-300/70 text-amber-100",
    cancelled: "border-red-400/70 text-red-200",
    completed: "border-white/40 text-white/60",
    archived: "border-white/20 text-white/40",
  };
  return (
    <span className={`inline-block border rounded-full px-2.5 py-0.5 text-[10px] font-sans uppercase tracking-[0.15em] ${style[status] || style.draft}`}>
      {status.replace("_", " ")}
    </span>
  );
}
