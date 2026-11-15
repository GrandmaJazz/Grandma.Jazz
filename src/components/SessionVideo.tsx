'use client';

import { useEffect, useRef, useState } from 'react';
import { attachSessionScrub } from '@/lib/sessionScrub';

// Only replace this exact source; a new event/upload must show its own video.
const QUIZ_SOURCE = 'https://grandma-jazz-uploads.s3.ap-southeast-2.amazonaws.com/videos/GMJ-PIANO-REEL-3-1786766781218.MP4';
const QUIZ_H264_SOURCE = '/videos/quiz-sessions-v1.mp4';
const QUIZ_SCRUB_SOURCE = '/videos/quiz-piano-scrub-v1.mp4';

export default function SessionVideo({ source }: { source: string }) {
  const frame = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const visible = useRef(false);
  const [nearby, setNearby] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [failed, setFailed] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [efficientCodec, setEfficientCodec] = useState(false);
  const [preview, setPreview] = useState<boolean | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [scrubFailed, setScrubFailed] = useState(false);
  const isQuiz = source === QUIZ_SOURCE || source === QUIZ_H264_SOURCE;
  // Keep the scroll experiment opt-in while it is reviewed on real phones.
  const scrub = isQuiz && preview === true;
  const scrubEnabled = scrub && !reducedMotion && !scrubFailed;

  useEffect(() => {
    setPreview(new URLSearchParams(window.location.search).get('piano') === 'scroll');
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReducedMotion(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    let cancelled = false;
    // Use HEVC only when the browser reports smooth, power-efficient decode.
    // Otherwise the universally supported H.264 copy remains the default.
    void navigator.mediaCapabilities?.decodingInfo({
      type: 'file', video: { contentType: 'video/mp4; codecs="hvc1.1.6.L120.B0"', width: 1080, height: 1920, bitrate: 4000000, framerate: 30 },
    }).then(info => { if (!cancelled && info.supported && info.smooth && info.powerEfficient) setEfficientCodec(true); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const updateZoom = () => setZoomed(viewport.scale > 1.01);
    updateZoom();
    viewport.addEventListener('resize', updateZoom);
    return () => viewport.removeEventListener('resize', updateZoom);
  }, []);

  useEffect(() => {
    const el = frame.current;
    const player = video.current;
    if (!el || !player || preview === null) return;
    const sync = () => {
      if (!scrub && visible.current && !document.hidden && !zoomed) {
        void player.play().then(() => setBlocked(false)).catch((error: DOMException) => {
          if (error.name === 'NotAllowedError') setBlocked(true);
        });
      } else player.pause();
    };
    const preload = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setNearby(true); preload.disconnect(); }
    }, { rootMargin: '240px' });
    const playback = new IntersectionObserver(([entry]) => {
      visible.current = entry.isIntersecting;
      sync();
    }, { threshold: 0.05 });
    preload.observe(el);
    playback.observe(el);
    document.addEventListener('visibilitychange', sync);
    player.addEventListener('canplay', sync);
    sync();
    return () => {
      preload.disconnect(); playback.disconnect();
      document.removeEventListener('visibilitychange', sync);
      player.removeEventListener('canplay', sync);
      player.pause();
    };
  }, [source, zoomed, scrub, preview]);

  useEffect(() => {
    const el = frame.current;
    const player = video.current;
    if (!el || !player || !nearby || !scrubEnabled || zoomed) return;
    return attachSessionScrub(el, player);
  }, [nearby, scrubEnabled, zoomed]);

  return (
    <div ref={frame} className="relative isolate h-full w-full">
      <div data-session-media className="absolute inset-0 isolate overflow-hidden rounded-box bg-[#181818] [clip-path:inset(0_round_7.5px)]">
        {/* The opaque poster and media extend beneath a matching dark matte.
            WebKit's video surface cannot expose a bright fractional edge. */}
        <div className="absolute -inset-1 bg-[url('/videos/quiz-sessions-poster.webp')] bg-cover bg-center">
          <video
            ref={video}
            src={!nearby ? undefined : scrub ? (scrubEnabled ? QUIZ_SCRUB_SOURCE : undefined) :
              (isQuiz && !failed ? (efficientCodec ? '/videos/quiz-sessions-hevc-v1.mp4?v=2' : QUIZ_H264_SOURCE) : source)}
            poster="/videos/quiz-sessions-poster.webp"
            preload={!nearby || zoomed ? 'none' : scrubEnabled ? 'auto' : 'metadata'}
            muted loop={!scrub} playsInline
            aria-label="A night at Grandma Jazz"
            className={`block h-full w-full object-cover ${zoomed || (scrub && !scrubEnabled) ? 'invisible' : ''}`}
            onError={() => {
              if (scrub) setScrubFailed(true);
              else if (isQuiz && !failed && efficientCodec) setEfficientCodec(false);
              else if (source === QUIZ_SOURCE && !failed) setFailed(true);
              else setBlocked(true);
            }}
          />
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 rounded-box bg-black/30 [box-shadow:inset_0_0_0_1px_#181818,inset_0_0_4px_1px_#181818]" />
      </div>
      {blocked && !zoomed && !scrub && (
        <button type="button" className="gj-cta gj-cta--compact absolute bottom-4 left-4 z-20 [--gj-button-bg:#0a0a0a]" onClick={() => {
          void video.current?.play().then(() => setBlocked(false)).catch(() => setBlocked(true));
        }}>Play video</button>
      )}
    </div>
  );
}
