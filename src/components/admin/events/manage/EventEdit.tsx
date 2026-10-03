import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError, eventsApiUrl } from "../api";
import { ManageLayout } from "./ManageLayout";
import { StatusChip } from "./Dashboard";
import type { ManagedEvent } from "./EventsList";
import { BrickButton, BrickTile, Field, Spinner, StateBanner, TextArea, TextInput, CheckboxRow, MicroLabel } from "../ui";
import { RichTextEditor } from "../RichText";
import { apiUrl } from "../../platformUrl";

interface Venue {
  id: string; name: string; addressLine1: string | null; city: string | null;
  country: string | null; mapUrl: string | null;
}

interface EventDetailResponse {
  event: ManagedEvent;
  venue: Venue | null;
  stats: { confirmed: number; cancelled: number; checkedIn: number; remaining: number | null };
  publicUrl: string;
}

type FormState = {
  title: string; slug: string; subtitle: string;
  descriptionHtml: string;
  startsAtLocal: string; endsAtLocal: string; timezone: string;
  registrationOpensAtLocal: string; registrationClosesAtLocal: string;
  capacity: string; showRemainingCapacity: boolean;
  dressCode: string; minAge: string;
  contactEmail: string; contactPhone: string;
  ogTitle: string; ogDescription: string;
  venueId: string;
  faqs: Array<{ q: string; a: string }>;
};

const emptyForm: FormState = {
  title: "", slug: "", subtitle: "", descriptionHtml: "",
  startsAtLocal: "", endsAtLocal: "", timezone: "Asia/Bangkok",
  registrationOpensAtLocal: "", registrationClosesAtLocal: "",
  capacity: "", showRemainingCapacity: true,
  dressCode: "", minAge: "", contactEmail: "", contactPhone: "",
  ogTitle: "", ogDescription: "", venueId: "", faqs: [],
};

function fromEvent(e: ManagedEvent): FormState {
  return {
    title: e.title, slug: e.slug, subtitle: e.subtitle ?? "",
    descriptionHtml: e.descriptionHtml ?? "",
    startsAtLocal: e.startsAtLocal, endsAtLocal: e.endsAtLocal, timezone: e.timezone,
    registrationOpensAtLocal: e.registrationOpensAtLocal ?? "",
    registrationClosesAtLocal: e.registrationClosesAtLocal ?? "",
    capacity: e.capacity == null ? "" : String(e.capacity),
    showRemainingCapacity: e.showRemainingCapacity,
    dressCode: e.dressCode ?? "", minAge: e.minAge == null ? "" : String(e.minAge),
    contactEmail: e.contactEmail ?? "", contactPhone: e.contactPhone ?? "",
    ogTitle: e.ogTitle ?? "", ogDescription: e.ogDescription ?? "",
    venueId: e.venueId ?? "", faqs: e.faqs ?? [],
  };
}

function toPayload(f: FormState) {
  return {
    title: f.title, slug: f.slug, subtitle: f.subtitle,
    descriptionHtml: f.descriptionHtml,
    startsAtLocal: f.startsAtLocal, endsAtLocal: f.endsAtLocal, timezone: f.timezone,
    registrationOpensAtLocal: f.registrationOpensAtLocal || null,
    registrationClosesAtLocal: f.registrationClosesAtLocal || null,
    capacity: f.capacity === "" ? null : Number(f.capacity),
    showRemainingCapacity: f.showRemainingCapacity,
    dressCode: f.dressCode, minAge: f.minAge === "" ? null : Number(f.minAge),
    contactEmail: f.contactEmail, contactPhone: f.contactPhone,
    ogTitle: f.ogTitle, ogDescription: f.ogDescription,
    venueId: f.venueId || null,
    faqs: f.faqs,
  };
}

