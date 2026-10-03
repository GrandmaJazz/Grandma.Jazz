import { createCanvas, registerFont } from "canvas";
import path from "node:path";
import fs from "node:fs";

// Matches the approved reference composition:
// black 1290x792 canvas, inset rounded tile, right-biased text block.
const EXPORT_W = 1290;
const EXPORT_H = 792;
const TILE_X = 83;
const TILE_Y = 241;
const TILE_W = 1123;
const TILE_H = 367;
const BORDER_W = 10;
const RADIUS = 41;
const FONT_SIZE = 94;
const LETTER_SPACING_EM = 0.12;
const TEXT_STROKE = 1.55;
const TEXT_RIGHT = 1078;
const TITLE_Y = 372;
const NAME_Y = 479;
const EMAIL_X = TILE_X - BORDER_W / 2;
const EMAIL_Y = TILE_Y - BORDER_W / 2;
const EMAIL_W = TILE_W + BORDER_W;
const EMAIL_H = TILE_H + BORDER_W;
const EMAIL_RADIUS = RADIUS + BORDER_W / 2;

let fontRegistered = false;

function ensureFont(): string {
  const family = "GrandmaSans";
  if (fontRegistered) return family;

  const candidates = [
    process.env.GRANDMA_FONT_PATH,
    path.resolve(process.cwd(), "server/fonts/Galvji-Light.ttf"),
    path.resolve(process.cwd(), "server/fonts/brick-light.ttf"),
  ].filter(Boolean) as string[];

  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        registerFont(p, { family, weight: "100" });
        console.log(`[BrickImage] Registered font: ${p}`);
        fontRegistered = true;
        return family;
      }
    } catch (e) {
      console.warn(`[BrickImage] Failed to register ${p}:`, e);
    }
  }

  console.warn(
    "[BrickImage] No custom font found. Falling back to system sans-serif. " +
      "Drop a Galvji-style TTF at server/fonts/Galvji-Light.ttf or set GRANDMA_FONT_PATH."
  );
  fontRegistered = true;
  return "sans-serif";
}

function roundedRectPath(
  ctx: any,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawTrackedText(
  ctx: any,
  text: string,
  rightX: number,
  centerY: number,
  letterSpacing: number
) {
  const glyphs = Array.from(text);
  const widths = glyphs.map((char) => ctx.measureText(char).width);
  const totalWidth =
    widths.reduce((sum, width) => sum + width, 0) +
    Math.max(0, glyphs.length - 1) * letterSpacing;

  let x = rightX - totalWidth;
  for (let i = 0; i < glyphs.length; i++) {
    ctx.fillText(glyphs[i], x, centerY);
    ctx.strokeText(glyphs[i], x, centerY);
    x += widths[i] + letterSpacing;
  }
}

function renderBrickCanvas(title: string, name: string, emailCrop = false) {
  const family = ensureFont();
  const canvas = createCanvas(emailCrop ? EMAIL_W : EXPORT_W, emailCrop ? EMAIL_H : EXPORT_H);
  const ctx = canvas.getContext("2d");
  const offsetX = emailCrop ? EMAIL_X : 0;
  const offsetY = emailCrop ? EMAIL_Y : 0;

  if (emailCrop) {
    roundedRectPath(ctx, 0, 0, EMAIL_W, EMAIL_H, EMAIL_RADIUS);
    ctx.clip();
  }

  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = BORDER_W;
  roundedRectPath(
    ctx,
    TILE_X - offsetX,
    TILE_Y - offsetY,
    TILE_W,
    TILE_H,
    RADIUS
  );
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = TEXT_STROKE;
  ctx.lineJoin = "miter";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle"; // anchor each line at its vertical center
  try {
    (ctx as any).letterSpacing = "0.1em";
  } catch {}
  ctx.font = `100 ${FONT_SIZE}px "${family}", system-ui, sans-serif`;
  const letterSpacing = FONT_SIZE * LETTER_SPACING_EM;

  drawTrackedText(ctx, title, TEXT_RIGHT - offsetX, TITLE_Y - offsetY, letterSpacing);
  drawTrackedText(ctx, name, TEXT_RIGHT - offsetX, NAME_Y - offsetY, letterSpacing);

  return canvas;
}

export function renderBrickPng(title: string, name: string): Buffer {
  return renderBrickCanvas(title, name).toBuffer("image/png");
}

export function renderEmailBrickPng(title: string, name: string): Buffer {
  return renderBrickCanvas(title, name, true).toBuffer("image/png");
}

export function brickFilename(title: string, name: string): string {
  const safe = (s: string) => s.replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 40);
  return `${safe(name)}-${safe(title)}-grandma-jazz.png`;
}
