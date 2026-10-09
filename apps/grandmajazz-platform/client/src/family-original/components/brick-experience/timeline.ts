import { BRICK_HEIGHT } from '@shared/family-original/brickArtwork';
// Four-second complete intro: immediate brand fade and an early, smooth reel.
export const BRICK_TIMELINE = Object.freeze({
  prepareLimit: 2000, openingFade: [0, 100], reel: [100, 3000],
  wallReveal: [200, 3000], morph: [3300, 3850], content: [3450, 4000],
  nicknameFade: [3450, 3650], controls: [3650, 4000],
  ready: 4000, deadline: 5500, skipHold: 100, skipDuration: 420,
  finalDim: 0.78, sessionKey: 'gj-brick-intro-v1', draftKey: 'gj-brick-draft-v1',
});
export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const smooth = (x: number) => { const t = clamp01(x); return t*t*t*(t*(6*t-15)+10); };
export const ramp = (t: number, [a,b]: readonly number[]) => smooth((t-a)/(b-a));
export const BRAND = Object.freeze({title: 'Grandma', name: 'Jazz'});
export function snapshotSequence(records: readonly {title: string; name: string}[]) {
  const snapshot = records.filter(r => typeof r.title === 'string' && typeof r.name === 'string' && r.title.trim() && r.name.trim()).slice(0,10).map(r=>Object.freeze({title:r.title,name:r.name}));
  return Object.freeze([BRAND, ...snapshot, BRAND]);
}
export function frameAt(t: number, count: number) {
  const distance = (count-1)*BRICK_HEIGHT;
  return {
    trackY: t >= BRICK_TIMELINE.reel[1] ? -distance : -distance*ramp(t, BRICK_TIMELINE.reel),
    textOpacity: ramp(t, BRICK_TIMELINE.openingFade),
    veilOpacity: 1-ramp(t, BRICK_TIMELINE.wallReveal),
    morph: ramp(t, BRICK_TIMELINE.morph),
    content: ramp(t, BRICK_TIMELINE.content),
    nicknameOpacity: 1-ramp(t, BRICK_TIMELINE.nicknameFade),
    controls: ramp(t, BRICK_TIMELINE.controls),
    phase: t >= BRICK_TIMELINE.ready ? 'READY' : t >= BRICK_TIMELINE.morph[0] ? 'MORPH' : t >= BRICK_TIMELINE.reel[1] ? 'FINAL_BRAND' : t >= BRICK_TIMELINE.reel[0] ? 'REEL' : 'INTRO',
  };
}
export function readSession(key: string) { try {return sessionStorage.getItem(key);} catch {return null;} }
export function writeSession(key: string, value: string) { try {sessionStorage.setItem(key,value);} catch {} }
export function clearSession(key: string) { try {sessionStorage.removeItem(key);} catch {} }

// When session storage is unavailable, prefer an immediately usable form over
// an intro that would replay on every visit. This is not the completion flag.
export function canPlayIntro() {
  try {
    if (sessionStorage.getItem(BRICK_TIMELINE.sessionKey) === 'done') return false;
    const probe = `${BRICK_TIMELINE.sessionKey}-availability`;
    sessionStorage.setItem(probe, '1'); sessionStorage.removeItem(probe);
    return true;
  } catch { return false; }
}
