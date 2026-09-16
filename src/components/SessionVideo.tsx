'use client';

import { useEffect, useRef, useState } from 'react';

// Only replace this exact source; a new event/upload must show its own video.
const QUIZ_SOURCE = 'https://grandma-jazz-uploads.s3.ap-southeast-2.amazonaws.com/videos/GMJ-PIANO-REEL-3-1786766781218.MP4';

export default function SessionVideo({ source }: { source: string }) {
  const frame = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const visible = useRef(false);
  const [nearby, setNearby] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [failed, setFailed] = useState(false);
  const [efficientCodec, setEfficientCodec] = useState(false);
  const isQuiz = source === QUIZ_SOURCE;

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
    const el = frame.current;
    if (!el) return;
    const sync = () => {
      const player = video.current;
      if (!player) return;
      if (visible.current && !document.hidden) {
        void player.play().then(() => setBlocked(false)).catch((error: DOMException) => {
          if (error.name === 'NotAllowedError') setBlocked(true);
        });
      } else player.pause();
    };
    const preload = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setNearby(true); preload.disconnect(); }
    }, { rootMargin: '600px' });
    const playback = new IntersectionObserver(([entry]) => {
      visible.current = entry.isIntersecting;
      sync();
    }, { threshold: 0.05 });
    preload.observe(el);
    playback.observe(el);
    document.addEventListener('visibilitychange', sync);
    video.current?.addEventListener('canplay', sync);
    const player = video.current;
    return () => {
      preload.disconnect(); playback.disconnect();
      document.removeEventListener('visibilitychange', sync);
      player?.removeEventListener('canplay', sync);
      player?.pause();
    };
  }, [source]);

  return (
    <div ref={frame} className="relative w-full h-full bg-[#0A0A0A]">
      <video
        ref={video}
        src={nearby ? (isQuiz && !failed ? (efficientCodec ? '/videos/quiz-sessions-hevc-v1.mp4?v=2' : '/videos/quiz-sessions-v1.mp4') : source) : undefined}
        poster={isQuiz ? '/videos/quiz-sessions-poster.webp' : undefined}
        preload={nearby ? 'auto' : 'none'}
        muted loop playsInline
        aria-label="A night at Grandma Jazz"
        className="h-full w-full object-cover"
        onError={() => { if (efficientCodec) setEfficientCodec(false); else if (isQuiz && !failed) setFailed(true); else setBlocked(true); }}
      />
      {blocked && (
        <button type="button" className="absolute bottom-4 left-4 rounded-full bg-black/80 px-4 py-2 text-sm text-white" onClick={() => {
          void video.current?.play().then(() => setBlocked(false)).catch(() => setBlocked(true));
        }}>Play video</button>
      )}
    </div>
  );
}
