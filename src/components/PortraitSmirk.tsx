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
    const context = overlay.getContext('2d', { willReadFrequently: true });
    if (!context) return;
    let frame = 0;
    let stopped = false;
    const prepare = async () => {
      try { await portrait.decode(); } catch { return; }
      if (stopped) return;
      const ratio = portrait.naturalWidth / 1086;
      context.drawImage(portrait, patchLeft * ratio, patchTop * ratio,
        PATCH_WIDTH * ratio, PATCH_HEIGHT * ratio, 0, 0, PATCH_WIDTH, PATCH_HEIGHT);
      const source = context.getImageData(0, 0, PATCH_WIDTH, PATCH_HEIGHT);
      const output = context.createImageData(PATCH_WIDTH, PATCH_HEIGHT);
      const [leftSide, rightSide] = geometry.sides.map((side) => ({
        ...side,
        seamTilt: side.corner[1] - seamY,
        halfMouth: Math.abs(side.corner[0] - seamX),
        cheekX: side.cheek[0] - patchLeft,
        cheekY: side.cheek[1] - patchTop,
      }));

      const render = () => {
        const progress = overlay.getAnimations()[0]?.effect?.getComputedTiming().progress;
        if (progress == null) return;
        const expression = Math.sin(Math.PI * progress);
        const widthProgress = expression * (2 - expression) * MOTION_SCALE;
        const liftProgress = expression ** 1.35 * MOTION_SCALE;
        for (let i = 0; i < PATCH_WIDTH * PATCH_HEIGHT; i++) {
          const pixel = i * 4;
          const targetX = i % PATCH_WIDTH;
          const targetY = Math.floor(i / PATCH_WIDTH);
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
          const fromRaisedSeam = targetY - neutralSeam + lift;
          const lipBand = influence(0, fromRaisedSeam / LIP_HEIGHT);
          const lip = cornerWeight * lipBand;
          const cheekRise = side.cheekLift * liftProgress;
          const cheek = influence((targetX - side.cheekX) / 34,
            (targetY - side.cheekY + cheekRise) / 44) * (1 - lip);
          const coverage = lipBand * Math.max(cornerWeight, 0.25 * (1 - alongLip)) + cheek;
          if (coverage === 0) {
            output.data[pixel + 3] = 0;
            continue;
          }

          const compression = 0.18 * (1 - cornerWeight) * (1 - alongLip) * liftProgress;
          const col = targetX - direction * spread * lip;
          const row = targetY + (lift + fromRaisedSeam * compression) * lipBand + cheekRise * cheek;
          const left = Math.floor(col);
          const top = Math.floor(row);
          const fx = col - left;
          const fy = row - top;
          const topLeft = (top * PATCH_WIDTH + left) * 4;
          const bottomLeft = topLeft + PATCH_WIDTH * 4;
          for (let channel = 0; channel < 3; channel++) {
            const upper = source.data[topLeft + channel] * (1 - fx) + source.data[topLeft + 4 + channel] * fx;
            const lower = source.data[bottomLeft + channel] * (1 - fx) + source.data[bottomLeft + 4 + channel] * fx;
            output.data[pixel + channel] = upper * (1 - fy) + lower * fy;
          }
          output.data[pixel + 3] = Math.min(1, coverage * 16) * 255;
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
