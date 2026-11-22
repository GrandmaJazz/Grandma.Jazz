// Offline gated integrated loudness (LUFS) of the approved original MP3s.
// No re-encoding: a per-record gain matches perceived loudness while preserving
// the original performances, their dynamics and the visitor's slider position.
export const MUSIC_LOUDNESS_TARGET = -18;
const byId: Record<string, number> = {
  '6b00220f85f0e2518ea32f9d': -13.39,
  '6b0021ec85f0e2518ea32eb4': -9.43,
  '6b00220b85f0e2518ea32f90': -8.97,
  '6b00220485f0e2518ea32f70': -12.58,
  '6b00220885f0e2518ea32f80': -9.20,
  // V2 is the 107-second trim; its source's possible contiguous 107-second
  // windows measured -14.68 to -14.34 LUFS. Use their midpoint.
  '6b0021d085f0e2518ea32ea2': -14.51,
  '6b0021d085f0e2518ea32ea4': -15.85,
};
const byFile: Record<string, number> = {
  'day-vision': -13.39,
  ensemble: -9.43,
  'grandmas-groove': -8.97,
  indica: -12.58,
  sativa: -9.20,
  'saturday-sessions-grandmas-hands-revised-audition': -14.51,
  'saturday-sessions-sax-solo-bonus': -15.85,
  'gj-cafe-daytime-backbay-lounge': -21.16,
  'gj-cafe-evening-long-stroll': -21.19,
  'gj-the-duet-night-in-venice': -11.55,
};
export function trackNormalizationGain(filePath: string, trackId?: string) {
  let filename = filePath.split(/[?#]/)[0].split('/').pop() || '';
  try { filename = decodeURIComponent(filename); } catch {}
  const key = filename.toLowerCase().replace(/\.mp3$/i, '').replace(/-\d+$/, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const loudness = (trackId ? byId[trackId] : undefined) ?? byFile[key];
  return loudness === undefined ? 1 : Math.min(1.5, Math.pow(10, (MUSIC_LOUDNESS_TARGET - loudness) / 20));
}
