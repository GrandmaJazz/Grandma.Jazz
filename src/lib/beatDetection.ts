export interface BeatMap { bpm: number; beats: number[]; duration: number; source?: string }

// Fallback for a newly uploaded song that has no precomputed map yet. Runs in
// a worker, using onset energy and autocorrelation rather than a preset BPM.
export function detectBeats(samples: Float32Array, sampleRate: number): BeatMap {
  const hop = Math.max(1, Math.round(sampleRate / 100));
  const count = Math.floor(samples.length / hop);
  const onset = new Float32Array(count);
  let previous = 0;
  let low = 0;
  const alpha = 1 - Math.exp(-2 * Math.PI * 180 / sampleRate);
  for (let frame = 0; frame < count; frame++) {
    let energy = 0;
    for (let j = 0; j < hop; j++) {
      const sample = samples[frame * hop + j];
      low += alpha * (sample - low);
      energy += low * low + sample * sample * 0.15;
    }
    const level = Math.log1p(100 * Math.sqrt(energy / hop));
    onset[frame] = Math.max(0, level - previous);
    previous = level;
  }
  const duration = samples.length / sampleRate;
  const mean = onset.reduce((sum, value) => sum + value, 0) / Math.max(count, 1);
  if (mean < 0.0001 || duration < 8) return { bpm: 0, beats: [], duration };
  let bestLag = 0;
  let bestScore = 0;
  for (let lag = 33; lag <= 100; lag++) {
    let sum = 0, a = 0, b = 0;
    for (let i = lag; i < count; i++) {
      const x = Math.max(0, onset[i] - mean);
      const y = Math.max(0, onset[i - lag] - mean);
      sum += x * y; a += x * x; b += y * y;
    }
    const score = sum / Math.sqrt(a * b || 1);
    if (score > bestScore) { bestScore = score; bestLag = lag; }
  }
  // Silence / unmetered material should stay still, never invent a tempo.
  if (bestScore < 0.12) return { bpm: 0, beats: [], duration };
  let phase = 0, phaseScore = 0;
  for (let offset = 0; offset < bestLag; offset++) {
    let sum = 0;
    for (let i = offset; i < count; i += bestLag) sum += onset[i];
    if (sum > phaseScore) { phaseScore = sum; phase = offset; }
  }
  const beats: number[] = [];
  const radius = Math.round(bestLag * 0.18);
  for (let expected = phase; expected < count; expected += bestLag) {
    let peak = expected;
    for (let i = Math.max(0, expected - radius); i <= Math.min(count - 1, expected + radius); i++) {
      if (onset[i] > onset[peak]) peak = i;
    }
    if (onset[peak] > mean * 1.1) beats.push(peak * hop / sampleRate);
  }
  return { bpm: 60 * sampleRate / (bestLag * hop), beats, duration };
}
