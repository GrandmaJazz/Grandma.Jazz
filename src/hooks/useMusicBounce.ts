'use client';

import { useEffect, useRef, useState } from 'react';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import type { BeatMap } from '@/lib/beatDetection';

const cache = new Map<string, BeatMap>();
let catalog: Promise<Record<string, BeatMap>> | undefined;

async function loadMap(id: string, source: string, signal: AbortSignal): Promise<BeatMap> {
  const key = `${id}:${source}`;
  const cached = cache.get(key);
  if (cached) return cached;
  catalog ??= fetch('/audio/beat-maps.json').then(r => {
    if (!r.ok) throw new Error('Beat maps unavailable');
    return r.json();
  }).catch(error => { catalog = undefined; throw error; });
  const saved = (await catalog)[id];
  if (saved?.source === source) { cache.set(key, saved); return saved; }
  // New uploads are analysed independently; never reroute or interrupt music.
  const chunks: ArrayBuffer[] = [];
  let total = 1;
  for (let part = 0; part * 1048576 < total; part++) {
    const response = await fetch(`/api/music-analysis?id=${encodeURIComponent(id)}&part=${part}&source=${encodeURIComponent(source)}`, { signal });
    if (!response.ok) throw new Error('Track analysis unavailable');
    total = Number(response.headers.get('X-Total-Bytes'));
    if (!total || total > 32 * 1048576) throw new Error('Track too large');
    chunks.push(await response.arrayBuffer());
  }
  signal.throwIfAborted();
  const bytes = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0));
  let offset = 0;
  for (const chunk of chunks) { bytes.set(new Uint8Array(chunk), offset); offset += chunk.byteLength; }
  const decoder = new OfflineAudioContext(1, 1, 22050);
  const decoded = await decoder.decodeAudioData(bytes.buffer);
  signal.throwIfAborted();
  if (decoded.duration > 1200) throw new Error('Track requires offline analysis');
  const samples = new Float32Array(decoded.length);
  for (let channel = 0; channel < decoded.numberOfChannels; channel++) {
    const values = decoded.getChannelData(channel);
    for (let i = 0; i < samples.length; i++) samples[i] += values[i] / decoded.numberOfChannels;
  }
  const result = await new Promise<BeatMap>((resolve, reject) => {
    const worker = new Worker(new URL('../lib/beatDetection.worker.ts', import.meta.url));
    const finish = () => { worker.terminate(); signal.removeEventListener('abort', abort); clearTimeout(timeout); };
    const abort = () => { finish(); reject(new Error('Analysis cancelled')); };
    const timeout = setTimeout(abort, 30000);
    signal.addEventListener('abort', abort, { once: true });
    worker.onmessage = event => { finish(); resolve(event.data); };
    worker.onerror = () => { finish(); reject(new Error('Analysis failed')); };
    worker.postMessage({ samples, sampleRate: decoded.sampleRate }, [samples.buffer]);
  });
  cache.set(key, result);
  return result;
}

export function useMusicBounce() {
  const ref = useRef<HTMLDivElement>(null);
  const { currentMusic, isPlaying, volume, getPlaybackTime } = useMusicPlayer();
  const volumeRef = useRef(volume);
  volumeRef.current = volume;
  const [map, setMap] = useState<BeatMap | null>(null);
  useEffect(() => {
    setMap(null);
    if (!currentMusic) return;
    const controller = new AbortController();
    void loadMap(currentMusic._id, currentMusic.filePath, controller.signal)
      .then(value => { if (!controller.signal.aborted) setMap(value); })
      .catch(() => { /* No confident timing: stay still instead of inventing BPM. */ });
    return () => controller.abort();
  }, [currentMusic?._id, currentMusic?.filePath]);

  useEffect(() => {
    const element = ref.current;
    if (!element || !map?.beats.length || !isPlaying) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let visible = false, frame = 0, lastBeat = -1;
    let animation: Animation | undefined;
    const tick = () => {
      const time = getPlaybackTime();
      let low = 0, high = map.beats.length;
      while (low < high) { const mid = (low + high) >>> 1; if (map.beats[mid] <= time) low = mid + 1; else high = mid; }
      const index = low - 1;
      if (index !== lastBeat) {
        animation?.cancel();
        lastBeat = index;
        if (index >= 0) {
          const interval = (map.beats[index + 1] ?? map.beats[index] + 60 / map.bpm) - map.beats[index];
          const duration = Math.min(interval * 1000, 650);
          const elapsed = (time - map.beats[index]) * 1000;
          const loudness = Math.min(1.25, volumeRef.current / 0.5) * (map.strengths?.[index] ?? 1);
          // A sparse accent in an intro is not a rhythm. Wait for a short run
          // of clear beats, then stop as soon as the next accent goes quiet.
          let clearRecent = 0;
          for (let previous = index; previous >= Math.max(0, index - 4); previous--) {
            if (map.beats[index] - map.beats[previous] > 3) break;
            if ((map.strengths?.[previous] ?? 1) >= 0.35) clearRecent++;
          }
          if (elapsed < duration && clearRecent >= 3 && (map.strengths?.[index] ?? 1) >= 0.35 && loudness > 0.01) {
            animation = element.animate([
              { transform: 'translate3d(0,0,0)', offset: 0 },
              { transform: `translate3d(0,${-1.6 * loudness}%,0)`, offset: 0.22 },
              { transform: `translate3d(0,${0.35 * loudness}%,0)`, offset: 0.55 },
              { transform: 'translate3d(0,0,0)', offset: 1 },
            ], { duration, easing: 'ease-in-out' });
            animation.currentTime = elapsed;
          }
        }
      }
      frame = requestAnimationFrame(tick);
    };
    const sync = () => {
      cancelAnimationFrame(frame); animation?.cancel(); lastBeat = -1;
      if (visible && !document.hidden && !reduced.matches) frame = requestAnimationFrame(tick);
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
    observer.observe(element);
    document.addEventListener('visibilitychange', sync);
    reduced.addEventListener('change', sync);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); animation?.cancel(); document.removeEventListener('visibilitychange', sync); reduced.removeEventListener('change', sync); };
  }, [map, isPlaying, getPlaybackTime]);
  return { ref, bpm: map?.bpm || undefined };
}
