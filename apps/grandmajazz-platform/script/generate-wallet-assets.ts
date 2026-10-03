/**
 * Renders the Apple Wallet pass assets (icon, logo @1x/@2x) in the Grandma
 * Jazz brick style: black ground, white Galvji-light type, white rounded
 * border. Output: server/events/wallet/apple-assets/
 *
 * Run once (and re-run only if the brand changes):
 *   npx tsx script/generate-wallet-assets.ts
 */
import { createCanvas, registerFont, type CanvasRenderingContext2D } from "canvas";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

const OUT = path.resolve("server/events/wallet/apple-assets");

function ensureFont(): string {
  const family = "GrandmaSans";
  const candidates = [
    process.env.GRANDMA_FONT_PATH,
    path.resolve(process.cwd(), "server/fonts/Galvji-Light.ttf"),
  ].filter(Boolean) as string[];
  for (const p of candidates) {
    if (existsSync(p)) {
      registerFont(p, { family, weight: "100" });
      return family;
    }
  }
  console.warn("[wallet-assets] Galvji font not found; falling back to sans-serif");
  return "sans-serif";
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawSpaced(ctx: CanvasRenderingContext2D, text: string, rightX: number, y: number, spacing: number) {
  // right-aligned with letter spacing, matching the wall brick treatment
  let total = 0;
  for (const ch of text) total += ctx.measureText(ch).width + spacing;
  total -= spacing;
  let x = rightX - total;
  ctx.textAlign = "left";
  for (const ch of text) {
    ctx.fillText(ch, x, y);
    x += ctx.measureText(ch).width + spacing;
  }
}

/** icon: square, black tile with white "GJ" monogram (Apple crops it round in some UIs). */
function renderIcon(size: number): Buffer {
  const family = ensureFont();
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, size, size);
  const inset = Math.round(size * 0.08);
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = Math.max(2, Math.round(size * 0.055));
  roundRect(ctx, inset, inset, size - inset * 2, size - inset * 2, Math.round(size * 0.17));
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.font = `100 ${Math.round(size * 0.42)}px ${family}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("GJ", size / 2, size / 2 + size * 0.02);
  return canvas.toBuffer("image/png");
}

/** Google's circular mask needs a square logo with generous safe margins. */
function renderGoogleLogo(): Buffer {
  const size = 800;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "#fff";
  ctx.font = `100 300px ${ensureFont()}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("GJ", size / 2, size / 2, size * 0.7);
  return canvas.toBuffer("image/png");
}

/** logo: the two-line right-aligned "Grandma / Jazz" brick from the wall site. */
function renderLogo(w: number, h: number): Buffer {
  const family = ensureFont();
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext("2d");
  // transparent ground — the pass itself is black; draw only the bordered brick
  const bw = Math.max(2, Math.round(h * 0.045));
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = bw;
  roundRect(ctx, bw, bw, w - bw * 2, h - bw * 2, Math.round(h * 0.2));
  ctx.stroke();
  ctx.fillStyle = "#fff";
  const fs = Math.round(h * 0.30);
  ctx.font = `100 ${fs}px ${family}`;
  ctx.textBaseline = "alphabetic";
  const rightX = w - Math.round(w * 0.10);
  const spacing = fs * 0.12;
  drawSpaced(ctx, "Grandma", rightX, Math.round(h * 0.42), spacing);
  drawSpaced(ctx, "Jazz", rightX, Math.round(h * 0.80), spacing);
  return canvas.toBuffer("image/png");
}

mkdirSync(OUT, { recursive: true });
writeFileSync(path.join(OUT, "icon.png"), renderIcon(29));
writeFileSync(path.join(OUT, "icon@2x.png"), renderIcon(58));
writeFileSync(path.join(OUT, "icon@3x.png"), renderIcon(87));
writeFileSync(path.join(OUT, "logo-google-square.png"), renderGoogleLogo());
// Logos derive from the owner-supplied brand artwork (logo-master.png,
// transparent rounded corners) — never re-rendered from fonts.
async function deriveLogos() {
  const sharp = (await import("sharp")).default;
  const master = path.join(OUT, "logo-master.png");
  if (!existsSync(master)) {
    console.warn("[wallet-assets] logo-master.png missing — falling back to rendered logos");
    writeFileSync(path.join(OUT, "logo.png"), renderLogo(160, 50));
    writeFileSync(path.join(OUT, "logo@2x.png"), renderLogo(320, 100));
    writeFileSync(path.join(OUT, "logo-web.png"), renderLogo(380, 130));
    return;
  }
  // owner's artwork used AS-IS: pure resize only, never trim/mask/crop
  await sharp(master).resize({ height: 45 }).png().toFile(path.join(OUT, "logo.png"));
  await sharp(master).resize({ height: 90 }).png().toFile(path.join(OUT, "logo@2x.png"));
  await sharp(master).resize({ height: 130 }).png().toFile(path.join(OUT, "logo-web.png"));
  await sharp(master).resize(1280, 400, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png().toFile(path.join(OUT, "logo-google.png"));
}
await deriveLogos();
console.log(`[wallet-assets] wrote icon/logo assets to ${OUT}`);
