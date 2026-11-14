import { useEffect, useRef, type RefObject } from 'react';

const PATCH_SIZE = 112;
const PATCH_CENTER = PATCH_SIZE / 2;
const HORIZONTAL_RADIUS = 44;
const VERTICAL_RADIUS = 27;

/** Displace the painted pixels locally so the mouth moves without a second face layer. */
export default function PortraitSmirk({ image, corner, pull, pulse }: {
  image: RefObject<HTMLImageElement>;
  corner: readonly [number, number];
  pull: readonly [number, number];
  pulse: string | undefined;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [x, y] = corner;
  const [pullX, pullY] = pull;
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
      const weights = new Float32Array(PATCH_SIZE * PATCH_SIZE);
      for (let row = 0; row < PATCH_SIZE; row++) {
        for (let col = 0; col < PATCH_SIZE; col++) {
          const dx = (col - PATCH_CENTER) / HORIZONTAL_RADIUS;
          const dy = (row - PATCH_CENTER) / VERTICAL_RADIUS;
          weights[row * PATCH_SIZE + col] = Math.max(0, 1 - dx * dx - dy * dy) ** 2;
        }
      }
      const render = () => {
        const progress = overlay.getAnimations()[0]?.effect?.getComputedTiming().progress;
        if (progress == null) return;
        const strength = 1 - Math.abs(2 * progress - 1);
        for (let i = 0; i < weights.length; i++) {
          const weight = weights[i];
          if (weight === 0) continue;

          // Sample backwards along the pull and blend the four neighbouring pixels.
          const col = i % PATCH_SIZE - pullX * weight * strength;
          const row = Math.floor(i / PATCH_SIZE) - pullY * weight * strength;
          const left = Math.floor(col);
          const top = Math.floor(row);
          const fx = col - left;
          const fy = row - top;
          const topLeft = (top * PATCH_SIZE + left) * 4;
          const bottomLeft = topLeft + PATCH_SIZE * 4;
          const pixel = i * 4;
          for (let channel = 0; channel < 3; channel++) {
            const upper = source.data[topLeft + channel] * (1 - fx) + source.data[topLeft + 4 + channel] * fx;
            const lower = source.data[bottomLeft + channel] * (1 - fx) + source.data[bottomLeft + 4 + channel] * fx;
            output.data[pixel + channel] = upper * (1 - fy) + lower * fy;
          }
          output.data[pixel + 3] = Math.min(1, weight * 5) * 255;
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
  }, [active, image, x, y, pullX, pullY]);

  return <canvas ref={canvas} width={PATCH_SIZE} height={PATCH_SIZE} data-pulse={pulse}
    aria-hidden="true" className="gj-portrait-smirk pointer-events-none absolute"
    style={{ left: `${(x - PATCH_CENTER) / 1086 * 100}%`, top: `${(y - PATCH_CENTER) / 1448 * 100}%`, width: `${PATCH_SIZE / 1086 * 100}%`, height: `${PATCH_SIZE / 1448 * 100}%` }} />;
}
