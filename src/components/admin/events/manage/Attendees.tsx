import { useState } from "react";
import { Link, useRoute } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError, eventsApiUrl } from "../api";
import { ManageLayout } from "./ManageLayout";
import { BrickButton, BrickTile, EmptyState, Field, MicroLabel, Spinner, StateBanner, TextInput } from "../ui";

interface Attendee {
  registrationId: string;
  ticketId: string;
  fullName: string;
  email: string;
  phone: string;
  notes: string | null;
  status: "confirmed" | "cancelled";
  source: string;
  marketingConsent: boolean;
  registeredAt: string;
  cancelledAt: string | null;
  ticketReference: string;
  ticketStatus: string;
  checkedInAt: string | null;
  delivery: string;
}

interface AttendeesResponse {
  page: number; pageSize: number; total: number;
  attendees: Attendee[];
}

export default function Attendees() {
  const [, params] = useRoute("/events/manage/events/:eventId/attendees");
  const eventId = params?.eventId;
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["attendees", eventId, search, status, page],
    enabled: !!eventId,
    queryFn: () => api<AttendeesResponse>(
      `/manage/events/${eventId}/attendees?q=${encodeURIComponent(search)}&status=${status}&page=${page}`,
    ),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["attendees", eventId] });
    qc.invalidateQueries({ queryKey: ["manage-event", eventId] });
  };

  const act = (path: string, body?: unknown) =>
    api(path, { method: "POST", json: body ?? {} });

  const resend = useMutation({
    mutationFn: (id: string) => act(`/manage/registrations/${id}/resend`),
    onSuccess: () => { setFlash("Ticket queued for resend."); invalidate(); },
  });
  const cancel = useMutation({
    mutationFn: (id: string) => act(`/manage/registrations/${id}/cancel`, { notifyAttendee: true }),
    onSuccess: () => { setFlash("Registration cancelled — ticket invalidated."); invalidate(); },
  });
  const restore = useMutation({
    mutationFn: (id: string) => act(`/manage/registrations/${id}/restore`),
    onSuccess: () => { setFlash("Registration restored."); invalidate(); },
    onError: (err) => setFlash(err instanceof ApiError ? err.message : "Restore failed"),
  });
  const reverse = useMutation({
    mutationFn: ({ ticketId, reason }: { ticketId: string; reason: string }) =>
      act(`/manage/tickets/${ticketId}/reverse-check-in`, { reason }),
    onSuccess: () => { setFlash("Check-in reversed."); invalidate(); },
    onError: (err) => setFlash(err instanceof ApiError ? err.message : "Reverse failed"),
  });

  const totalPages = query.data ? Math.max(1, Math.ceil(query.data.total / query.data.pageSize)) : 1;

  return (
    <ManageLayout title="Attendees" minRole="event_manager">
      <p className="mb-5 -mt-3">
        <Link href={`/events/manage/events/${eventId}`} className="text-xs font-sans uppercase tracking-[0.18em] text-white/50 underline hover:text-white">
          ← Back to event
        </Link>
      </p>

      <form className="flex flex-wrap gap-3 mb-5 items-end" onSubmit={(e) => { e.preventDefault(); setPage(1); setSearch(q); }}>
        <div className="flex-1 min-w-[220px]">
          <label htmlFor="attendee-search" className="block mb-1.5 text-xs font-sans uppercase tracking-[0.18em] text-white/60">
            Search name, email or ticket
          </label>
          <TextInput id="attendee-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. GJ-7K4M or ana@…" />
        </div>
        <div>
          <label htmlFor="attendee-status" className="block mb-1.5 text-xs font-sans uppercase tracking-[0.18em] text-white/60">Status</label>
          <select id="attendee-status" value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="bg-black text-white border-2 border-white/50 rounded-[10px] px-4 py-2.5 text-base font-light focus:border-white/90 focus:outline-none">
            <option value="">All</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <BrickButton type="submit" variant="quiet">Search</BrickButton>
        <span className="flex-1" />
        <a href={eventsApiUrl(`/manage/events/${eventId}/attendees.csv`)}
          className="px-4 py-2.5 border-2 border-white/60 rounded-[10px] text-xs font-sans uppercase tracking-wider hover:bg-white hover:text-black transition-colors">
          Export CSV
        </a>
        <BrickButton type="button" onClick={() => setAddOpen((v) => !v)}>Add attendee</BrickButton>
      </form>

      {flash && <StateBanner kind="info">{flash}</StateBanner>}

      {addOpen && eventId && (
        <ManualAdd eventId={eventId} onDone={(msg) => { setAddOpen(false); setFlash(msg); invalidate(); }} />
      )}

      {query.isLoading && <Spinner label="Loading attendees" />}
      {query.isError && <StateBanner kind="error">Couldn't load attendees. Please refresh.</StateBanner>}

      {query.data && query.data.attendees.length === 0 && (
        <EmptyState title={search || status ? "No matches" : "No registrations yet"}>
          {search || status ? <p>Try a different search or status filter.</p> : <p>Share the public event link to start filling the room.</p>}
        </EmptyState>
      )}

      {query.data && query.data.attendees.length > 0 && (
        <>
          <p className="text-xs font-light text-white/50 mb-3" aria-live="polite">
            {query.data.total} registration{query.data.total === 1 ? "" : "s"}
          </p>
          <ul className="space-y-3">
            {query.data.attendees.map((a) => (
              <li key={a.registrationId} className="border-2 border-white/30 rounded-[10px]">
                <button
                  type="button"
                  className="w-full text-left px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1 cursor-pointer hover:bg-white/5"
                  aria-expanded={openId === a.registrationId}
                  onClick={() => setOpenId(openId === a.registrationId ? null : a.registrationId)}
                >
                  <span className="font-light">{a.fullName}</span>
                  <span className="text-xs font-sans tracking-[0.2em] text-white/50">{a.ticketReference}</span>
                  <span className="flex-1" />
                  {a.checkedInAt && <Badge tone="ok">✓ checked in</Badge>}
                  {a.status === "cancelled" ? <Badge tone="bad">cancelled</Badge> : <Badge tone="ok">confirmed</Badge>}
                  <Badge tone={a.delivery === "sent" ? "ok" : a.delivery === "failed" ? "bad" : "dim"}>
                    email: {a.delivery === "none" ? "–" : a.delivery}
                  </Badge>
                </button>
                {openId === a.registrationId && (
                  <div className="px-4 pb-4 border-t border-white/15 pt-3 text-sm font-light">
                    <dl className="grid gap-x-8 gap-y-2 sm:grid-cols-2 mb-4">
                      <div><dt className="text-[11px] uppercase tracking-[0.18em] text-white/40 font-sans">Email</dt><dd>{a.email}</dd></div>
                      <div><dt className="text-[11px] uppercase tracking-[0.18em] text-white/40 font-sans">Phone</dt><dd>{a.phone}</dd></div>
                      <div><dt className="text-[11px] uppercase tracking-[0.18em] text-white/40 font-sans">Registered</dt><dd>{new Date(a.registeredAt).toLocaleString()} ({a.source})</dd></div>
                      <div><dt className="text-[11px] uppercase tracking-[0.18em] text-white/40 font-sans">Checked in</dt><dd>{a.checkedInAt ? new Date(a.checkedInAt).toLocaleString() : "—"}</dd></div>
                      {a.notes && <div className="sm:col-span-2"><dt className="text-[11px] uppercase tracking-[0.18em] text-white/40 font-sans">Notes</dt><dd>{a.notes}</dd></div>}
                    </dl>
                    <div className="flex flex-wrap gap-2">
                      {a.status === "confirmed" && (
                        <>
                          <BrickButton variant="quiet" onClick={() => resend.mutate(a.registrationId)} disabled={resend.isPending}>
                            Resend ticket
                          </BrickButton>
                          <BrickButton variant="quiet" className="border-red-400/70 text-red-200"
                            onClick={() => { if (window.confirm(`Cancel ${a.fullName}'s registration? Their ticket becomes invalid.`)) cancel.mutate(a.registrationId); }}
                            disabled={cancel.isPending}>
                            Cancel registration
                          </BrickButton>
                        </>
                      )}
                      {a.status === "cancelled" && (
                        <BrickButton variant="quiet" onClick={() => restore.mutate(a.registrationId)} disabled={restore.isPending}>
                          Restore registration
                        </BrickButton>
                      )}
                      {a.checkedInAt && (
                        <BrickButton variant="quiet"
                          onClick={() => {
                            const reason = window.prompt("Reason for reversing this check-in?");
                            if (reason) reverse.mutate({ ticketId: a.ticketId, reason });
                          }}
                          disabled={reverse.isPending}>
                          Reverse check-in
                        </BrickButton>
                      )}
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>

          {totalPages > 1 && (
            <nav className="mt-6 flex items-center gap-3 justify-center" aria-label="Pagination">
              <BrickButton variant="quiet" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</BrickButton>
              <span className="text-xs font-light text-white/60">Page {page} of {totalPages}</span>
              <BrickButton variant="quiet" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</BrickButton>
            </nav>
          )}
        </>
      )}
    </ManageLayout>
  );
}

function Badge({ children, tone }: { children: React.ReactNode; tone: "ok" | "bad" | "dim" }) {
  const cls = { ok: "border-white/60 text-white/80", bad: "border-red-400/70 text-red-200", dim: "border-white/25 text-white/45" }[tone];
  return <span className={`border rounded-full px-2.5 py-0.5 text-[10px] font-sans uppercase tracking-[0.15em] ${cls}`}>{children}</span>;
}

function ManualAdd({ eventId, onDone }: { eventId: string; onDone: (msg: string) => void }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [overrideWindow, setOverrideWindow] = useState(false);
  const add = useMutation({
    mutationFn: () => api<{ ticketReference: string }>(`/manage/events/${eventId}/attendees`, {
      method: "POST", json: { fullName, email, phone, notes, overrideWindow },
    }),
    onSuccess: (result) => onDone(`Added — ticket ${result.ticketReference} issued and emailed.`),
  });
  return (
    <BrickTile className="mb-6">
      <MicroLabel className="mb-3">Add attendee manually</MicroLabel>
      {add.isError && <StateBanner kind="error">{add.error instanceof ApiError ? add.error.message : "Could not add attendee"}</StateBanner>}
      <form noValidate onSubmit={(e) => { e.preventDefault(); if (!add.isPending) add.mutate(); }} className="grid sm:grid-cols-2 gap-x-6">
        <Field label="Full name" required>{(id) => <TextInput id={id} value={fullName} onChange={(e) => setFullName(e.target.value)} />}</Field>
        <Field label="Email" required>{(id) => <TextInput id={id} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />}</Field>
        <Field label="Phone" required>{(id) => <TextInput id={id} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />}</Field>
        <Field label="Notes">{(id) => <TextInput id={id} value={notes} onChange={(e) => setNotes(e.target.value)} />}</Field>
        <div className="sm:col-span-2">
          <label className="flex items-center gap-2 text-sm font-light mb-4 cursor-pointer">
            <input type="checkbox" checked={overrideWindow} onChange={(e) => setOverrideWindow(e.target.checked)} className="h-4 w-4 accent-white" />
            Allow even though registration is closed (capacity still applies)
          </label>
          <BrickButton type="submit" disabled={add.isPending}>{add.isPending ? "Adding…" : "Add & send ticket"}</BrickButton>
        </div>
      </form>
    </BrickTile>
  );
}
