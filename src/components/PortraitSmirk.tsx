import { useEffect, useRef, type RefObject } from 'react';

const PATCH_SIZE = 96;
const RADIUS = 31;
const LIFT = 9;

/** Displace the painted pixels locally so the mouth moves without a second face layer. */
export default function PortraitSmirk({ image, corner, pulse }: {
  image: RefObject<HTMLImageElement>;
  corner: readonly [number, number];
  pulse: string | undefined;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [x, y] = corner;
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
      context.drawImage(portrait, (x - PATCH_SIZE / 2) * ratio, (y - PATCH_SIZE / 2) * ratio,
        PATCH_SIZE * ratio, PATCH_SIZE * ratio, 0, 0, PATCH_SIZE, PATCH_SIZE);
      const source = context.getImageData(0, 0, PATCH_SIZE, PATCH_SIZE);
      const output = context.createImageData(PATCH_SIZE, PATCH_SIZE);
      const weights = new Float32Array(PATCH_SIZE * PATCH_SIZE);
      for (let row = 0; row < PATCH_SIZE; row++) {
        for (let col = 0; col < PATCH_SIZE; col++) {
          const distance = Math.hypot(col - PATCH_SIZE / 2, row - PATCH_SIZE / 2) / RADIUS;
          weights[row * PATCH_SIZE + col] = Math.max(0, 1 - distance * distance) ** 2;
        }
      }
      const render = () => {
        const progress = overlay.getAnimations()[0]?.effect?.getComputedTiming().progress;
        if (progress == null) return;
        const strength = 1 - Math.abs(2 * progress - 1);
        for (let i = 0; i < weights.length; i++) {
          const shift = weights[i] * LIFT * strength;
          const rows = Math.floor(shift);
          const fraction = shift - rows;
          const offset = (i + rows * PATCH_SIZE) * 4;
          const pixel = i * 4;
          for (let channel = 0; channel < 3; channel++) {
            const first = source.data[offset + channel];
            const next = source.data[offset + PATCH_SIZE * 4 + channel] ?? first;
            output.data[pixel + channel] = first + (next - first) * fraction;
          }
          // Feather the patch into the original painting at its edges.
          output.data[pixel + 3] = Math.min(1, weights[i] * 5) * 255;
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
  }, [active, image, x, y]);

  return <canvas ref={canvas} width={PATCH_SIZE} height={PATCH_SIZE} data-pulse={pulse}
    aria-hidden="true" className="gj-portrait-smirk pointer-events-none absolute"
    style={{ left: `${(x - PATCH_SIZE / 2) / 1086 * 100}%`, top: `${(y - PATCH_SIZE / 2) / 1448 * 100}%`, width: `${PATCH_SIZE / 1086 * 100}%`, height: `${PATCH_SIZE / 1448 * 100}%` }} />;
}
