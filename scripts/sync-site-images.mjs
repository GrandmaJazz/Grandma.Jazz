import { readFile, writeFile, mkdir, readdir, stat } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import sharp from 'sharp';
const api = process.env.NEXT_PUBLIC_API_URL || 'https://grandma-jazz-api.onrender.com';
const products = JSON.parse(execFileSync('curl', ['-fsSL', '--retry', '2', '--max-time', '45', `${api}/api/products`])).products;
const sources = new Map(products.flatMap(product => product.images.map(url => [url, null])));
async function walk(dir) {
  for (const file of await readdir(dir)) {
    const full = path.join(dir, file);
    if (file === 'responsive') continue;
    if ((await stat(full)).isDirectory()) await walk(full);
    else if (/\.(jpe?g|png|webp)$/i.test(file) && (await stat(full)).size > 80000) sources.set('/' + full.replace(/^public\//, ''), full);
  }
}
await walk('public/images');
await mkdir('public/images/responsive', { recursive: true });
const previous = JSON.parse(await readFile('src/lib/responsive-images.json', 'utf8'));
const manifest = {}; let originals = 0, delivered = 0;
for (const [source, local] of sources) {
  if (!local && previous[source]) {
    const entry = previous[source];
    if ((await Promise.all(entry.widths.map(value => stat(`public${entry.base}-${value}.webp`).then(() => true, () => false)))).every(Boolean)) {
      manifest[source] = entry; continue;
    }
  }
  const bytes = local ? await readFile(local) : execFileSync('curl', ['-fsSL', '--retry', '2', '--max-time', '45', source], { maxBuffer: 32 * 1024 * 1024 });
  const metadata = await sharp(bytes).rotate().metadata();
  const width = metadata.autoOrient?.width || metadata.width;
  const height = metadata.autoOrient?.height || metadata.height;
  if (!width || !height) throw new Error(`Invalid image: ${source}`);
  const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 16);
  const base = `/images/responsive/${hash}`;
  const widths = [...new Set([160, 320, 640, 960, 1200, ...(local ? [1920] : [])].map(value => Math.min(value, width)))].sort((a,b) => a-b);
  for (const value of widths) {
    const output = await sharp(bytes).rotate().resize({ width: value, withoutEnlargement: true }).webp({ quality: 86, effort: 5 }).toBuffer();
    await writeFile(`public${base}-${value}.webp`, output);
    if (value === 320) delivered += output.length;
  }
  originals += bytes.length;
  manifest[source] = { base, widths, width, height };
}
await writeFile('src/lib/responsive-images.json', JSON.stringify(manifest, null, 2) + '\n');
const keep = new Set(Object.values(manifest).flatMap(entry => entry.widths.map(value => `${entry.base.split('/').at(-1)}-${value}.webp`)));
for (const file of await readdir('public/images/responsive')) if (!keep.has(file)) await (await import('node:fs/promises')).unlink(`public/images/responsive/${file}`);
console.log(JSON.stringify({ sources: sources.size, originalBytes: originals, preview320Bytes: delivered }));
