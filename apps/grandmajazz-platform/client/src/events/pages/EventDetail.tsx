import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { api, ApiError, fmtDateTime, fmtTime } from "../api";
import { BrickLinkButton, BrickTile, EmptyState, EventsLayout, MicroLabel, Spinner, StateBanner, BrickButton } from "../ui";
import { apiUrl } from "@/lib/api";
import { useState } from "react";

export interface PublicEventDetail {
  slug: string;
  title: string;
  subtitle: string | null;
  descriptionHtml: string;
  heroImagePath: string | null;
  heroImageAlt: string | null;
  gallery: Array<{ path: string; alt: string }>;
  startsAt: string;
  endsAt: string;
  timezone: string;
  registrationOpensAt: string | null;
  registrationClosesAt: string | null;
  dressCode: string | null;
  minAge: number | null;
  faqs: Array<{ q: string; a: string }>;
  contactEmail: string | null;
  contactPhone: string | null;
  venue: {
    name: string; addressLine1: string | null; addressLine2: string | null;
    city: string | null; country: string | null; mapUrl: string | null;
    latitude: string | null; longitude: string | null; accessibilityNotes: string | null;
  } | null;
  status: string;
  canonicalUrl: string;
  emailAvailable: boolean;
  registration: { state: string; remaining: number | null };
}

export function useEventDetail(slug: string | undefined) {
  return useQuery({
    queryKey: ["public-event", slug],
    enabled: !!slug,
    retry: (count, err) => !(err instanceof ApiError && err.status === 404) && count < 2,
    queryFn: () => api<{ event: PublicEventDetail }>(`/events/${slug}`),
  });
}

function ShareButton({ event }: { event: PublicEventDetail }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const data = { title: `${event.title} — Grandma Jazz`, url: event.canonicalUrl };
    if (navigator.share) {
      try { await navigator.share(data); return; } catch { /* user cancelled */ }
    }
    await navigator.clipboard.writeText(event.canonicalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };
  return (
    <BrickButton type="button" variant="quiet" onClick={share} aria-live="polite">
      {copied ? "Link copied" : "Share"}
    </BrickButton>
  );
}

