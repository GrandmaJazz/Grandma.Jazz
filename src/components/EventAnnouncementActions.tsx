'use client';

import { useState } from 'react';
import { analogEventUrl, analogGoogleCalendarUrl, shareAnalogEvent } from '@/lib/eventAnnouncementTools';

export default function EventAnnouncementActions() {
  const [result, setResult] = useState('');
  const [busy, setBusy] = useState(false);
  async function share() {
    setBusy(true);
    const outcome = await shareAnalogEvent({
      share: typeof navigator.share === 'function' ? data => navigator.share(data) : undefined,
      clipboard: navigator.clipboard,
    });
    setResult(outcome);
    setBusy(false);
  }
  return (
    <section aria-label="Save and share this event" className="mt-6">
      <div className="flex flex-wrap items-start gap-3">
        <details className="max-w-full">
          <summary className="gj-cta cursor-pointer list-none">Save the date</summary>
          <div className="mt-3 flex flex-col gap-2">
            <a className="gj-cta gj-cta--quiet gj-cta--compact" href="/events/analog-by-beycan-001/calendar.ics/" download="analog-by-beycan-001.ics">Apple / Outlook calendar</a>
            <a className="gj-cta gj-cta--quiet gj-cta--compact" href={analogGoogleCalendarUrl} target="_blank" rel="noopener noreferrer">Google Calendar</a>
          </div>
        </details>
        <button type="button" className="gj-cta gj-cta--quiet" onClick={share} disabled={busy}>Share event <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10" /></svg></button>
      </div>
      <p className="mt-3 text-xs font-roboto-light text-[#e3dcd4]/60">Saving the date does not reserve a place.</p>
      <p role="status" aria-live="polite" className="mt-2 text-sm text-[#B49B73]">{result === 'copied' ? 'Event link copied.' : result === 'unavailable' ? 'Copy the event link below to share it.' : ''}</p>
      {result === 'unavailable' && <input aria-label="Event link" readOnly value={analogEventUrl} className="mt-2 w-full rounded border border-[#B49B73]/40 bg-black p-3 text-sm text-[#e3dcd4]" onFocus={e => e.currentTarget.select()} />}
    </section>
  );
}
