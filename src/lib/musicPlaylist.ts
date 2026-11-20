import { getAlbumTitle } from './albumArtwork';

interface Track { _id: string; title: string }
interface Album<T extends Track> { _id: string; title: string; imagePath: string; music: T[] }

export function musicPlaylist<T extends Track>(card: Album<T>): T[] {
  const tracks = [...card.music];
  // The live album has an approved opening performance and a bonus, in that
  // order. Other multi-track albums retain their existing shuffle behaviour.
  if (getAlbumTitle(card.imagePath, card.title) === 'Saturday Sessions') {
    return tracks.sort((a, b) => Number(/sax.*bonus/i.test(a.title)) - Number(/sax.*bonus/i.test(b.title)));
  }
  for (let i = tracks.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tracks[i], tracks[j]] = [tracks[j], tracks[i]];
  }
  return tracks;
}

export function restoreMusicSelection<T extends Track, C extends Album<T>>(
  cards: C[], savedCardId: string, savedTrackId?: string,
): { card: C; playlist: T[]; trackIndex: number } | null {
  const card = cards.find(card => card._id === savedCardId);
  if (!card?.music.length) return null;
  const playlist = musicPlaylist<T>(card);
  const trackIndex = Math.max(0, playlist.findIndex(track => track._id === savedTrackId));
  // Always use fresh catalogue objects. Cached URLs can still point at a
  // retired placeholder after an admin replaces an album's tracks.
  return { card, playlist, trackIndex };
}