export default function EventEdit() {
  const [matchNew] = useRoute("/events/manage/events/new");
  const [, params] = useRoute("/events/manage/events/:eventId");
  const eventId = matchNew ? undefined : params?.eventId;
  const isNew = !!matchNew;
  const [, navigate] = useLocation();
  const qc = useQueryClient();

  const detail = useQuery({
    queryKey: ["manage-event", eventId],
    enabled: !!eventId,
    queryFn: () => api<EventDetailResponse>(`/manage/events/${eventId}`),
  });
  const venuesQuery = useQuery({
    queryKey: ["manage-venues"],
    queryFn: () => api<{ venues: Venue[] }>("/manage/venues"),
  });

  const [form, setForm] = useState<FormState>(emptyForm);
  const [repeatFrequency, setRepeatFrequency] = useState("none");
  const [repeatCount, setRepeatCount] = useState(4);
  const [publishSeries, setPublishSeries] = useState(false);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  useEffect(() => {
    if (detail.data && loadedFor !== detail.data.event.id) {
      setForm(fromEvent(detail.data.event));
      setLoadedFor(detail.data.event.id);
    }
  }, [detail.data, loadedFor]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const save = useMutation({
    mutationFn: async () => {
      if (isNew) {
        return api<{ event: ManagedEvent }>("/manage/events", { method: "POST", json: {
          ...toPayload(form), repeatFrequency, repeatCount: repeatFrequency === "none" ? 1 : repeatCount, publishSeries,
        } });
      }
      return api<{ event: ManagedEvent; materialChanges: string[] }>(`/manage/events/${eventId}`, { method: "PUT", json: toPayload(form) });
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["manage-events"] });
      if (isNew) {
        navigate(`/events/manage/events/${result.event.id}`);
      } else {
        qc.invalidateQueries({ queryKey: ["manage-event", eventId] });
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 3000);
      }
    },
  });

  const statusChange = useMutation({
    mutationFn: (status: string) => api(`/manage/events/${eventId}/status`, { method: "POST", json: { status } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["manage-event", eventId] });
      qc.invalidateQueries({ queryKey: ["manage-events"] });
    },
  });

  const duplicate = useMutation({
    mutationFn: () => api<{ event: ManagedEvent }>(`/manage/events/${eventId}/duplicate`, { method: "POST" }),
    onSuccess: (result) => navigate(`/events/manage/events/${result.event.id}`),
  });

  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const upload = useMutation({
    mutationFn: async (file: File) => {
      const body = new FormData();
      body.append("image", file);
      body.append("alt", form.title);
      const res = await fetch(eventsApiUrl(`/manage/events/${eventId}/hero-image`), {
        method: "POST", credentials: "same-origin", body,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new ApiError(res.status, json?.error || "Upload failed");
      return json;
    },
    onSuccess: () => { setUploadError(null); qc.invalidateQueries({ queryKey: ["manage-event", eventId] }); },
    onError: (err) => setUploadError(err instanceof Error ? err.message : "Upload failed"),
  });

  // notify attendees flow (preview → confirm)
  const [notifyKind, setNotifyKind] = useState<string | null>(null);
  const [notifySummary, setNotifySummary] = useState("");
  const [notifyPreview, setNotifyPreview] = useState<{ recipients: number; deliveryEnabled: boolean } | null>(null);
  const [notifyResult, setNotifyResult] = useState<string | null>(null);
  const notify = useMutation({
    mutationFn: (confirm: boolean) => api<{ preview?: boolean; recipients?: number; queued?: number; deliveryEnabled: boolean }>(
      `/manage/events/${eventId}/notify`,
      { method: "POST", json: { kind: notifyKind, changeSummary: notifySummary, confirm } },
    ),
    onSuccess: (result) => {
      if (result.preview) setNotifyPreview({ recipients: result.recipients ?? 0, deliveryEnabled: result.deliveryEnabled });
      else {
        setNotifyResult(result.deliveryEnabled
          ? `${result.queued ?? 0} emails queued for delivery.`
          : `${result.queued ?? 0} emails queued, but email delivery is disabled. They have not been sent.`);
        setNotifyKind(null); setNotifyPreview(null); setNotifySummary("");
      }
    },
  });

  if (eventId && detail.isLoading) {
    return <ManageLayout title="Event" minRole="event_manager"><Spinner label="Loading event" /></ManageLayout>;
  }
  if (eventId && (detail.isError || !detail.data)) {
    return <ManageLayout title="Event" minRole="event_manager"><StateBanner kind="error">Couldn't load this event.</StateBanner></ManageLayout>;
  }

  const event = detail.data?.event;
  const stats = detail.data?.stats;
  const saveError = save.error instanceof ApiError ? save.error.message : save.error ? "Save failed" : null;
  const locked = event && ["archived", "cancelled"].includes(event.status);

  return (
    <ManageLayout title={isNew ? "New event" : event?.title || "Event"} minRole="event_manager">
      {event && (
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <StatusChip status={event.status} />
          {stats && (
            <span className="text-xs font-light text-white/60">
              {stats.confirmed} registered{event.capacity != null && ` of ${event.capacity}`} · {stats.checkedIn} checked in
              {stats.cancelled > 0 && ` · ${stats.cancelled} cancelled`}
            </span>
          )}
          <span className="flex-1" />
          <div className="flex flex-wrap gap-2">
            <Link href={`/events/manage/events/${event.id}/attendees`} className="px-3 py-1.5 border border-white/40 rounded-[8px] text-[11px] font-sans uppercase tracking-[0.15em] hover:bg-white hover:text-black transition-colors">Attendees</Link>
            <Link href={`/events/manage/events/${event.id}/check-in`} className="px-3 py-1.5 border border-white/40 rounded-[8px] text-[11px] font-sans uppercase tracking-[0.15em] hover:bg-white hover:text-black transition-colors">Check-in</Link>
            {event.status === "draft" && (
              <a href={apiUrl(`events/${event.slug}?preview=1`)} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 border border-white/40 rounded-[8px] text-[11px] font-sans uppercase tracking-[0.15em] hover:bg-white hover:text-black transition-colors">Preview draft*</a>
            )}
            {event.status !== "draft" && (
              <a href={apiUrl(`events/${event.slug}`)} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 border border-white/40 rounded-[8px] text-[11px] font-sans uppercase tracking-[0.15em] hover:bg-white hover:text-black transition-colors">View public page</a>
            )}
          </div>
        </div>
      )}

      {event?.status === "draft" && (
        <p className="text-xs font-light text-white/40 mb-4">*Drafts are only visible here — the public link starts working when you publish.</p>
      )}

      {statusChange.isError && (
        <StateBanner kind="error">{statusChange.error instanceof ApiError ? statusChange.error.message : "Status change failed"}</StateBanner>
      )}

      {/* status actions */}
      {event && !locked && (
        <BrickTile className="mb-6">
          <MicroLabel className="mb-3">Lifecycle</MicroLabel>
          <div className="flex flex-wrap gap-2">
            {event.status === "draft" && (
              <BrickButton onClick={() => statusChange.mutate("published")} disabled={statusChange.isPending}>Publish</BrickButton>
            )}
            {event.status === "published" && (
              <>
                <BrickButton variant="quiet" onClick={() => statusChange.mutate("registration_closed")} disabled={statusChange.isPending}>Close registration</BrickButton>
                <BrickButton variant="quiet" onClick={() => statusChange.mutate("draft")} disabled={statusChange.isPending}>Unpublish</BrickButton>
                <BrickButton variant="quiet" onClick={() => statusChange.mutate("completed")} disabled={statusChange.isPending}>Mark completed</BrickButton>
              </>
            )}
            {event.status === "registration_closed" && (
              <>
                <BrickButton variant="quiet" onClick={() => statusChange.mutate("published")} disabled={statusChange.isPending}>Reopen registration</BrickButton>
                <BrickButton variant="quiet" onClick={() => statusChange.mutate("completed")} disabled={statusChange.isPending}>Mark completed</BrickButton>
              </>
            )}
            {["published", "registration_closed"].includes(event.status) && (
              <BrickButton
                variant="quiet"
                className="border-red-400/70 text-red-200"
                disabled={statusChange.isPending}
                onClick={() => {
                  if (window.confirm(`Cancel "${event.title}"? All active tickets become invalid. You can notify attendees afterwards.`)) {
                    statusChange.mutate("cancelled");
                    setNotifyKind("event_cancellation");
                  }
                }}
              >
                Cancel event
              </BrickButton>
            )}
            <BrickButton variant="quiet" onClick={() => duplicate.mutate()} disabled={duplicate.isPending}>
              {duplicate.isPending ? "Duplicating…" : "Duplicate"}
            </BrickButton>
          </div>
        </BrickTile>
      )}
      {event && event.status === "cancelled" && (
        <BrickTile className="mb-6">
          <MicroLabel className="mb-3">Cancelled event</MicroLabel>
          <div className="flex flex-wrap gap-2">
            <BrickButton variant="quiet" onClick={() => setNotifyKind("event_cancellation")}>Notify attendees</BrickButton>
            <BrickButton variant="quiet" onClick={() => statusChange.mutate("archived")} disabled={statusChange.isPending}>Archive</BrickButton>
          </div>
        </BrickTile>
      )}
      {event && ["published", "registration_closed"].includes(event.status) && (
        <div className="flex flex-wrap gap-2 mb-6">
          <BrickButton variant="quiet" onClick={() => setNotifyKind("event_update")}>Notify attendees of changes…</BrickButton>
          <BrickButton variant="quiet" onClick={() => setNotifyKind("event_reminder")}>Send reminder…</BrickButton>
        </div>
      )}

      {notifyResult && <StateBanner kind="warn">{notifyResult}</StateBanner>}
      {/* notify modal-ish tile */}
      {notifyKind && event && (
        <BrickTile className="mb-6 border-amber-300/70">
          <MicroLabel className="mb-2">
            {notifyKind === "event_cancellation" ? "Notify attendees: cancellation" : notifyKind === "event_update" ? "Notify attendees: event update" : "Send reminder"}
          </MicroLabel>
          {notifyKind === "event_update" && (
            <Field label="What changed?" hint="Included in the email so attendees know exactly what's different.">
              {(id) => <TextArea id={id} rows={2} value={notifySummary} onChange={(e) => setNotifySummary(e.target.value)} />}
            </Field>
          )}
          {!notifyPreview ? (
            <div className="flex gap-2">
              <BrickButton variant="quiet" onClick={() => notify.mutate(false)} disabled={notify.isPending}>Preview send</BrickButton>
              <BrickButton variant="quiet" onClick={() => { setNotifyKind(null); setNotifyPreview(null); }}>Never mind</BrickButton>
            </div>
          ) : (
            <div>
              <p className="text-sm font-light mb-3" aria-live="polite">
                This will queue email for <strong>{notifyPreview.recipients}</strong> attendee{notifyPreview.recipients === 1 ? "" : "s"} with active registrations.
              </p>
              {!notifyPreview.deliveryEnabled && <StateBanner kind="warn">Email delivery is disabled. Messages will remain queued until the sender is verified and delivery is enabled.</StateBanner>}
              <div className="flex gap-2">
                <BrickButton onClick={() => notify.mutate(true)} disabled={notify.isPending}>
                  {notify.isPending ? "Queuing…" : `Send to ${notifyPreview.recipients}`}
                </BrickButton>
                <BrickButton variant="quiet" onClick={() => { setNotifyKind(null); setNotifyPreview(null); }}>Cancel</BrickButton>
              </div>
            </div>
          )}
          {notify.isError && <p role="alert" className="mt-2 text-xs text-red-300">Notification failed — try again.</p>}
        </BrickTile>
      )}

      {event && ["published", "registration_closed", "completed", "cancelled"].includes(event.status) && (
        <PassHolders eventId={event.id} />
      )}

      {/* the form */}
      <form
        noValidate
        onSubmit={(e) => { e.preventDefault(); if (!save.isPending && !locked) save.mutate(); }}
      >
        {saveError && <StateBanner kind="error">{saveError}</StateBanner>}
        {savedFlash && <StateBanner kind="success">Saved.</StateBanner>}
        {locked && <StateBanner kind="info">This event is {event?.status} and can no longer be edited.</StateBanner>}

        <fieldset disabled={!!locked} className="grid gap-x-8 md:grid-cols-2">
          <div>
            <Field label="Title" required>
              {(id) => <TextInput id={id} value={form.title} onChange={(e) => set("title", e.target.value)} maxLength={200} />}
            </Field>
            <Field label="Slug" hint={`Public link: /events/${form.slug || "…"}`}>
              {(id) => <TextInput id={id} value={form.slug} onChange={(e) => set("slug", e.target.value)} maxLength={80} placeholder="left blank = from title" />}
            </Field>
            <Field label="Subtitle">
              {(id) => <TextInput id={id} value={form.subtitle} onChange={(e) => set("subtitle", e.target.value)} maxLength={300} />}
            </Field>
            <Field label="Description" hint="Use the toolbar: bold, headings, lists, links and inline images.">
              {(id, describedBy) => (
                <RichTextEditor
                  id={id}
                  ariaDescribedBy={describedBy}
                  value={form.descriptionHtml}
                  onChange={(html) => set("descriptionHtml", html)}
                  imageUploadEventId={event?.id}
                />
              )}
            </Field>
            <Field label="Venue">
              {(id) => (
                <select id={id} value={form.venueId} onChange={(e) => set("venueId", e.target.value)}
                  className="w-full bg-black text-white border-2 border-white/50 rounded-[10px] px-4 py-2.5 text-base font-light focus:border-white/90 focus:outline-none">
                  <option value="">— no venue —</option>
                  {(venuesQuery.data?.venues ?? []).map((v) => (
                    <option key={v.id} value={v.id}>{v.name}{v.city ? ` (${v.city})` : ""}</option>
                  ))}
                </select>
              )}
            </Field>
            <VenueQuickAdd onCreated={(venue) => { qc.invalidateQueries({ queryKey: ["manage-venues"] }); set("venueId", venue.id); }} />

            {event && (
              <div className="mb-5">
                <MicroLabel className="mb-1.5">Hero image</MicroLabel>
                {event.heroImagePath && (
                  <img src={apiUrl(event.heroImagePath)} alt={event.heroImageAlt || ""} className="w-full aspect-[16/9] object-cover border-2 border-white/40 rounded-[10px] mb-2" />
                )}
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) upload.mutate(f); }} />
                <BrickButton type="button" variant="quiet" onClick={() => fileRef.current?.click()} disabled={upload.isPending}>
                  {upload.isPending ? "Uploading…" : event.heroImagePath ? "Replace image" : "Upload image"}
                </BrickButton>
                {uploadError && <p role="alert" className="mt-1.5 text-xs text-red-300">{uploadError}</p>}
                <p className="mt-1.5 text-xs text-white/40 font-light">JPEG/PNG/WebP, up to 8 MB. Re-encoded and resized automatically.</p>
              </div>
            )}
            {isNew && <p className="text-xs text-white/40 font-light mb-5">Save the event first to add a hero image and gallery.</p>}

            {event && (
              <GalleryManager
                eventId={event.id}
                gallery={(event.gallery as Array<{ path: string; alt: string }>) ?? []}
                onChanged={() => qc.invalidateQueries({ queryKey: ["manage-event", eventId] })}
              />
            )}
          </div>

          <div>
            {isNew && (
              <BrickTile className="mb-5">
                <MicroLabel className="mb-3">Repeat this event</MicroLabel>
                <Field label="Schedule" hint="Each date gets its own registration list and wallet tickets.">
                  {(id) => <select id={id} value={repeatFrequency} onChange={(e) => setRepeatFrequency(e.target.value)}
                    className="w-full bg-black text-white border-2 border-white/50 rounded-[10px] px-4 py-2.5">
                    <option value="none">One time</option>
                    <option value="weekly">Every week</option>
                    <option value="biweekly">Every two weeks</option>
                    <option value="monthly">Every month</option>
                  </select>}
                </Field>
                {repeatFrequency !== "none" && <>
                  <Field label="Number of dates" hint="Up to 52 dates. The first is the start date below.">
                    {(id) => <TextInput id={id} type="number" min={2} max={52} value={repeatCount}
                      onChange={(e) => setRepeatCount(Number(e.target.value))} />}
                  </Field>
                  <CheckboxRow checked={publishSeries} onChange={setPublishSeries}>
                    Publish all dates when saved
                  </CheckboxRow>
                </>}
              </BrickTile>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
              <Field label="Starts" required>
                {(id) => <TextInput id={id} type="datetime-local" value={form.startsAtLocal} onChange={(e) => set("startsAtLocal", e.target.value)} />}
              </Field>
              <Field label="Ends" required>
                {(id) => <TextInput id={id} type="datetime-local" value={form.endsAtLocal} onChange={(e) => set("endsAtLocal", e.target.value)} />}
              </Field>
            </div>
            <Field label="Timezone" hint="IANA name — times above are wall-clock in this zone">
              {(id) => <TextInput id={id} value={form.timezone} onChange={(e) => set("timezone", e.target.value)} placeholder="Asia/Bangkok" />}
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
              <Field label="Registration opens" hint="Blank = as soon as published">
                {(id) => <TextInput id={id} type="datetime-local" value={form.registrationOpensAtLocal} onChange={(e) => set("registrationOpensAtLocal", e.target.value)} />}
              </Field>
              <Field label="Registration closes" hint="Blank = when the event starts">
                {(id) => <TextInput id={id} type="datetime-local" value={form.registrationClosesAtLocal} onChange={(e) => set("registrationClosesAtLocal", e.target.value)} />}
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
              <Field label="Capacity" hint="Blank = unlimited">
                {(id) => <TextInput id={id} type="number" min={1} inputMode="numeric" value={form.capacity} onChange={(e) => set("capacity", e.target.value)} />}
              </Field>
              <Field label="Minimum age" hint="Blank = no restriction">
                {(id) => <TextInput id={id} type="number" min={1} max={99} inputMode="numeric" value={form.minAge} onChange={(e) => set("minAge", e.target.value)} />}
              </Field>
            </div>
            <CheckboxRow checked={form.showRemainingCapacity} onChange={(v) => set("showRemainingCapacity", v)}>
              Show remaining places on the public page
            </CheckboxRow>
            <Field label="Dress code">
              {(id) => <TextInput id={id} value={form.dressCode} onChange={(e) => set("dressCode", e.target.value)} />}
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
              <Field label="Contact email">
                {(id) => <TextInput id={id} type="email" value={form.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} />}
              </Field>
              <Field label="Contact phone">
                {(id) => <TextInput id={id} type="tel" value={form.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} />}
              </Field>
            </div>
            <Field label="Share title (Open Graph)" hint="Blank = event title">
              {(id) => <TextInput id={id} value={form.ogTitle} onChange={(e) => set("ogTitle", e.target.value)} />}
            </Field>
            <Field label="Share description" hint="Shown in link previews">
              {(id) => <TextArea id={id} rows={2} value={form.ogDescription} onChange={(e) => set("ogDescription", e.target.value)} />}
            </Field>

            <MicroLabel className="mb-2">FAQs</MicroLabel>
            {form.faqs.map((faq, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: FAQ positions remain stable while editing; text must not be used as a key.
              <div key={i} className="border border-white/20 rounded-[10px] p-3 mb-3">
                <Field label={`Question ${i + 1}`}>
                  {(id) => <TextInput id={id} value={faq.q} onChange={(e) => set("faqs", form.faqs.map((f, j) => j === i ? { ...f, q: e.target.value } : f))} />}
                </Field>
                <Field label="Answer">
                  {(id) => <TextArea id={id} rows={2} value={faq.a} onChange={(e) => set("faqs", form.faqs.map((f, j) => j === i ? { ...f, a: e.target.value } : f))} />}
                </Field>
                <BrickButton type="button" variant="quiet" onClick={() => set("faqs", form.faqs.filter((_, j) => j !== i))}>
                  Remove FAQ
                </BrickButton>
              </div>
            ))}
            {form.faqs.length < 20 && (
              <BrickButton type="button" variant="quiet" onClick={() => set("faqs", [...form.faqs, { q: "", a: "" }])}>
                Add FAQ
              </BrickButton>
            )}
          </div>
        </fieldset>

        {!locked && (
          <div className="mt-8 flex flex-wrap gap-3 items-center">
            <BrickButton type="submit" disabled={save.isPending} aria-live="polite">
              {save.isPending ? "Saving…" : isNew ? "Create draft" : "Save changes"}
            </BrickButton>
            {event && ["published", "registration_closed"].includes(event.status) && (
              <p className="text-xs font-light text-white/50">
                Changing the date, time, venue or title? Save first, then use "Notify attendees of changes".
              </p>
            )}
          </div>
        )}
      </form>
    </ManageLayout>
  );
}

