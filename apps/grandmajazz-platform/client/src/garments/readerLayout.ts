export const readerTiming = { pickup: 420, opening: 460, turn: 260, focus: 220, closing: 360, returning: 420 } as const;

export function fitReader(width: number, height: number, pageWidth: number, pageHeight: number) {
  const w = Math.max(1, width), h = Math.max(1, height);
  const inset = w < 700 ? 8 : 16;
  const usableWidth = Math.max(1, w - inset * 2), usableHeight = Math.max(1, h - inset * 2);
  const spreadPageWidth = Math.min(usableWidth / 2, usableHeight * pageWidth / pageHeight);
  const single = w < 900 || spreadPageWidth < 360;
  const scale = Math.min(usableWidth / (pageWidth * (single ? 1 : 2)), usableHeight / pageHeight);
  return { single, scale, pagePixels: pageWidth * scale, heightPixels: pageHeight * scale, inset };
}

export function releaseDuration(progress: number, complete: boolean, velocity = 0, automatic = false, single = false) {
  if (automatic) return single ? 180 : readerTiming.turn;
  const remaining = Math.abs((complete ? 1 : 0) - progress);
  if (single) return Math.max(75, Math.min(170, 80 + remaining * 90 - Math.min(1.5, Math.abs(velocity)) * 35));
  return Math.max(90, Math.min(220, 100 + remaining * 120 - Math.min(1.5, Math.abs(velocity)) * 45));
}

export function boundedPan(value: number, pageSize: number, visibleSize: number, zoom: number) {
  const limit = Math.max(0, (pageSize * zoom - visibleSize) / 2);
  return Math.max(-limit, Math.min(limit, value));
}

export function tapZone(fraction: number) { return fraction < .22 ? "previous" : fraction > .78 ? "next" : "centre"; }

export function gestureDirection(deltaX: number, deltaY: number, threshold = 12) {
  if (Math.abs(deltaX) <= threshold || Math.abs(deltaX) <= Math.abs(deltaY) * 1.12) return null;
  return deltaX < 0 ? "forward" as const : "backward" as const;
}

export function phoneGestureDirection(deltaX: number, deltaY: number, edge: boolean) {
  if (Math.abs(deltaX) <= (edge ? 3 : 6) || (!edge && Math.abs(deltaX) <= Math.abs(deltaY) * .8)) return null;
  return deltaX < 0 ? "forward" as const : "backward" as const;
}

// Pointer bursts retain only their latest value until the next render frame.
export function latestFrameValue<T>() {
  let value: T | undefined;
  return { set(next: T) { value = next; }, take() { const next = value; value = undefined; return next; }, clear() { value = undefined; } };
}
