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
  const columns = Math.min(mobile ? 2 : 5, Math.max(1, Math.ceil(items.length / 2)));
  const rows = 2;
  const lanes: T[][] = Array.from({ length: rows }, () => []);
  items.forEach((item, index) => lanes[index % rows].push(item));
  return { columns, rows, lanes };
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
