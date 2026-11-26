import type { EventFamilyIdentity } from "@shared/events-familyIdentity";
import { FamilyIdentityName } from "../FamilyIdentityName";
import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api, ApiError, eventsApiUrl } from "../api";
import { BrickButton, BrickTile, EmptyState, EventsLayout, MicroLabel, Spinner, StateBanner } from "../ui";
import { apiUrl } from "@/lib/api";

interface TicketData {
  ticket: {
    reference: string;
    status: "valid" | "cancelled" | "expired" | "payment_pending";
    checkedInAt: string | null;
    attendeeName: string;
    familyIdentity: EventFamilyIdentity | null;
    registrationStatus: string;
    paymentStatus?: "not_required" | "reserved" | "pending" | "confirmed";
    paymentAmountMinor?: number | null;
    paymentMethod?: string | null;
  };
  event: {
    title: string; subtitle: string | null; slug: string;
    startsAt: string; endsAt: string; timezone: string; whenText: string;
    status: string; minAge: number | null; dressCode: string | null;
    contactEmail: string | null; contactPhone: string | null;
    heroImagePath: string | null;
  };
  venue: { name: string; addressLine1: string | null; city: string | null; country: string | null; mapUrl: string | null } | null;
  qrSvg: string;
  paymentOptions?: {method:string;label:string;url?:string;amountLabel?:string;promptPayPhone?:string;bankAccount?:string;qrDataUrl?:string}[];
  calendar: { icsUrl: string; googleUrl: string };
  wallet: { apple: boolean; google: boolean };
  emailAvailable: boolean;
}

const STATUS_TEXT: Record<string, { label: string; kind: "success" | "warn" | "error" }> = {
  valid: { label: "Valid ticket", kind: "success" },
  cancelled: { label: "Cancelled — this ticket is no longer valid", kind: "error" },
  expired: { label: "Expired", kind: "warn" },
};

/** iPhone/iPad (incl. iPadOS reporting as Mac with touch) — where Wallet lives. */
function isAppleWalletDevice(): boolean {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return true;
  return navigator.platform === "MacIntel" && (navigator.maxTouchPoints ?? 0) > 1;
}

/**
 * Auto-present the iOS "Add Pass" sheet the first time a valid ticket is
 * opened on an Apple device. Navigating to the .pkpass URL triggers the
 * native sheet without leaving the page; iOS still asks the user to confirm
 * (nothing is added silently). Remembered per ticket so revisits aren't nagged.
 */