function GalleryManager({ eventId, gallery, onChanged }: {
  eventId: string;
  gallery: Array<{ path: string; alt: string }>;
  onChanged: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const upload = useMutation({
    mutationFn: async (file: File) => {
      const body = new FormData();
      body.append("image", file);
      const res = await fetch(eventsApiUrl(`/manage/events/${eventId}/gallery`), {
        method: "POST", credentials: "same-origin", body,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new ApiError(res.status, json?.error || "Upload failed");
      return json;
    },
    onSuccess: () => { setError(null); onChanged(); },
    onError: (err) => setError(err instanceof Error ? err.message : "Upload failed"),
  });
  const remove = useMutation({
    mutationFn: (path: string) => api(`/manage/events/${eventId}/gallery/remove`, { method: "POST", json: { path } }),
    onSuccess: () => onChanged(),
    onError: (err) => setError(err instanceof ApiError ? err.message : "Remove failed"),
  });

  return (
    <div className="mb-5">
      <MicroLabel className="mb-1.5">Gallery ({gallery.length}/12)</MicroLabel>
      {gallery.length > 0 && (
        <ul className="grid grid-cols-3 gap-2 mb-2">
          {gallery.map((img) => (
            <li key={img.path} className="relative group">
              <img src={apiUrl(img.path)} alt={img.alt || ""} className="w-full aspect-square object-cover border-2 border-white/40 rounded-[10px]" />
              <button
                type="button"
                aria-label={`Remove gallery image${img.alt ? `: ${img.alt}` : ""}`}
                onClick={() => remove.mutate(img.path)}
                disabled={remove.isPending}
                className="absolute top-1 right-1 h-7 w-7 rounded-full bg-black/80 border border-white/60 text-white text-sm leading-none hover:bg-white hover:text-black transition-colors cursor-pointer"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) upload.mutate(f); e.target.value = ""; }} />
      <BrickButton type="button" variant="quiet" disabled={upload.isPending || gallery.length >= 12}
        onClick={() => fileRef.current?.click()}>
        {upload.isPending ? "Uploading…" : "Add gallery image"}
      </BrickButton>
      {error && <p role="alert" className="mt-1.5 text-xs text-red-300">{error}</p>}
      <p className="mt-1.5 text-xs text-white/40 font-light">Shown as a grid on the public event page.</p>
    </div>
  );
}

export function PassHolders({ eventId }: { eventId: string }) {
  const qc = useQueryClient();
  const stats = useQuery({
    queryKey: ["pass-holders", eventId],
    queryFn: () => api<{ passes: number; devices: number; googlePasses: number; appleIssued: number; currentMessage: string | null; messageAt: string | null }>(
      `/manage/events/${eventId}/pass-holders`,
    ),
  });
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<{ passes: number; googlePasses: number } | null>(null);
  const [sendResult, setSendResult] = useState<{ pushed: number; googleSent: number } | null>(null);
  const send = useMutation({
    mutationFn: (confirm: boolean) => api<{ preview?: boolean; passes: number; googlePasses?: number; pushed?: number; googleSent?: number }>(
      `/manage/events/${eventId}/pass-message`,
      { method: "POST", json: { message, confirm } },
    ),
    onSuccess: (result) => {
      if (result.preview) {
        setPreview({ passes: result.passes, googlePasses: result.googlePasses ?? 0 });
      } else {
        setSendResult({ pushed: result.pushed ?? 0, googleSent: result.googleSent ?? 0 });
        setPreview(null);
        setMessage("");
        qc.invalidateQueries({ queryKey: ["pass-holders", eventId] });
      }
    },
  });

  if (stats.isLoading) return <Spinner label="Loading wallet passes" />;
  if (stats.isError) return <StateBanner kind="error">Could not load wallet passes. Please refresh.</StateBanner>;
  if (!stats.data) return null;
  return (
    <BrickTile className="mb-6">
      <MicroLabel className="mb-2">Wallet passes</MicroLabel>
      <p className="mb-3 text-sm">Apple passes downloaded: {stats.data.appleIssued || 0} · Registered for updates: {stats.data.passes} · Devices: {stats.data.devices}</p>
      <p className="text-sm font-light text-white/70 mb-3">
        {stats.data.passes === 0
          ? `${stats.data.appleIssued || 0} Apple passes downloaded. No phones have registered for updates for this event yet; saved passes may not appear in the update count.`
          : `${stats.data.passes} ticket${stats.data.passes === 1 ? "" : "s"} live on ${stats.data.devices} device${stats.data.devices === 1 ? "" : "s"}. Passes update when event details change. Messages can appear on the lock screen if notifications are enabled.`}
      </p>
      {stats.data.googlePasses > 0 && <p className="text-sm font-light text-white/70 mb-3">{stats.data.googlePasses} Google Wallet passes issued. Issuing a pass does not confirm that it was saved.</p>}
      {stats.data.currentMessage && (
        <p className="text-xs font-light text-white/50 mb-3">
          Current message on passes: “{stats.data.currentMessage}”
          {stats.data.messageAt && ` (${new Date(stats.data.messageAt).toLocaleString()})`}
        </p>
      )}
      {sendResult && <StateBanner kind={sendResult.pushed + sendResult.googleSent > 0 ? "success" : "warn"}>Message saved. Apple accepted {sendResult.pushed} device update requests; Google accepted {sendResult.googleSent} pass messages. Delivery to phones is not guaranteed.</StateBanner>}
      {send.isError && <StateBanner kind="error">{send.error instanceof ApiError ? send.error.message : "Send failed"}</StateBanner>}
      {(stats.data.appleIssued > 0 || stats.data.passes > 0 || stats.data.googlePasses > 0) && (
        <>
          <Field label="Message to pass holders" hint="Max 300 characters. Shows on the pass; phone settings control notifications.">
            {(id) => <TextArea id={id} rows={2} maxLength={300} value={message} onChange={(e) => { setMessage(e.target.value); setPreview(null); }} />}
          </Field>
          {!preview ? (
            <BrickButton type="button" variant="quiet" disabled={!message.trim() || send.isPending}
              onClick={() => send.mutate(false)}>
              Preview send
            </BrickButton>
          ) : (
            <div className="flex gap-2 items-center">
              <BrickButton type="button" disabled={send.isPending} onClick={() => send.mutate(true)} aria-live="polite">
                {send.isPending ? "Sending…" : (preview.passes + preview.googlePasses > 0 ? `Send to ${preview.passes} Apple / ${preview.googlePasses} Google passes` : "Save message · no registered devices")}
              </BrickButton>
              <BrickButton type="button" variant="quiet" onClick={() => setPreview(null)}>Cancel</BrickButton>
            </div>
          )}
        </>
      )}
    </BrickTile>
  );
}

function VenueQuickAdd({ onCreated }: { onCreated: (venue: Venue) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [city, setCity] = useState("");
  const [mapUrl, setMapUrl] = useState("");
  const create = useMutation({
    mutationFn: () => api<{ venue: Venue }>("/manage/venues", {
      method: "POST", json: { name, addressLine1, city, mapUrl, country: "Thailand" },
    }),
    onSuccess: (result) => { onCreated(result.venue); setOpen(false); setName(""); setAddressLine1(""); setCity(""); setMapUrl(""); },
  });
  if (!open) {
    return (
      <p className="mb-5 -mt-3">
        <button type="button" onClick={() => setOpen(true)} className="text-xs font-light text-white/50 underline hover:text-white cursor-pointer">
          + Add a new venue
        </button>
      </p>
    );
  }
  return (
    <div className="border border-white/20 rounded-[10px] p-3 mb-5">
      {create.isError && <p role="alert" className="text-xs text-red-300 mb-2">{create.error instanceof ApiError ? create.error.message : "Could not create venue"}</p>}
      <Field label="Venue name" required>
        {(id) => <TextInput id={id} value={name} onChange={(e) => setName(e.target.value)} />}
      </Field>
      <Field label="Address">
        {(id) => <TextInput id={id} value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} />}
      </Field>
      <div className="grid grid-cols-2 gap-x-4">
        <Field label="City">
          {(id) => <TextInput id={id} value={city} onChange={(e) => setCity(e.target.value)} />}
        </Field>
        <Field label="Map link">
          {(id) => <TextInput id={id} type="url" placeholder="https://maps.app.goo.gl/…" value={mapUrl} onChange={(e) => setMapUrl(e.target.value)} />}
        </Field>
      </div>
      <div className="flex gap-2">
        <BrickButton type="button" variant="quiet" onClick={() => create.mutate()} disabled={create.isPending || !name.trim()}>
          {create.isPending ? "Adding…" : "Add venue"}
        </BrickButton>
        <BrickButton type="button" variant="quiet" onClick={() => setOpen(false)}>Cancel</BrickButton>
      </div>
    </div>
  );
}
