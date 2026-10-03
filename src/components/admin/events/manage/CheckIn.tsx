import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useRoute } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { ManageLayout } from "./ManageLayout";
import { BrickButton, BrickTile, MicroLabel, StateBanner, TextInput } from "../ui";

/**
 * Mobile-first door check-in. Camera scanning uses the native BarcodeDetector
 * where available (Chrome/Android) and falls back to jsQR frame decoding
 * (iOS Safari). Manual reference entry and attendee search always available.
 */

type ScanResult =
  | { result: "checked_in"; ticket: TicketInfo }
  | { result: "already_checked_in"; ticket: TicketInfo; checkedInAt: string }
  | { result: "cancelled_ticket"; ticket: TicketInfo }
  | { result: "expired_ticket"; ticket: TicketInfo }
  | { result: "wrong_event"; eventTitle: string }
  | { result: "event_cancelled" }
  | { result: "unknown_ticket" };

interface TicketInfo { reference: string; attendeeName: string; eventTitle: string }

const RESULT_PRESENTATION: Record<ScanResult["result"], { icon: string; label: string; cls: string }> = {
  checked_in: { icon: "✓", label: "Welcome in", cls: "border-white bg-white text-black" },
  already_checked_in: { icon: "↩", label: "Already checked in", cls: "border-amber-300 text-amber-100" },
  cancelled_ticket: { icon: "✕", label: "Cancelled ticket", cls: "border-red-400 text-red-200" },
  expired_ticket: { icon: "✕", label: "Expired ticket", cls: "border-red-400 text-red-200" },
  wrong_event: { icon: "✕", label: "Wrong event", cls: "border-red-400 text-red-200" },
  event_cancelled: { icon: "✕", label: "Event cancelled", cls: "border-red-400 text-red-200" },
  unknown_ticket: { icon: "?", label: "Unknown ticket", cls: "border-red-400 text-red-200" },
};

type CameraState = "idle" | "starting" | "active" | "denied" | "unavailable";

