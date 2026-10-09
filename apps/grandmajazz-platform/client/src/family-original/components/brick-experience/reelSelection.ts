import { BRAND } from './timeline';

type WallRecord = { title: string; name: string };
export type ReelHistory = { key: string; at: number }[];

export const REEL_HISTORY_KEY = 'gj-brick-reel-history-v1';
export const REEL_HISTORY_MS = 24 * 60 * 60 * 1000;
const REEL_LIMIT = 10;
let memoryHistory: ReelHistory = [];

const nameKey = (name: string) => name.trim().normalize('NFKC').toLocaleLowerCase();

export function selectFreshReel(records: readonly WallRecord[], history: ReelHistory, now: number, random = Math.random) {
  const recent = new Map<string, number>();
  for (const item of history) {
    if (typeof item?.key === 'string' && Number.isFinite(item.at) && item.at <= now && now - item.at < REEL_HISTORY_MS)
      recent.set(item.key, Math.max(recent.get(item.key) ?? 0, item.at));
  }

  // Shuffle before deduplication so bricks with the same nickname do not
  // always favour the same title. One nickname appears at most once per reel.
  const pool = records.filter(record => typeof record.title === 'string' && typeof record.name === 'string' && record.title.trim() && record.name.trim());
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const unique = new Map<string, WallRecord>();
  for (const record of pool) {
    const key = nameKey(record.name);
    if (record.title.trim() === BRAND.title && key === nameKey(BRAND.name)) continue;
    if (!unique.has(key)) unique.set(key, { title: record.title, name: record.name });
  }

  // Unseen names come first. If fewer than ten remain, use the names seen
  // longest ago; repeats occur only when the available public pool requires it.
  const ranked = Array.from(unique).sort(([a], [b]) => (recent.get(a) ?? 0) - (recent.get(b) ?? 0));
  const selected = ranked.slice(0, REEL_LIMIT);
  for (const [key] of selected) recent.set(key, now);
  const sequence = Object.freeze([
    BRAND,
    ...selected.map(([, record]) => Object.freeze({ title: record.title, name: record.name })),
    BRAND,
  ]);
  return { sequence, history: Array.from(recent).map(([key, at]) => ({ key, at })) };
}

export function readReelHistory(): ReelHistory {
  try {
    const stored = JSON.parse(localStorage.getItem(REEL_HISTORY_KEY) || '[]');
    if (Array.isArray(stored)) return [...stored, ...memoryHistory];
  } catch { /* The current tab can still rotate names without storage. */ }
  return memoryHistory;
}

export function writeReelHistory(history: ReelHistory) {
  memoryHistory = history;
  try { localStorage.setItem(REEL_HISTORY_KEY, JSON.stringify(history)); } catch { /* Keep the in-memory fallback. */ }
}
