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

export function archiveTurn(source: number, count: number, single: boolean, direction: CurlDirection): ArchiveTurn | null {
  const forward = direction === "forward";
  const turned = Math.ceil(source / 2);
  const sheet = forward ? turned : turned - 1;
  const destination = single ? source + (forward ? 1 : -1) : forward ? (turned + 1) * 2 - 1 : (turned - 1) * 2;
  if (destination < 0 || destination >= count) return null;
  const front = single ? source : sheet * 2;
  const reverse = single ? destination : front + 1;
  const left = single ? -1 : forward ? turned * 2 - 1 : turned * 2 - 3;
  const right = single ? destination : forward ? turned * 2 + 2 : turned * 2;
  return { source, destination, direction, single, sheet, front, reverse, left, right,
    required: Array.from(new Set([source, destination, front, reverse, left, right])).filter(i => i >= 0 && i < count) };
}

// Hermite continuation preserves release speed and comes to rest at the endpoint.
export function releaseProgress(from: number, to: number, velocity: number, duration: number, t: number) {
  const delta = to - from;
  const tangent = Math.max(-3 * from, Math.min(3 * (1 - from), velocity * duration));
  return Math.max(0, Math.min(1, from + (3 * t * t - 2 * t * t * t) * delta + (t * t * t - 2 * t * t + t) * tangent));
}

export function shelfRails<T>(items: T[], mobile: boolean) {
  const columns = items.length <= 4 || mobile ? 2 : 4;
  const rows = Math.min(3, Math.max(1, Math.ceil(items.length / columns)));
  const lanes: T[][] = Array.from({ length: rows }, () => []);
  items.forEach((item, index) => lanes[Math.floor(index / columns) % rows].push(item));
  return { columns, rows, lanes };
}
