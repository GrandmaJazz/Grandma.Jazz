import { useEffect, useRef, type RefObject } from 'react';

const PATCH_WIDTH = 264;
const PATCH_HEIGHT = 200;
const PATCH_HALF_WIDTH = PATCH_WIDTH / 2;
const PATCH_ABOVE_SEAM = 142;
const OUTER_LIP_RADIUS = 64;
const LIP_HEIGHT = 43;
const MOTION_SCALE = 1 / 3;

type FaceSide = {
  corner: readonly [number, number];
  spread: number;
  lift: number;
  cheek: readonly [number, number];
  cheekLift: number;
};

type SmirkGeometry = {
  seam: readonly [number, number];
  sides: readonly [FaceSide, FaceSide];
};

function influence(x: number, y: number) {
  const falloff = Math.max(0, 1 - x * x - y * y);
  return falloff * falloff;
}

/** Displace the painted pixels locally so the mouth moves without a second face layer. */
export default function PortraitSmirk({ image, geometry, pulse }: {
  image: RefObject<HTMLImageElement>;
  geometry: SmirkGeometry;
  pulse: string | undefined;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [seamX, seamY] = geometry.seam;
  const patchLeft = seamX - PATCH_HALF_WIDTH;
  const patchTop = seamY - PATCH_ABOVE_SEAM;
  const active = Boolean(pulse);

  useEffect(() => {
    const overlay = canvas.current;
    const portrait = image.current;
    if (!active || !overlay || !portrait || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const context = overlay.getContext('2d');
    if (!context) return;
    let frame = 0;
    let stopped = false;
    const prepare = async () => {
      try { await portrait.decode(); } catch { return; }
      if (stopped) return;
      // The visible canvas starts transparent. Sampling the original into it
      // would briefly expose a rectangular patch before the first smirk frame.
      const sample = document.createElement('canvas');
      sample.width = PATCH_WIDTH;
      sample.height = PATCH_HEIGHT;
      const sampleContext = sample.getContext('2d', { willReadFrequently: true });
      if (!sampleContext) return;
      const ratio = portrait.naturalWidth / 1086;
      sampleContext.drawImage(portrait, patchLeft * ratio, patchTop * ratio,
        PATCH_WIDTH * ratio, PATCH_HEIGHT * ratio, 0, 0, PATCH_WIDTH, PATCH_HEIGHT);
      const source = sampleContext.getImageData(0, 0, PATCH_WIDTH, PATCH_HEIGHT);
      const output = context.createImageData(PATCH_WIDTH, PATCH_HEIGHT);
      const [leftSide, rightSide] = geometry.sides.map((side) => ({
        ...side,
        seamTilt: side.corner[1] - seamY,
        halfMouth: Math.abs(side.corner[0] - seamX),
        cheekX: side.cheek[0] - patchLeft,
        cheekY: side.cheek[1] - patchTop,
      }));

      const animation = overlay.getAnimations()[0];
      const render = () => {
        const progress = animation?.effect?.getComputedTiming().progress;
        if (progress == null) {
          if (animation?.pending) frame = requestAnimationFrame(render);
          return;
        }
        const expression = Math.sin(Math.PI * progress);
        const widthProgress = expression * (2 - expression) * MOTION_SCALE;
        const liftProgress = expression ** 1.35 * MOTION_SCALE;
        output.data.fill(0);

        // Resolve the mouth shape once per column, then resample only the
        // rows the lips or cheek can affect.
        for (let targetX = 0; targetX < PATCH_WIDTH; targetX++) {
          const isLeft = targetX < PATCH_HALF_WIDTH;
          const side = isLeft ? leftSide : rightSide;
          const direction = isLeft ? -1 : 1;
          const outward = (targetX - PATCH_HALF_WIDTH) * direction;
          const spread = side.spread * widthProgress;
          const fromCorner = outward - side.halfMouth - spread;
          const alongLip = Math.min(1, outward / (side.halfMouth + spread));
          const cornerWeight = fromCorner < 0
            ? alongLip * alongLip * (3 - 2 * alongLip)
            : influence(fromCorner / (OUTER_LIP_RADIUS - spread), 0);
          // Shape the entire closed seam into one shallow curve, with a little
          // more lift on one side and gentle compression through the lips.
          const lift = (side.lift * cornerWeight + 3 * (1 - alongLip)) * liftProgress;
          const neutralSeam = PATCH_ABOVE_SEAM + side.seamTilt * alongLip;
          const raisedSeam = neutralSeam - lift;
          const cheekRise = side.cheekLift * liftProgress;
          const cheekCenter = side.cheekY - cheekRise;
          const cheekX = (targetX - side.cheekX) / 34;
          const hasCheek = Math.abs(cheekX) < 1;
          const firstRow = Math.max(0, Math.floor(hasCheek
            ? Math.min(raisedSeam - LIP_HEIGHT, cheekCenter - 44)
            : raisedSeam - LIP_HEIGHT));
          const lastRow = Math.min(PATCH_HEIGHT, Math.ceil(hasCheek
            ? Math.max(raisedSeam + LIP_HEIGHT, cheekCenter + 44)
            : raisedSeam + LIP_HEIGHT));
          const compression = 0.18 * (1 - cornerWeight) * (1 - alongLip) * liftProgress;
          const lipCoverage = Math.max(cornerWeight, 0.25 * (1 - alongLip));
          const horizontalPull = direction * spread * cornerWeight;
          for (let targetY = firstRow; targetY < lastRow; targetY++) {
            const fromRaisedSeam = targetY - raisedSeam;
            const lipBand = influence(0, fromRaisedSeam / LIP_HEIGHT);
            const cheek = influence(cheekX, (targetY - cheekCenter) / 44) * (1 - cornerWeight * lipBand);
            const coverage = lipBand * lipCoverage + cheek;
            if (coverage === 0) continue;

            const col = targetX - horizontalPull * lipBand;
            const row = targetY + (lift + fromRaisedSeam * compression) * lipBand + cheekRise * cheek;
            const left = Math.floor(col);
            const top = Math.floor(row);
            const fx = col - left;
            const fy = row - top;
            const topLeft = (top * PATCH_WIDTH + left) * 4;
            const bottomLeft = topLeft + PATCH_WIDTH * 4;
            const pixel = (targetY * PATCH_WIDTH + targetX) * 4;
            for (let channel = 0; channel < 3; channel++) {
              const upper = source.data[topLeft + channel] * (1 - fx) + source.data[topLeft + 4 + channel] * fx;
              const lower = source.data[bottomLeft + channel] * (1 - fx) + source.data[bottomLeft + 4 + channel] * fx;
              output.data[pixel + channel] = upper * (1 - fy) + lower * fy;
            }
            output.data[pixel + 3] = Math.min(1, coverage * 16) * 255;
          }
        }
        context.putImageData(output, 0, 0);
        if (progress < 1) frame = requestAnimationFrame(render);
      };
      frame = requestAnimationFrame(render);
    };
    void prepare();
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      context.clearRect(0, 0, PATCH_WIDTH, PATCH_HEIGHT);
    };
  }, [active, image, geometry, patchLeft, patchTop, seamX, seamY]);

  return <canvas ref={canvas} width={PATCH_WIDTH} height={PATCH_HEIGHT} data-pulse={pulse}
    aria-hidden="true" className="gj-portrait-smirk pointer-events-none absolute"
    style={{ left: `${patchLeft / 1086 * 100}%`, top: `${patchTop / 1448 * 100}%`, width: `${PATCH_WIDTH / 1086 * 100}%`, height: `${PATCH_HEIGHT / 1448 * 100}%` }} />;
}
