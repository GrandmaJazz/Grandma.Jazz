export interface MusicCard {
  _id: string;
  title: string;
  description: string;
  imagePath: string;
  order: number;
  music: { _id: string; title: string; artist: string; filePath: string; duration: number }[];
}

// The picker and persistent player share one public catalogue request.
// Failures are never cached, so a retry can recover immediately.
let cached: { cards: MusicCard[]; expires: number } | undefined;
let pending: Promise<MusicCard[]> | undefined;

export function loadMusicCatalogue(refresh = false): Promise<MusicCard[]> {
  if (!refresh && cached && Date.now() < cached.expires) return Promise.resolve(cached.cards);
  if (pending) return pending;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  pending = fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/cards`, { signal: controller.signal })
    .then(async response => {
      if (!response.ok) throw new Error(`Album request failed: ${response.status}`);
      const data = await response.json();
      if (data.success === false || !Array.isArray(data.cards)) throw new Error('Album catalogue unavailable');
      const cards = (data.cards as MusicCard[]).slice().sort((a, b) => a.order - b.order);
      cached = { cards, expires: Date.now() + 60_000 };
      return cards;
    })
    .finally(() => { clearTimeout(timer); pending = undefined; });
  return pending;
}
