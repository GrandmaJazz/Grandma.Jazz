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
  grip?: { x: number; y: number; pullY: number };
};

// A tapered travelling curl reaches the grabbed corner first. Integrating
// each fibre preserves its length; subtracting the spine integral anchors it.
export function curlPoint(x: number, y: number, options: CurlOptions) {
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
  const grip = options.grip;
  const t = grip ? clamp01(Math.abs(x) / Math.max(.001, grip.x)) : 0;
  const vertical = grip ? grip.pullY * t * t * (3 - 2 * t) * Math.exp(-2 * ((y - grip.y) / options.pageHeight) ** 2) : 0;
  return { x: point[0] - base[0], y: y + vertical, z: Math.max(0, point[1] - base[1]) + (grip ? Math.abs(grip.pullY) * .18 * Math.sin(Math.PI * t) * Math.exp(-2 * ((y - grip.y) / options.pageHeight) ** 2) : 0), shade: 1 };
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

// Invert the projected material point rather than accelerating a percentage.
// Bisection also accounts for perspective and the opening-cover camera fit.
export function solveGripProgress(targetX: number, projectX: (p: number) => number, previous = 0) {
  // Opening-cover perspective can make the first few pixels non-monotonic.
  // Find all reachable brackets, then stay on the branch nearest this grip.
  const roots: number[] = [];
  const first = projectX(0), last = projectX(1), increasing = last > first;
  if (increasing ? targetX <= first : targetX >= first) return 0;
  if (increasing ? targetX >= last : targetX <= last) return 1;
  let best = 0, bestError = Math.abs(first - targetX);
  let leftValue = first - targetX;
  for (let i = 1; i <= 64; i++) {
    const right = i / 64, rightValue = projectX(right) - targetX;
    if (Math.abs(rightValue) < bestError) { best = right; bestError = Math.abs(rightValue); }
    if (leftValue * rightValue <= 0) {
      let lo = (i - 1) / 64, hi = right, loValue = leftValue;
      for (let j = 0; j < 22; j++) {
        const mid = (lo + hi) / 2, value = projectX(mid) - targetX;
        if (loValue * value <= 0) hi = mid; else { lo = mid; loValue = value; }
      }
      roots.push((lo + hi) / 2);
    }
    leftValue = rightValue;
  }
  return roots.length ? roots.reduce((a, b) => Math.abs(a - previous) < Math.abs(b - previous) ? a : b) : best;
}

export type GripProjection = CurlOptions & {
  grabX: number; grabY: number; viewportWidth: number; viewportHeight: number;
  cameraStart: number; cameraEnd: number; opening: boolean; single: boolean;
};
export function projectGrip(options: GripProjection) {
  const { progress: p, pageWidth: w, viewportWidth: width, viewportHeight: height } = options;
  const distance = options.opening ? options.cameraStart + (options.cameraEnd - options.cameraStart) * p : options.cameraStart;
  const groupX = options.single ? -w / 2 : options.opening ? -w / 2 * (1 - p) : 0;
  const tan = Math.tan(Math.PI / 10);
  const gutter = 6 * (2 * (distance - 1.6 - .012) * tan) / height;
  const hinge = options.single ? gutter / 2 : gutter / 2 * Math.cos(Math.PI * (options.direction === 'backward' ? 1 - p : p));
  const point = curlPoint(options.grabX, options.grabY, options);
  const scale = height / (2 * (distance - 1.6 - point.z - .013) * tan);
  return { x: width / 2 + (groupX + hinge + point.x) * scale, y: height / 2 - point.y * scale, scale };
}