function useAutoWalletPrompt(data: TicketData | undefined, token: string | undefined, printMode: boolean) {
  useEffect(() => {
    if (!data || !token || printMode) return;
    if (!data.wallet.apple || data.ticket.status !== "valid" || data.event.status === "cancelled") return;
    if (!isAppleWalletDevice()) return;
    const key = `gj-wallet-prompted:${data.ticket.reference}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, new Date().toISOString());
    } catch {
      return; // storage unavailable (private mode quirks) — keep it manual
    }
    // small delay so the ticket renders first; the sheet then slides over it
    const timer = setTimeout(() => {
      window.location.href = eventsApiUrl(`/t/${token}/apple-wallet`);
    }, 900);
    return () => clearTimeout(timer);
  }, [data, token, printMode]);
}

export default function Ticket() {
  const [, params] = useRoute("/events/t/:token");
  const [, printParams] = useRoute("/events/t/:token/print");
  const token = params?.token || printParams?.token;
  const printMode = !!printParams;
  const [resent, setResent] = useState(false);
  const [paymentMethod,setPaymentMethod]=useState("");
  const [paymentReference,setPaymentReference]=useState("");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["ticket", token],
    enabled: !!token,
    retry: (count, err) => !(err instanceof ApiError && err.status === 404) && count < 2,
    queryFn: () => api<TicketData>(`/t/${token}`),
  });

  const resend = useMutation({
    mutationFn: () => api(`/t/${token}/resend`, { method: "POST" }),
    onSuccess: () => setResent(true),
  });

  const reportPayment=useMutation({mutationFn:()=>api(`/t/${token}/report-payment`,{method:"POST",json:{method:paymentMethod,reference:paymentReference}}),onSuccess:()=>{setPaymentReference("");void refetch();}});
  useAutoWalletPrompt(data, token, printMode);

  if (isLoading) return <EventsLayout><Spinner label="Loading your ticket" /></EventsLayout>;
  if (error instanceof ApiError && error.status === 404) {
    return (
      <EventsLayout>
        <EmptyState title="We couldn't find that ticket">
          <p>The link may be incomplete — check the ticket link you saved after booking.</p>
        </EmptyState>
      </EventsLayout>
    );
  }
  if (error || !data) {
    return <EventsLayout><StateBanner kind="error">Something went wrong loading your ticket. Please refresh.</StateBanner></EventsLayout>;
  }

  const { ticket, event, venue, qrSvg, calendar, wallet } = data;
  const status = STATUS_TEXT[ticket.status] ?? STATUS_TEXT.valid;
  const pendingPayment = ticket.status === "payment_pending" && event.status !== "cancelled";
  const cancelled = ticket.status !== "valid" || event.status === "cancelled";

  return (
    <EventsLayout>
      <div className={printMode ? "print-ticket" : ""}>
        <div className="text-center mb-6 print:hidden">
          <MicroLabel>{pendingPayment ? "Your reservation" : "Your ticket"}</MicroLabel>
        </div>

        <BrickTile className="max-w-md mx-auto text-center">
          <p className="gj-theme-label text-[11px] font-sans uppercase tracking-[0.2em]">Grandma Jazz presents</p>
          <h1 className="gj-display mt-2 text-3xl">{event.title}</h1>
          {event.subtitle && <p className="mt-1 text-sm font-light text-white/70">{event.subtitle}</p>}
          <p className="mt-3 text-sm font-light">{event.whenText}</p>
          <p className="text-xs font-light text-white/60">({event.timezone})</p>
          {venue && (
            <p className="mt-2 text-sm font-light text-white/80">
              {[venue.name, venue.addressLine1, venue.city].filter(Boolean).join(" · ")}
              {venue.mapUrl && (
                <>
                  {" "}
                  <a href={venue.mapUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-white print:hidden">map</a>
                </>
              )}
            </p>
          )}

          {!pendingPayment && <div className="my-6 flex justify-center">
            <div
              className={`w-52 h-52 bg-white p-2 rounded-[10px] ${cancelled ? "opacity-30" : ""}`}
              role="img"
              aria-label={`QR code for ticket ${ticket.reference}`}
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
          </div>}

          <div aria-live="polite">
            {pendingPayment ? <StateBanner kind="info">{ticket.paymentStatus === "pending" ? "Payment reported — awaiting AC’s verification." : "Seat reserved — awaiting payment."} Your boarding ticket will unlock once payment is verified.</StateBanner> : cancelled ? (
              <StateBanner kind={event.status === "cancelled" ? "warn" : "error"}>
                {event.status === "cancelled" ? "This event has been cancelled — the ticket is no longer valid." : status.label}
              </StateBanner>
            ) : ticket.checkedInAt ? (
              <p className="inline-block border border-[#B49B73]/60 rounded-full px-4 py-1 text-[11px] font-sans uppercase tracking-[0.2em] text-white/70">
                ✓ Checked in
              </p>
            ) : (
              <p className="inline-block border border-[#B49B73] rounded-full px-4 py-1 text-[11px] font-sans uppercase tracking-[0.2em] text-[#B49B73]">
                {status.label}
              </p>
            )}
          </div>

          <div className="mt-5 border-t border-[#B49B73]/30 pt-4">
            <div className="flex justify-center text-base font-light"><FamilyIdentityName identity={ticket.familyIdentity} fallbackName={ticket.attendeeName} /></div>
            <p className="mt-1 text-xs font-sans tracking-[0.25em] text-white/60">{ticket.reference}</p>
            {event.minAge && <p className="mt-2 text-xs font-light text-white/60">{event.minAge}+ event — bring ID</p>}
            {event.dressCode && <p className="mt-1 text-xs font-light text-white/60">Dress: {event.dressCode}</p>}
          </div>
        </BrickTile>

        {pendingPayment && !printMode && <BrickTile className="max-w-md mx-auto mt-6 space-y-4">
          <h2 className="gj-display text-xl">Cruise and food only</h2>
          <p>฿{((ticket.paymentAmountMinor || 0)/100).toLocaleString("en-GB")} per Family seat.</p>
          {(data.paymentOptions || []).map(option => <div key={option.method} className="space-y-2">{option.url ? <a href={option.url} target="_blank" rel="noopener noreferrer" className="gj-theme-button block px-5 py-3 text-center">{option.label} · {option.amountLabel}</a> : <h3 className="text-center">{option.label} · {option.amountLabel}</h3>}{option.qrDataUrl && <img src={option.qrDataUrl} alt="SCB PromptPay QR for ฿2,000" className="w-52 mx-auto"/>}{option.promptPayPhone && <p>PromptPay mobile: {option.promptPayPhone}</p>}{option.bankAccount && <p>SCB account: {option.bankAccount}</p>}{option.method==="scb" && <p className="text-xs opacity-70">Confirm the recipient name in your banking app before paying.</p>}</div>)}
          {(data.paymentOptions || []).length ? <form className="space-y-3" onSubmit={e=>{e.preventDefault();reportPayment.mutate();}}><label className="block">Payment method<select value={paymentMethod} onChange={e=>setPaymentMethod(e.target.value)} required className="block w-full bg-black border rounded p-2"><option value="">Choose method</option>{data.paymentOptions?.map(option=><option key={option.method} value={option.method}>{option.label}</option>)}</select></label><label className="block">Payment transaction reference<input value={paymentReference} onChange={e=>setPaymentReference(e.target.value)} required minLength={3} maxLength={120} className="block w-full bg-black border rounded p-2"/></label><BrickButton type="submit" disabled={reportPayment.isPending}>Report my payment</BrickButton>{reportPayment.error && <StateBanner kind="error">{reportPayment.error.message}</StateBanner>}</form> : <p>Payment instructions will be supplied directly by AC. Contact <a className="underline" href="mailto:ac@grandmajazz.com">AC</a> before transferring money.</p>}
          <p className="text-xs opacity-70">Reporting payment does not verify or confirm it. AC checks the actual transaction before your boarding ticket is released.</p>
        </BrickTile>}
        {!printMode && (
          <div className="mt-8 max-w-md mx-auto space-y-3 print:hidden">
            {!cancelled && <MicroLabel className="text-center">Save to your phone</MicroLabel>}
            {!cancelled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <a href={apiUrl(calendar.icsUrl.replace(/^\//, ""))} className="gj-theme-button block text-center px-6 py-2.5 text-xs uppercase transition-colors">
                  Apple / phone calendar
                </a>
                <a href={calendar.googleUrl} target="_blank" rel="noopener noreferrer" className="gj-theme-button block text-center px-6 py-2.5 text-xs uppercase transition-colors">
                  Google Calendar
                </a>
                {wallet.apple && (
                  <a href={eventsApiUrl(`/t/${token}/apple-wallet`)} className="gj-theme-button block text-center px-6 py-2.5 text-xs uppercase transition-colors">
                    Add to Apple Wallet
                  </a>
                )}
                {wallet.google && (
                  <a href={eventsApiUrl(`/t/${token}/google-wallet`)} className="gj-theme-button block text-center px-6 py-2.5 text-xs uppercase transition-colors">
                    Add to Google Wallet
                  </a>
                )}
              </div>
            )}
            {resend.isError && <StateBanner kind="error">We could not email your ticket. Please try again.</StateBanner>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <BrickButton type="button" variant="quiet" className="w-full" onClick={() => window.print()}>
                Print ticket
              </BrickButton>
              {!cancelled && data.emailAvailable && (
                <BrickButton type="button" variant="quiet" className="w-full" disabled={resend.isPending || resent}
                  onClick={() => resend.mutate()} aria-live="polite">
                  {resent ? "Queued — check your inbox shortly" : resend.isPending ? "Sending…" : "Email me this ticket"}
                </BrickButton>
              )}
            </div>
            {(event.contactEmail || event.contactPhone) && (
              <p className="text-center text-xs font-light text-white/50">
                Questions?{" "}
                {event.contactEmail && <a className="underline hover:text-white" href={`mailto:${event.contactEmail}`}>{event.contactEmail}</a>}
                {event.contactEmail && event.contactPhone && " · "}
                {event.contactPhone && <a className="underline hover:text-white" href={`tel:${event.contactPhone}`}>{event.contactPhone}</a>}
              </p>
            )}
            <p className="text-center">
              <Link href={`/events/${event.slug}`} className="text-xs font-sans uppercase tracking-[0.2em] text-white/50 underline hover:text-white">
                Event details
              </Link>
            </p>
          </div>
        )}
      </div>

      <style>{`
        @media print {
          body { background: #fff !important; }
          header, footer, .print\\:hidden { display: none !important; }
          .print-ticket, main { color: #000 !important; }
          main [class*="border-white"] { border-color: #000 !important; }
          main .bg-black, main [class*="bg-black"] { background: #fff !important; color: #000 !important; }
          main .gj-theme-panel { background: #fff !important; color: #000 !important; border-color: #000 !important; }
          main [class*="text-white"] { color: #000 !important; }
        }
      `}</style>
    </EventsLayout>
  );
}
