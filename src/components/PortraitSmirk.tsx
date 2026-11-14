import { useEffect, useRef, type RefObject } from 'react';

const PATCH_SIZE = 176;
const PATCH_CENTER = PATCH_SIZE / 2;
const CHEEK_EDGE = 78;
const ABOVE_LIP = 51;
const BELOW_LIP = 36;

type SmirkGeometry = {
  center: readonly [number, number];
  corner: readonly [number, number];
  width: number;
  lift: number;
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
  const [x, y] = geometry.corner;
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
      context.drawImage(portrait, (x - PATCH_CENTER) * ratio, (y - PATCH_CENTER) * ratio,
        PATCH_SIZE * ratio, PATCH_SIZE * ratio, 0, 0, PATCH_SIZE, PATCH_SIZE);
      const source = context.getImageData(0, 0, PATCH_SIZE, PATCH_SIZE);
      const output = context.createImageData(PATCH_SIZE, PATCH_SIZE);
      const side = Math.sign(x - geometry.center[0]);
      const halfMouth = Math.abs(x - geometry.center[0]);
      const seamSlope = (y - geometry.center[1]) / halfMouth;
      const render = () => {
        const progress = overlay.getAnimations()[0]?.effect?.getComputedTiming().progress;
        if (progress == null) return;
        const expression = Math.sin(Math.PI * progress);
        // The mouth widens along the seam first. The corner lift catches up as
        // the expression deepens and eases off first as the face relaxes.
        const spread = geometry.width * expression * (2 - expression);
        const rise = geometry.lift * expression * expression;
        for (let i = 0; i < PATCH_SIZE * PATCH_SIZE; i++) {
          const pixel = i * 4;
          const targetX = i % PATCH_SIZE;
          const targetY = Math.floor(i / PATCH_SIZE);
          const outward = (targetX - PATCH_CENTER) * side;
          const fromSeam = targetY - PATCH_CENTER - seamSlope * outward;
          const fromCorner = outward - spread;
          const fromRaisedCorner = fromSeam + rise;
          // Evaluate the mask around the moved corner. Its inner edge stays
          // anchored at the center seam as the lip stretches.
          const lip = influence(
            fromCorner / (fromCorner < 0 ? halfMouth + spread : CHEEK_EDGE - spread),
            fromRaisedCorner / (fromRaisedCorner < 0 ? ABOVE_LIP - rise : BELOW_LIP + rise),
          );
          const cheek = influence((outward - 34) / 40, (fromSeam + 29) / 28) * (1 - lip);
          if (lip === 0 && cheek === 0) {
            output.data[pixel + 3] = 0;
            continue;
          }

          // Inverse sample both lips together, with a smaller lift across the cheek.
          const pull = spread * (lip + 0.22 * cheek);
          const elevation = rise * (lip + 0.48 * cheek);
          const col = targetX - side * pull;
          const row = targetY - seamSlope * pull + elevation;
          const left = Math.floor(col);
          const top = Math.floor(row);
          const fx = col - left;
          const fy = row - top;
          const topLeft = (top * PATCH_SIZE + left) * 4;
          const bottomLeft = topLeft + PATCH_SIZE * 4;
          for (let channel = 0; channel < 3; channel++) {
            const upper = source.data[topLeft + channel] * (1 - fx) + source.data[topLeft + 4 + channel] * fx;
            const lower = source.data[bottomLeft + channel] * (1 - fx) + source.data[bottomLeft + 4 + channel] * fx;
            output.data[pixel + channel] = upper * (1 - fy) + lower * fy;
          }
          output.data[pixel + 3] = Math.min(1, (lip + cheek) * 16) * 255;
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
      context.clearRect(0, 0, PATCH_SIZE, PATCH_SIZE);
    };
  }, [active, image, geometry, x, y]);

  return <canvas ref={canvas} width={PATCH_SIZE} height={PATCH_SIZE} data-pulse={pulse}
    aria-hidden="true" className="gj-portrait-smirk pointer-events-none absolute"
    style={{ left: `${(x - PATCH_CENTER) / 1086 * 100}%`, top: `${(y - PATCH_CENTER) / 1448 * 100}%`, width: `${PATCH_SIZE / 1086 * 100}%`, height: `${PATCH_SIZE / 1448 * 100}%` }} />;
}
