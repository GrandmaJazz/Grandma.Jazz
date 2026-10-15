import { readFile, readdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";

const paper = fileURLToPath(new URL("../client/public/garments/paper/", import.meta.url));
// librsvg can silently omit embedded WebP images on some hosts. Give its SVG
// decoder PNG data, then encode the complete rendered page as WebP for delivery.
const material = await sharp(path.join(paper, "natural-paper-v2.webp")).png().toBuffer();
const sources = (await readdir(paper)).filter(name => /^(reverse|closing)-\d{3}-v2\.svg$/.test(name)).sort();

for (const name of sources) {
  const svg = (await readFile(path.join(paper, name), "utf8"))
    .replace('opacity=".78" preserveAspectRatio', 'opacity=".90" preserveAspectRatio');
  const images = new Map<string, Buffer>([["natural-paper-v2.webp", material]]);
  for (const image of ["garments-mark.png", "garments-wordmark.png"]) {
    images.set(image, await readFile(path.join(paper, image)));
  }
  const embedded = svg.replace(/href="(natural-paper-v2\.webp|garments-(?:mark|wordmark)\.png)"/g,
    (_match, image: string) => `href="data:image/png;base64,${images.get(image)!.toString("base64")}"`);
  const rendered = await sharp(Buffer.from(embedded), { density: 144 })
    .resize(1620, 2160).webp({ quality: 88, smartSubsample: true }).toBuffer();
  // Inspect an unprinted area at phone size: a flat beige export must fail.
  const patch = await sharp(rendered).resize(390, 520)
    .extract({ left: 39, top: 52, width: 312, height: 130 }).png().toBuffer();
  const blank = await sharp(patch).stats();
  if (blank.channels[0].stdev < 1.2) throw new Error(`Paper texture missing from ${name}`);
  const destination = name.replace("-v2.svg", "-v3");
  await writeFile(path.join(paper, `${destination}.svg`), svg);
  await writeFile(path.join(paper, `${destination}.webp`), rendered);
  console.log(`${destination}: ${rendered.length} bytes; phone grain ${blank.channels[0].stdev.toFixed(2)}`);
}
