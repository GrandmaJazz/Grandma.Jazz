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
  fold?: PaperFold;
};

// A tapered travelling curl reaches the grabbed corner first. Integrating
// each fibre preserves its length; subtracting the spine integral anchors it.
export function curlPoint(x: number, y: number, options: CurlOptions) {
  if (options.fold) return foldPoint(x, y, options.fold, options.direction);
  const p = clamp01(options.direction === "backward" ? 1 - options.progress : options.progress);
  const w = options.pageWidth;
  const corner = Math.max(-1, Math.min(1, options.cornerBias ?? 0));
  const nearCorner = -corner * y / options.pageHeight * 2;
  // The pickup curl opens out through the turn and tightens as it lands.
  const r = w * (options.stiff ? .19 + .05 * Math.sin(Math.PI * p) : .09 + .065 * Math.sin(Math.PI * p)) * (1 - nearCorner * .25);
  const arc = Math.PI * r;
  const diagonal = nearCorner * w * (options.stiff ? .14 : .24) * Math.sin(Math.PI * p);
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

// A developable cylindrical fold: the untouched region is exactly unchanged,
// and the turned region is rigid. No displacement field stretches the artwork.
export type PaperFold = { nx: number; ny: number; start: number; radius: number };
export function paperFold(gx: number, gy: number, tx: number, ty: number, radius?: number): PaperFold {
  const dx = gx - tx, dy = gy - ty, distance = Math.hypot(dx, dy);
  if (distance < 1e-8) return { nx: 1, ny: 0, start: Infinity, radius: 0 };
  const nx = dx / distance, ny = dy / distance;
  const r = Math.max(0, Math.min(radius ?? gx * .065, distance * .12));
  return { nx, ny, start: gx * nx + gy * ny - (distance + Math.PI * r) / 2, radius: r };
}
export function foldPoint(x: number, y: number, fold: PaperFold, direction: CurlDirection = "forward") {
  const sign = direction === "backward" ? -1 : 1;
  const u = x * fold.nx + y * fold.ny - fold.start;
  if (u <= 0) return { x: sign * x, y, z: 0, shade: 1 };
  const arc = Math.PI * fold.radius;
  const curved = fold.radius > 1e-8 && u < arc;
  const along = curved ? fold.radius * Math.sin(u / fold.radius) : -(u - arc);
  const z = curved ? fold.radius * (1 - Math.cos(u / fold.radius)) : 2 * fold.radius;
  return { x: sign * (x + fold.nx * (along - u)), y: y + fold.ny * (along - u), z, shade: 1 };
}
export type FoldGrip = {
  grabX: number; grabY: number; targetX: number; targetY: number;
  width: number; height: number; pageWidth: number; cameraDistance: number; groupX: number;
  hinge: number; direction: CurlDirection;
};
export function solveFoldGrip(options: FoldGrip) {
  const o = options, sign = o.direction === "backward" ? -1 : 1;
  let fold = paperFold(o.grabX, o.grabY, o.grabX, o.grabY);
  let tx = o.grabX, ty = o.grabY;
  // The gripped point sits on the rigid turned portion at twice the radius.
  // Invert perspective at that depth, then update the small curl radius.
  for (let i = 0; i < 12; i++) {
    const scale = o.height / (2 * (o.cameraDistance - 1.6 - .013 - 2 * fold.radius) * Math.tan(Math.PI / 10));
    tx = Math.max(-o.grabX, Math.min(o.grabX, sign * ((o.targetX - o.width / 2) / scale - o.groupX - o.hinge)));
    ty = (o.height / 2 - o.targetY) / scale;
    fold = paperFold(o.grabX, o.grabY, tx, ty, o.pageWidth * .065);
  }
  return { fold, tx, ty };
}
export function shouldCompleteGesture(distance: number, velocity: number, pageWidth: number, cancelled = false) {
  if (cancelled || velocity < -.18 || distance < 8) return false;
  return distance >= pageWidth * .28 || (distance >= 18 && velocity >= .12);
}
