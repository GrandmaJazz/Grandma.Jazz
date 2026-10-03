import { createCanvas, type CanvasRenderingContext2D } from "canvas";

/**
 * Strip backdrop for the Apple Wallet event ticket. iOS renders the
 * primaryFields (event title) ON TOP of the strip image, so the strip must
 * stay text-free — it's a quiet wall-of-bricks motif in the Grandma Jazz
 * style whose treatment changes with the pass state:
 *   normal     — faint white bricks
 *   emphasized — brighter bricks (TONIGHT / HAPPENING NOW / CHECKED IN)
 *   cancelled  — red-tinted bricks
 * The textual state lives in the header field (top right of the card),
 * which iOS typesets natively.
 */

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export interface StripSpec {
  eventTitle: string; // kept for API stability; not drawn (iOS renders it)
  label: string;
  emphasize: boolean;
  cancelled: boolean;
}

/** Strip @ scale (1x = 375x98pt). */
export function renderStrip(spec: StripSpec, scale: 1 | 2 | 3): Buffer {
  const w = 375 * scale, h = 98 * scale;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);

  const stroke = spec.cancelled
    ? "rgba(255,110,110,0.30)"
    : spec.emphasize
      ? "rgba(255,255,255,0.22)"
      : "rgba(255,255,255,0.09)";
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1 * scale;

  // brick courses, offset like the wall on the home page
  const bw = 64 * scale, bh = 22 * scale, gap = 6 * scale;
  for (let row = 0; row < 6; row++) {
    const offset = (row % 2) * (bw / 2);
    for (let x = -bw; x < w + bw; x += bw + gap) {
      roundRect(ctx, x + offset, row * (bh + gap) - 8 * scale, bw, bh, 5 * scale);
      ctx.stroke();
    }
  }

  // gentle vignette so iOS's white title text stays legible on any screen
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  return canvas.toBuffer("image/png");
}
