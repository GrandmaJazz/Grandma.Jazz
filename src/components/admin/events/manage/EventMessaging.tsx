import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { api, ApiError } from "../api";
import { BrickButton, BrickTile, Field, MicroLabel, StateBanner, TextArea } from "../ui";
import { PassHolders } from "./EventEdit";

export default function EventMessaging() {
  const events = useQuery({ queryKey: ["manage-events", ""], queryFn: () => api<{ events: { id: string; title: string; status: string }[] }>("/manage/events") });
  const [selected, setSelected] = useState("");
  return <section className="mb-8" aria-label="Apple passes and event messaging">
    <BrickTile className="mb-4"><MicroLabel>Apple passes & attendee messaging</MicroLabel>
      <p className="my-3 text-sm">Choose an event to see registered Apple passes, send wallet messages or email attendees.</p>
      {events.isError && <StateBanner kind="error">Could not load events. Please refresh.</StateBanner>}
      <label className="block">Event<select className="block w-full bg-black border border-white/50 rounded-[10px] p-3 mt-2" value={selected} onChange={event => setSelected(event.target.value)}>
        <option value="">{events.isLoading ? "Loading events…" : "Select an event"}</option>
        {events.data?.events.map(event => <option key={event.id} value={event.id}>{event.title} ({event.status})</option>)}
      </select></label>
      {selected && <Link className="block underline mt-4" href={`/events/manage/events/${selected}`}>Edit this event and its pass details →</Link>}
    </BrickTile>
    {selected && <div key={selected}><PassHolders eventId={selected} /><AttendeeMessage eventId={selected} /></div>}
  </section>;
}
function AttendeeMessage({ eventId }: { eventId: string }) {
  const [kind, setKind] = useState("event_update");
  const [summary, setSummary] = useState("");
  const [preview, setPreview] = useState<{ recipients: number; deliveryEnabled: boolean } | null>(null);
  const [result, setResult] = useState("");
  const send = useMutation({ mutationFn: (confirm: boolean) => api<{ preview?: boolean; recipients?: number; queued?: number; deliveryEnabled: boolean }>(`/manage/events/${eventId}/notify`, { method: "POST", json: { kind, changeSummary: summary, confirm } }),
    onSuccess: data => { if (data.preview) setPreview({ recipients: data.recipients || 0, deliveryEnabled: data.deliveryEnabled });
      else { setResult(data.deliveryEnabled ? `${data.queued || 0} attendee emails queued for delivery.` : "Delivery is disabled; no email has been sent."); setPreview(null); } },
  });
  return <BrickTile><MicroLabel>Email attendees</MicroLabel>
    {result && <StateBanner kind="info">{result}</StateBanner>}
    {send.isError && <StateBanner kind="error">{send.error instanceof ApiError ? send.error.message : "Message failed. Please retry."}</StateBanner>}
    <Field label="Message type">{id => <select id={id} className="bg-black border border-white/50 p-2" value={kind} onChange={event => { setKind(event.target.value); setPreview(null); setResult(""); }}><option value="event_update">Event update</option><option value="event_reminder">Reminder</option><option value="event_cancellation">Cancellation notice</option></select>}</Field>
    <Field label="Message" hint="Included with the event details in the attendee email. Maximum 1,000 characters.">{id => <TextArea id={id} rows={4} maxLength={1000} value={summary} onChange={event => { setSummary(event.target.value); setPreview(null); setResult(""); }} />}</Field>
    {!preview ? <BrickButton type="button" disabled={send.isPending || !summary.trim()} onClick={() => send.mutate(false)}>Preview recipients</BrickButton> : <div>
      <p className="mb-3">This email will go to {preview.recipients} confirmed attendees.</p>
      {!preview.deliveryEnabled && <StateBanner kind="warn">Event email delivery is not connected. Enable delivery before sending.</StateBanner>}
      <div className="flex gap-3"><BrickButton type="button" disabled={send.isPending || !preview.deliveryEnabled || !preview.recipients} onClick={() => send.mutate(true)}>{send.isPending ? "Queuing…" : `Send to ${preview.recipients} attendees`}</BrickButton><BrickButton type="button" variant="quiet" onClick={() => setPreview(null)}>Cancel</BrickButton></div>
    </div>}
  </BrickTile>;
}