export default function CheckIn() {
  const [, params] = useRoute("/events/manage/events/:eventId/check-in");
  const eventId = params?.eventId;

  const summary = useQuery({
    queryKey: ["checkin-summary", eventId],
    enabled: !!eventId,
    refetchInterval: 10_000, // near-real-time totals via polling
    queryFn: () => api<{ eventTitle: string; eventStatus: string; confirmed: number; checkedIn: number }>(
      `/manage/events/${eventId}/check-in/summary`,
    ),
  });

  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [manualRef, setManualRef] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const lastCodeRef = useRef<{ code: string; at: number }>({ code: "", at: 0 });

  const scan = useMutation({
    mutationFn: ({ code, source }: { code: string; source: "qr" | "manual" }) => api<ScanResult>(`/manage/events/${eventId}/check-in/scan`, {
      method: "POST",
      json: { code, source, idempotencyKey: crypto.randomUUID() },
    }),
    onSuccess: (result) => {
      setLastResult(result);
      summary.refetch();
      if (navigator.vibrate) navigator.vibrate(result.result === "checked_in" ? 80 : [60, 60, 60]);
    },
  });

  const onCode = useCallback((code: string) => {
    const now = Date.now();
    // debounce: the camera decodes the same QR many times per second
    if (lastCodeRef.current.code === code && now - lastCodeRef.current.at < 4000) return;
    lastCodeRef.current = { code, at: now };
    scan.mutate({ code, source: "qr" });
  }, [scan]);

  const search = useQuery({
    queryKey: ["checkin-search", eventId, searchQ],
    enabled: !!eventId && searchQ.trim().length >= 2,
    queryFn: () => api<{ results: Array<{ fullName: string; reference: string; status: string; checkedInAt: string | null }> }>(
      `/manage/events/${eventId}/check-in/search?q=${encodeURIComponent(searchQ)}`,
    ),
  });

  const offline = useOffline();

  return (
    <ManageLayout title="Check-in" minRole="checkin_staff">
      <p className="mb-4 -mt-3">
        <Link href={`/events/manage/events/${eventId}`} className="text-xs font-sans uppercase tracking-[0.18em] text-white/50 underline hover:text-white">
          ← Event
        </Link>
      </p>

      {offline && (
        <StateBanner kind="warn">
          You're offline. Scanning is paused — reconnect to continue. (Scans are verified against the server.)
        </StateBanner>
      )}

      {summary.data && (
        <BrickTile className="mb-5 flex items-center justify-between gap-4 py-4">
          <div>
            <MicroLabel>{summary.data.eventTitle}</MicroLabel>
            {summary.data.eventStatus === "cancelled" && (
              <p className="text-red-300 text-xs mt-1 font-sans uppercase tracking-[0.15em]">Event cancelled</p>
            )}
          </div>
          <p className="text-2xl font-galvji-light whitespace-nowrap" aria-live="polite">
            {summary.data.checkedIn}<span className="text-white/40 text-lg"> / {summary.data.confirmed}</span>
          </p>
        </BrickTile>
      )}

      <div aria-live="assertive">
        {lastResult && <ResultCard result={lastResult} />}
        {scan.isError && <StateBanner kind="error">Scan failed — check your connection and try again.</StateBanner>}
      </div>

      <Scanner onCode={onCode} paused={offline || scan.isPending} />

      <BrickTile className="mt-5">
        <MicroLabel className="mb-2">Manual entry</MicroLabel>
        <form
          className="flex gap-2"
          onSubmit={(e) => { e.preventDefault(); if (manualRef.trim()) { scan.mutate({ code: manualRef.trim(), source: "manual" }); setManualRef(""); } }}
        >
          <TextInput
            aria-label="Ticket reference"
            placeholder="GJ-XXXX-XXXX"
            value={manualRef}
            onChange={(e) => setManualRef(e.target.value.toUpperCase())}
            autoCapitalize="characters"
            autoCorrect="off"
            className="font-mono tracking-[0.2em]"
          />
          <BrickButton type="submit" disabled={offline || scan.isPending || !manualRef.trim()}>Check</BrickButton>
        </form>
      </BrickTile>

      <BrickTile className="mt-5">
        <MicroLabel className="mb-2">Find attendee</MicroLabel>
        <TextInput
          aria-label="Search attendees by name"
          placeholder="Start typing a name…"
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
        />
        {search.data && searchQ.trim().length >= 2 && (
          <ul className="mt-3 space-y-2" aria-live="polite">
            {search.data.results.length === 0 && <li className="text-sm font-light text-white/50">No matches.</li>}
            {search.data.results.map((row) => (
              <li key={row.reference} className="flex items-center gap-3 border border-white/20 rounded-[10px] px-3 py-2 text-sm font-light">
                <span className="flex-1">{row.fullName}</span>
                <span className="font-mono text-xs tracking-[0.15em] text-white/50">{row.reference}</span>
                {row.checkedInAt ? (
                  <span className="text-[10px] font-sans uppercase tracking-[0.15em] text-amber-100 border border-amber-300/60 rounded-full px-2 py-0.5">in</span>
                ) : row.status === "valid" ? (
                  <BrickButton variant="quiet" className="px-3 py-1 text-[10px]" onClick={() => scan.mutate({ code: row.reference, source: "manual" })} disabled={offline || scan.isPending}>
                    Check in
                  </BrickButton>
                ) : (
                  <span className="text-[10px] font-sans uppercase tracking-[0.15em] text-red-200 border border-red-400/60 rounded-full px-2 py-0.5">{row.status}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </BrickTile>
    </ManageLayout>
  );
}

function ResultCard({ result }: { result: ScanResult }) {
  const p = RESULT_PRESENTATION[result.result];
  return (
    <div className={`border-2 rounded-[10px] px-5 py-4 mb-5 ${p.cls}`}>
      <p className="text-lg font-galvji-light tracking-extra-wide">
        <span aria-hidden="true">{p.icon} </span>{p.label}
      </p>
      {"ticket" in result && result.ticket && (
        <p className="mt-1 text-sm font-light">
          {result.ticket.attendeeName} · {result.ticket.reference}
        </p>
      )}
      {result.result === "already_checked_in" && result.checkedInAt && (
        <p className="mt-1 text-xs font-light opacity-80">
          First checked in at {new Date(result.checkedInAt).toLocaleTimeString()} — if that wasn't them, alert a manager.
        </p>
      )}
      {result.result === "wrong_event" && (
        <p className="mt-1 text-xs font-light opacity-80">This ticket is for: {result.eventTitle}</p>
      )}
    </div>
  );
}

function useOffline(): boolean {
  const [offline, setOffline] = useState(!navigator.onLine);
  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);
  return offline;
}

function Scanner({ onCode, paused }: { onCode: (code: string) => void; paused: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<CameraState>("idle");
  const stopRef = useRef<() => void>(() => {});

  const start = useCallback(async () => {
    setState("starting");
    if (!navigator.mediaDevices?.getUserMedia) {
      setState("unavailable");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      const video = videoRef.current;
      if (!video) { for (const track of stream.getTracks()) track.stop(); return; }
      video.srcObject = stream;
      await video.play();
      setState("active");

      let cancelled = false;
      let detector: { detect: (v: HTMLVideoElement) => Promise<Array<{ rawValue: string }>> } | null = null;
      const BD = (window as Window & { BarcodeDetector?: { new (options: { formats: string[] }): { detect: (video: HTMLVideoElement) => Promise<Array<{rawValue: string}>> }; getSupportedFormats?: () => Promise<string[]> } }).BarcodeDetector;
      if (BD) {
        try {
          const formats = await BD.getSupportedFormats?.();
          if (!formats || formats.includes("qr_code")) {
            detector = new BD({ formats: ["qr_code"] });
          }
        } catch { detector = null; }
      }
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      let jsqr: ((data: Uint8ClampedArray, w: number, h: number) => { data: string } | null) | null = null;

      const tick = async () => {
        if (cancelled) return;
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          try {
            if (detector) {
              const codes = await detector.detect(video);
              if (codes.length > 0 && codes[0].rawValue) onCode(codes[0].rawValue);
            } else if (ctx) {
              if (!jsqr) {
                const mod = await import("jsqr");
                jsqr = (d, w, h) => mod.default(d, w, h, { inversionAttempts: "dontInvert" });
              }
              const w = Math.min(video.videoWidth, 640);
              const h = Math.round((video.videoHeight / video.videoWidth) * w) || 480;
              canvas.width = w; canvas.height = h;
              ctx.drawImage(video, 0, 0, w, h);
              const img = ctx.getImageData(0, 0, w, h);
              const hit = jsqr(img.data, w, h);
              if (hit?.data) onCode(hit.data);
            }
          } catch { /* frame decode errors are expected; keep scanning */ }
        }
        if (!cancelled) setTimeout(() => void tick(), 220);
      };
      void tick();

      stopRef.current = () => {
        cancelled = true;
        for (const track of stream.getTracks()) track.stop();
        if (video) video.srcObject = null;
        setState("idle");
      };
    } catch (err: unknown) {
      setState(err instanceof Error && err.name === "NotAllowedError" ? "denied" : "unavailable");
    }
  }, [onCode]);

  useEffect(() => () => stopRef.current(), []);

  return (
    <BrickTile>
      <MicroLabel className="mb-3">Camera scanner</MicroLabel>
      <div className="relative rounded-[10px] overflow-hidden bg-white/5 aspect-[4/3] flex items-center justify-center">
        <video ref={videoRef} playsInline muted className={`absolute inset-0 w-full h-full object-cover ${state === "active" ? "" : "hidden"}`} />
        {state === "active" && (
          <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-48 border-2 border-white/80 rounded-[10px]" />
          </div>
        )}
        {state === "active" && paused && (
          <p className="absolute bottom-2 inset-x-0 text-center text-[11px] font-sans uppercase tracking-[0.2em] bg-black/70 py-1">paused</p>
        )}
        {state === "idle" && (
          <div className="text-center p-6">
            <p className="text-sm font-light text-white/70 mb-4">Point the camera at the ticket's QR code.</p>
            <BrickButton type="button" onClick={() => void start()}>Start camera</BrickButton>
          </div>
        )}
        {state === "starting" && <p className="text-sm font-light text-white/60" aria-live="polite">Starting camera…</p>}
        {state === "denied" && (
          <div className="text-center p-6">
            <p className="text-sm font-light text-white/80 mb-2">Camera permission was denied.</p>
            <p className="text-xs font-light text-white/50">Allow camera access for this site in your browser settings, then try again. Manual entry below still works.</p>
          </div>
        )}
        {state === "unavailable" && (
          <div className="text-center p-6">
            <p className="text-sm font-light text-white/80 mb-2">No camera available.</p>
            <p className="text-xs font-light text-white/50">Use manual ticket entry or the attendee search below.</p>
          </div>
        )}
      </div>
      {state === "active" && (
        <div className="mt-3 text-right">
          <BrickButton type="button" variant="quiet" onClick={() => stopRef.current()}>Stop camera</BrickButton>
        </div>
      )}
    </BrickTile>
  );
}
