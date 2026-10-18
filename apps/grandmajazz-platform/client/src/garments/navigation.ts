import type { CurlDirection } from "./curl";

export type ArchiveTurn = {
  source: number;
  destination: number;
  direction: CurlDirection;
  single: boolean;
  sheet: number;
  front: number;
  reverse: number;
  left: number;
  right: number;
  required: number[];
};

export function archiveIndex(index: number, count: number) {
  return count > 0 ? ((index % count) + count) % count : 0;
}

export function archiveTurn(source: number, count: number, single: boolean, direction: CurlDirection, closingPages: readonly number[] = []): ArchiveTurn | null {
  if (count <= 1) return null;
  const forward = direction === "forward";
  const at = (index: number) => archiveIndex(index, count);
  let destination = at(source + (forward ? 1 : -1));
  const closing = (index: number) => closingPages.includes(index);
  // Desktop closing artwork is printed on the reverse of the final content
  // sheet, so its facing page is the next edition's cover.
  if (!single && closing(destination)) destination = at(destination + (forward ? 1 : -1));
  // Reversing brings the previous sheet back around the same left binding.
  // Its quiet reverse faces us first; its artwork lands over the current page.
  const front = forward ? source : destination;
  const reverse = !single && closing(at(front + 1)) ? at(front + 1) : -1;
  let right = forward ? destination : source;
  if (!single && closing(right)) right = -1;
  const left = single ? -1 : at((forward ? source : destination) - 1);
  return { source, destination, direction, single, sheet: source, front, reverse,
    left, right, required: Array.from(new Set([source, destination, front, right, reverse, ...(closing(left) ? [left] : [])])).filter(index => index >= 0 && index < count) };
}

// Hermite continuation preserves release speed and comes to rest at the endpoint.
export function releaseProgress(from: number, to: number, velocity: number, duration: number, t: number) {
  const delta = to - from;
  const tangent = Math.max(-3 * from, Math.min(3 * (1 - from), velocity * duration));
  return Math.max(0, Math.min(1, from + (3 * t * t - 2 * t * t * t) * delta + (t * t * t - 2 * t * t + t) * tangent));
}

export function shelfRails<T>(items: T[], mobile: boolean, desktopColumns = 5) {
  const columns = Math.min(mobile ? 2 : desktopColumns, Math.max(1, Math.ceil(items.length / 2)));
  const rows = 2;
  const lanes: T[][] = Array.from({ length: rows }, () => []);
  items.forEach((item, index) => lanes[index % rows].push(item));
  return { columns, rows, lanes };
}

// Shelf membership is stable across screen sizes and horizontal scroll offsets.
export function shelfReadingOrder<T extends { slug: string }>(items: T[], selectedSlug: string): T[] {
  return shelfRails(items, false).lanes.find(lane => lane.some(item => item.slug === selectedSlug)) || [];
}

export function shelfLimit(lanes: unknown[][], columns: number) {
  return Math.max(0, ...lanes.map(lane => lane.length - columns));
}

// Continuous drag release: exponential friction preserves velocity and never snaps.
export function shelfCoast(from: number, velocity: number, elapsed: number, limit: number) {
  const decay = Math.exp(-Math.max(0, elapsed) / 220);
  const raw = from + velocity * 220 * (1 - decay);
  const offset = Math.max(0, Math.min(limit, raw));
  return { offset, done: raw !== offset || Math.abs(velocity * decay) < .000025 };
}

// A circular row keeps the drag and release velocity intact across its seam.
export function shelfLoopOffset(value: number, count: number) {
  return count > 1 ? ((value % count) + count) % count : 0;
}

export function shelfLoopCoast(from: number, velocity: number, elapsed: number, count: number) {
  const decay = Math.exp(-Math.max(0, elapsed) / 220);
  return { offset: shelfLoopOffset(from + velocity * 220 * (1 - decay), count),
    done: count <= 1 || Math.abs(velocity * decay) < .000025 };
}

export function shelfLoopSlot(index: number, offset: number, count: number, columns: number) {
  if (count <= 1) return { centre: 0, opacity: 1 };
  const visibleColumns = Math.min(columns, count);
  const centre = shelfLoopOffset(index - offset + .5, count) - visibleColumns / 2;
  return { centre, opacity: 1 };
}

export function shelfEdgeOpacity(worldX: number, edge: number, feather: number) {
  const t = Math.max(0, Math.min(1, (edge - Math.abs(worldX)) / feather));
  return t * t * (3 - 2 * t);
}
