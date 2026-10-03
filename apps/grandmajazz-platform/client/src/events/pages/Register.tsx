import { useMemo, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { api, ApiError, fmtDateTime } from "../api";
import { useEventDetail } from "./EventDetail";
import {
  BrickButton, BrickTile, CheckboxRow, EmptyState, EventsLayout, Field,
  MicroLabel, Spinner, StateBanner, TextArea, TextInput,
} from "../ui";

interface RegisterResponse {
  ticketToken: string;
  ticketReference: string;
  duplicate: boolean;
}

export default function Register() {
  const [, params] = useRoute("/events/:slug/register");
  const [, navigate] = useLocation();
  const { data, isLoading, error } = useEventDetail(params?.slug);

  // one idempotency key per form mount: refresh-resubmits reuse the same registration
  const idempotencyKey = useMemo(() => crypto.randomUUID(), []);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [resent, setResent] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      api<RegisterResponse>(`/events/${params?.slug}/register`, {
        method: "POST",
        json: {
          fullName, email, phone, notes,
          ageConfirmed, termsAccepted, marketingConsent,
          idempotencyKey,
          website: "", // honeypot — humans never fill this
        },
      }),
    onSuccess: (result) => {
      navigate(`/events/t/${result.ticketToken}`);
    },
  });

  const resendMutation = useMutation({
    mutationFn: () => api(`/events/${params?.slug}/resend-ticket`, { method: "POST", json: { email } }),
    onSuccess: () => setResent(true),
  });

  if (isLoading) return <EventsLayout><Spinner label="Loading" /></EventsLayout>;
  if (error || !data) {
    return (
      <EventsLayout>
        <EmptyState title="We couldn't find that event">
          <a href="/events/" className="underline hover:text-[#B49B73]">See all events</a>
        </EmptyState>
      </EventsLayout>
    );
  }
  const event = data.event;
  const open = event.registration.state === "open" || event.registration.state === "limited";

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.fullName = "Please tell us your name";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) errs.email = "Please enter a valid email address";
    if (phone.trim().replace(/[\s().-]/g, "").length < 6) errs.phone = "Please enter a valid phone number";
    if (event.minAge && !ageConfirmed) errs.age = `Please confirm you are ${event.minAge} or older`;
    if (!termsAccepted) errs.terms = "Please accept the event terms";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submitError = mutation.error instanceof ApiError ? mutation.error : null;
  const duplicateEmail = submitError?.code === "duplicate_email";

  return (
    <EventsLayout>
      <MicroLabel>{fmtDateTime(event.startsAt, event.timezone)}</MicroLabel>
      <h1 className="gj-display mt-2 mb-2 text-4xl md:text-5xl">{event.title}</h1>
      <p className="mb-8 text-sm font-light text-[#e3dcd4]/70">Reserve your place — it takes half a minute.</p>

      {!open ? (
        <StateBanner kind="info">
          Registration is not available right now (
          {{
            not_yet_open: "it hasn't opened yet",
            full: "the event is fully booked",
            closed: "it has closed",
            cancelled: "the event was cancelled",
            completed: "the event has ended",
          }[event.registration.state] ?? "unavailable"}
          ). <Link href={`/events/${event.slug}`} className="underline">Back to the event</Link>
        </StateBanner>
      ) : (
        <BrickTile>
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (validate() && !mutation.isPending) mutation.mutate();
            }}
          >
            {submitError && !duplicateEmail && (
              <StateBanner kind="error">{submitError.message}</StateBanner>
            )}
            {duplicateEmail && (
              <StateBanner kind="warn">
                <p>{submitError!.message}</p>
                {event.emailAvailable ? <div className="mt-3">
                  {resent ? (
                    <span role="status">Done — check your inbox (and spam folder).</span>
                  ) : (
                    <BrickButton type="button" onClick={() => resendMutation.mutate()} disabled={resendMutation.isPending}>
                      {resendMutation.isPending ? "Sending…" : "Resend my ticket"}
                    </BrickButton>
                  )}
                </div> : <p className="mt-3">Please contact Grandma Jazz if you need your ticket link again.</p>}
              </StateBanner>
            )}

            <Field label="Full name" required error={fieldErrors.fullName}>
              {(id, describedBy) => (
                <TextInput id={id} aria-describedby={describedBy} aria-invalid={!!fieldErrors.fullName}
                  autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              )}
            </Field>
            <Field label="Email" required hint={event.emailAvailable ? "Your ticket is sent here" : "Your ticket opens in your browser after booking"} error={fieldErrors.email}>
              {(id, describedBy) => (
                <TextInput id={id} type="email" inputMode="email" aria-describedby={describedBy} aria-invalid={!!fieldErrors.email}
                  autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              )}
            </Field>
            <Field label="Phone" required error={fieldErrors.phone}>
              {(id, describedBy) => (
                <TextInput id={id} type="tel" inputMode="tel" aria-describedby={describedBy} aria-invalid={!!fieldErrors.phone}
                  autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
              )}
            </Field>
            <Field label="Notes (optional)" hint="Anything we should know — allergies, wheelchair access, a special occasion">
              {(id) => (
                <TextArea id={id} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} />
              )}
            </Field>

            {/* honeypot: visually hidden, tabbable-skipped */}
            <div className="absolute -left-[9999px] top-auto" aria-hidden="true">
              <label htmlFor="reg-website">Website</label>
              <input id="reg-website" name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
            </div>

            {event.minAge && (
              <CheckboxRow checked={ageConfirmed} onChange={setAgeConfirmed} required>
                I confirm I am {event.minAge} or older
                {fieldErrors.age && <span role="alert" className="block text-red-300">{fieldErrors.age}</span>}
              </CheckboxRow>
            )}
            <CheckboxRow checked={termsAccepted} onChange={setTermsAccepted} required>
              I agree that Grandma Jazz uses these details to manage my registration and entry for this event.
              {fieldErrors.terms && <span role="alert" className="block text-red-300">{fieldErrors.terms}</span>}
            </CheckboxRow>
            <CheckboxRow checked={marketingConsent} onChange={setMarketingConsent}>
              Keep me posted about future Grandma Jazz nights (optional)
            </CheckboxRow>

            <div className="mt-6">
              <BrickButton type="submit" disabled={mutation.isPending} className="w-full sm:w-auto" aria-live="polite">
                {mutation.isPending ? "Reserving…" : "Reserve my place"}
              </BrickButton>
            </div>
          </form>
        </BrickTile>
      )}

      <p className="mt-8">
        <Link href={`/events/${event.slug}`} className="text-xs font-sans uppercase tracking-[0.2em] text-[#B49B73] underline hover:text-[#F5F1E6]">
          ← Back to the event
        </Link>
      </p>
    </EventsLayout>
  );
}
