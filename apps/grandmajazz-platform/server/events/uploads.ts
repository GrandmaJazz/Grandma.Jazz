import { randomBytes } from "node:crypto";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import multer from "multer";
import sharp from "sharp";
import { eventsConfig } from "./config";

/**
 * Event media handling. Images are decoded and re-encoded with sharp
 * (strips metadata, defeats polyglot files), stored under randomized names
 * in a non-executable uploads directory outside the built app bundle.
 */

const MAX_DIMENSION = 2400;
const ALLOWED_INPUT = new Set(["image/jpeg", "image/png", "image/webp"]);

export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: eventsConfig.maxUploadBytes, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_INPUT.has(file.mimetype)) {
      cb(new Error("Only JPEG, PNG or WebP images are allowed"));
      return;
    }
    cb(null, true);
  },
});

export interface StoredImage {
  /** public path beneath the events base, e.g. /events/uploads/ab12….webp */
  publicPath: string;
  width: number;
  height: number;
}

export async function storeEventImage(buffer: Buffer): Promise<StoredImage> {
  await mkdir(eventsConfig.uploadsDir, { recursive: true });

  // sharp decodes by content, not by declared MIME — invalid data throws here.
  const image = sharp(buffer, { failOn: "error", limitInputPixels: 30_000_000 });
  const meta = await image.metadata();
  if (!meta.width || !meta.height) throw new Error("Could not read image dimensions");

  const name = `${randomBytes(16).toString("hex")}.webp`;
  const resized = image
    .rotate() // apply EXIF orientation, then strip metadata via re-encode
    .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 });
  const info = await resized.toFile(path.join(eventsConfig.uploadsDir, name));

  return {
    publicPath: `/events/uploads/${name}`,
    width: info.width,
    height: info.height,
  };
}

/** Guard against traversal when serving/deleting by filename. */
export function isSafeUploadName(name: string): boolean {
  return /^[a-f0-9]{32}\.webp$/.test(name);
}