export default function EventDetail() {
  const [, params] = useRoute("/events/:slug");
  const { data, isLoading, error } = useEventDetail(params?.slug);

  if (isLoading) return <EventsLayout><Spinner label="Loading event" /></EventsLayout>;
  if (error instanceof ApiError && error.status === 404) {
    return (
      <EventsLayout>
        <EmptyState title="We couldn't find that event">
          <a href="/events/" className="underline hover:text-[#B49B73]">See all events</a>
        </EmptyState>
      </EventsLayout>
    );
  }
  if (error || !data) {
    return <EventsLayout><StateBanner kind="error">Something went wrong loading this event. Please refresh.</StateBanner></EventsLayout>;
  }

  const event = data.event;
  const reg = event.registration;
  const cancelled = event.status === "cancelled";

  return (
    <EventsLayout>
      <article>
        {event.heroImagePath && (
          <img
            src={apiUrl(event.heroImagePath)}
            alt={event.heroImageAlt || ""}
            className="w-full aspect-[16/9] object-cover border border-[#B49B73]/40 rounded-[20px] mb-8"
          />
        )}
        <MicroLabel>{fmtDateTime(event.startsAt, event.timezone)} ({event.timezone})</MicroLabel>
        <h1 className="gj-display mt-3 text-4xl md:text-6xl leading-tight">{event.title}</h1>
        {event.subtitle && <p className="mt-4 text-base md:text-lg font-light text-[#e3dcd4]/75">{event.subtitle}</p>}

        {cancelled && (
          <div className="mt-5">
            <StateBanner kind="warn">This event has been cancelled. Tickets are no longer valid — we're sorry, my dear.</StateBanner>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3" role="group" aria-label="Event actions">
          {reg.state === "open" || reg.state === "limited" ? (
            <BrickLinkButton href={`/events/${event.slug}/register`}>
              Reserve your place{reg.state === "limited" && reg.remaining != null ? ` — ${reg.remaining} left` : ""}
            </BrickLinkButton>
          ) : (
            <span className="inline-block px-6 py-2.5 border border-[#B49B73]/40 rounded-full text-[#e3dcd4]/65 font-sans uppercase tracking-wider text-xs" aria-live="polite">
              {{
                not_yet_open: "Registration opens soon",
                full: "Fully booked",
                closed: "Registration closed",
                cancelled: "Event cancelled",
                completed: "This event has ended",
              }[reg.state] ?? "Registration unavailable"}
            </span>
          )}
          <ShareButton event={event} />
        </div>

        <BrickTile className="mt-8">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="gj-theme-label text-[11px] font-sans uppercase tracking-[0.2em]">When</dt>
              <dd className="mt-1 text-sm font-light">
                {fmtDateTime(event.startsAt, event.timezone)}
                <br />until {fmtTime(event.endsAt, event.timezone)} ({event.timezone})
              </dd>
            </div>
            {event.venue && (
              <div>
                <dt className="gj-theme-label text-[11px] font-sans uppercase tracking-[0.2em]">Where</dt>
                <dd className="mt-1 text-sm font-light">
                  {event.venue.name}
                  {event.venue.addressLine1 && <><br />{event.venue.addressLine1}</>}
                  {event.venue.city && <><br />{[event.venue.city, event.venue.country].filter(Boolean).join(", ")}</>}
                  {event.venue.mapUrl && (
                    <><br /><a className="underline hover:text-white" href={event.venue.mapUrl} target="_blank" rel="noopener noreferrer">Open map</a></>
                  )}
                </dd>
              </div>
            )}
            {reg.remaining != null && !cancelled && (
              <div>
                <dt className="gj-theme-label text-[11px] font-sans uppercase tracking-[0.2em]">Availability</dt>
                <dd className="mt-1 text-sm font-light" aria-live="polite">
                  {reg.state === "full" ? "Fully booked" : `${reg.remaining} places remaining`}
                </dd>
              </div>
            )}
            {event.minAge && (
              <div>
                <dt className="gj-theme-label text-[11px] font-sans uppercase tracking-[0.2em]">Age</dt>
                <dd className="mt-1 text-sm font-light">{event.minAge}+ only</dd>
              </div>
            )}
            {event.dressCode && (
              <div>
                <dt className="gj-theme-label text-[11px] font-sans uppercase tracking-[0.2em]">Dress code</dt>
                <dd className="mt-1 text-sm font-light">{event.dressCode}</dd>
              </div>
            )}
            {(event.contactEmail || event.contactPhone) && (
              <div>
                <dt className="gj-theme-label text-[11px] font-sans uppercase tracking-[0.2em]">Contact</dt>
                <dd className="mt-1 text-sm font-light">
                  {event.contactEmail && <a className="underline hover:text-white block" href={`mailto:${event.contactEmail}`}>{event.contactEmail}</a>}
                  {event.contactPhone && <a className="underline hover:text-white block" href={`tel:${event.contactPhone}`}>{event.contactPhone}</a>}
                </dd>
              </div>
            )}
          </dl>
          {event.venue?.accessibilityNotes && (
            <p className="mt-4 text-xs font-light text-white/60">Accessibility: {event.venue.accessibilityNotes}</p>
          )}
        </BrickTile>

        {event.descriptionHtml && (
          <div
            className="mt-8 text-[15px] font-light leading-relaxed text-[#e3dcd4]/85 [&_h2]:text-2xl [&_h2]:mt-6 [&_h2]:mb-2 [&_h3]:text-lg [&_h3]:mt-4 [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4 [&_a]:underline [&_a]:text-[#B49B73] [&_img]:max-w-full [&_img]:rounded-[20px] [&_img]:border [&_img]:border-[#B49B73]/40 [&_img]:my-4"
            // sanitized server-side with a strict allowlist before storage
            dangerouslySetInnerHTML={{ __html: event.descriptionHtml }}
          />
        )}

        {event.gallery?.length > 0 && (
          <div className="mt-8 grid grid-cols-2 md:grid-cols-3 gap-3">
            {event.gallery.map((img, i) => (
              <img key={i} src={apiUrl(img.path)} alt={img.alt || ""} loading="lazy"
                className="w-full aspect-square object-cover border border-[#B49B73]/40 rounded-[20px]" />
            ))}
          </div>
        )}

        {event.faqs?.length > 0 && (
          <section className="mt-10" aria-labelledby="faq-heading">
            <h2 id="faq-heading" className="gj-display text-2xl mb-4">Good to know</h2>
            <div className="space-y-3">
              {event.faqs.map((faq, i) => (
                <details key={i} className="border border-[#B49B73]/40 rounded-[20px] px-4 py-3 group">
                  <summary className="cursor-pointer text-sm font-sans tracking-wide list-none flex justify-between items-center">
                    {faq.q}
                    <span aria-hidden="true" className="text-white/50 group-open:rotate-45 transition-transform">+</span>
                  </summary>
                  <p className="mt-2 text-sm font-light text-white/75 leading-relaxed">{faq.a}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        <p className="mt-10">
          <a href="/events/" className="text-xs font-sans uppercase tracking-[0.2em] text-[#B49B73] underline hover:text-[#F5F1E6]">
            ← All events
          </a>
        </p>
      </article>
    </EventsLayout>
  );
}
