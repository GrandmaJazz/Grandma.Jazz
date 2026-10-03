export type CurlDirection = "forward" | "backward";
export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const easeInOut = (v: number) => { const t = clamp01(v); return t * t * (3 - 2 * t); };

export function shouldCompleteTurn(progress: number, velocity: number, cancelled = false) {
  if (cancelled || velocity < -0.45) return false;
  return progress > 0.48 || (progress > 0.025 && velocity > 0.65);
}
export function mapLogicalToSheet(index: number) {
  return { sheetIndex: Math.floor(index / 2), side: index % 2 ? "back" : "front" } as const;
}
export type CurlOptions = {
  pageWidth: number; pageHeight: number; progress: number;
  direction?: CurlDirection; cornerBias?: number; stiff?: boolean;
};

export function dragCurl(dx: number, dy: number, distance: number, height: number, grabbedCorner: number, direction: CurlDirection) {
  const horizontal = (direction === "forward" ? -dx : dx) / Math.max(1, distance);
  const inward = Math.max(0, -Math.sign(grabbedCorner) * dy / Math.max(1, height));
  return {
    progress: clamp01(horizontal + inward * .16 * Math.max(0, 1 - horizontal)),
    cornerBias: Math.max(-1, Math.min(1, grabbedCorner - dy / Math.max(1, height) * 1.5)),
  };
}

// A tapered travelling curl reaches the grabbed corner first. Integrating
// each fibre preserves its length; subtracting the spine integral anchors it.
export function curlPoint(x: number, y: number, options: CurlOptions) {
  const p = clamp01(options.direction === "backward" ? 1 - options.progress : options.progress);
  const w = options.pageWidth;
  const corner = Math.max(-1, Math.min(1, options.cornerBias ?? 0));
  const nearCorner = -corner * y / options.pageHeight * 2;
  const r = w * (options.stiff ? 0.24 : 0.15) * (1 + nearCorner * .32);
  const arc = Math.PI * r;
  const diagonal = nearCorner * w * (options.stiff ? .11 : .18) * Math.sin(Math.PI * p);
  const start = (w + arc) * (1 - p) - arc - diagonal;
  const integral = (u: number) => {
    if (u <= 0) return [u, 0];
    if (u >= arc) return [-(u - arc), 2 * r];
    return [r * Math.sin(u / r), r * (1 - Math.cos(u / r))];
  };
  const base = integral(-start);
  const point = integral(Math.abs(x) - start);
  return { x: point[0] - base[0], y, z: Math.max(0, point[1] - base[1]), shade: 1 };
}

export type ReaderMode = "browsing" | "loading" | "selecting" | "opening" | "reading" | "dragging" | "settling" | "closing" | "returning" | "error";
const transitions: Record<ReaderMode, ReaderMode[]> = {
  browsing: ["loading"], loading: ["selecting", "reading", "error", "browsing", "closing"],
  selecting: ["opening", "reading", "closing"], opening: ["reading", "closing"],
  reading: ["loading", "opening", "dragging", "settling", "closing"],
  dragging: ["reading", "settling", "closing"], settling: ["reading", "closing"],
  closing: ["returning"], returning: ["browsing"], error: ["loading", "browsing", "closing"],
};
export const canTransition = (from: ReaderMode, to: ReaderMode) => from === to || transitions[from].includes(to);
