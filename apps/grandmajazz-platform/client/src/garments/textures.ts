import * as THREE from "three";
import type { GarmentsIssue, GarmentsPageAsset } from "./issues";

export function loadImage(url: string, signal?: AbortSignal): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    const done = (error?: Error) => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      image.onload = image.onerror = null;
      if (error) { image.src = ""; reject(error); } else resolve(image);
    };
    const abort = () => done(new Error("Image request cancelled"));
    const timer = window.setTimeout(() => done(new Error("Page artwork timed out")), 15000);
    image.onload = () => done();
    image.onerror = () => done(new Error("Page artwork could not be loaded"));
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) abort(); else image.src = url;
  });
}

export async function pageTexture(page: GarmentsPageAsset, issue: GarmentsIssue, maxHeight: number, signal?: AbortSignal, imageLoader = loadImage) {
  const canvas = document.createElement("canvas");
  canvas.height = Math.max(1, Math.round(maxHeight / Math.max(1, issue.width / issue.height)));
  canvas.width = Math.max(1, Math.round(canvas.height * issue.width / issue.height));
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.fillStyle = page.blank && (page.blankColor || issue.blankColor) === "black" ? "#0a0a0a" : "#f5f1e6";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (page.image) {
    const img = await imageLoader(page.image, signal);
    // Preserve all artwork, including nonstandard page proportions.
    const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
    ctx.drawImage(img, (canvas.width - img.width * scale) / 2, (canvas.height - img.height * scale) / 2, img.width * scale, img.height * scale);
  } else if (page.fixture) {
    await document.fonts.ready;
    const { number, color, photo } = page.fixture;
    ctx.scale(canvas.width / 1000, canvas.height / 1414);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1000, 1414);
    if (photo) {
      const img = await loadImage(photo, signal);
      const box = number % 2 === 0 ? { x: 0, y: 300, w: 1000, h: 930 } : { x: 76, y: 340, w: 848, h: 740 };
      const scale = Math.max(box.w / img.width, box.h / img.height);
      ctx.save(); ctx.beginPath(); ctx.rect(box.x, box.y, box.w, box.h); ctx.clip();
      ctx.drawImage(img, box.x + (box.w - img.width * scale) / 2, box.y + (box.h - img.height * scale) / 2, img.width * scale, img.height * scale);
      ctx.restore();
    }
    ctx.fillStyle = "#151515";
    ctx.font = '24px "Garments Mono", monospace';
    ctx.fillText("DEVELOPMENT / PAPER STUDY", 76, 74);
    ctx.font = '84px "Garments Display", serif';
    ctx.fillText(page.title, 76, 202, 850);
    ctx.font = '26px "Garments Sans", sans-serif';
    ctx.fillText("Grandma Jazz reference photography", 76, 264);
    ctx.font = '22px "Garments Mono", monospace';
    ctx.fillText("TEST ARTWORK / NOT A PUBLISHED ISSUE", 76, 1305);
    ctx.fillText(String(number).padStart(2, "0"), 864, 1360);
    ctx.lineWidth = 1; ctx.strokeStyle = "#777777";
    ctx.beginPath(); ctx.moveTo(76, 1330); ctx.lineTo(924, 1330); ctx.stroke();
  } else if (!page.blank) {
    throw new Error("Missing page artwork");
  }
  if (signal?.aborted) throw new Error("Image request cancelled");
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Compressed artwork stays in this reading session, while large GPU textures
// are still released outside the nearby page window. No persistent cache.
export class SessionArtwork {
  private sources = new Map<string, { objectUrl: string; bytes: number }>();
  private pending = new Map<string, Promise<string>>();
  private bytes = 0;
  private disposed = false;
  constructor(private signal: AbortSignal, private limit = 32 * 1024 * 1024) {}
  async source(url: string): Promise<string> {
    if (this.disposed) throw new Error("Image request cancelled");
    const cached = this.sources.get(url);
    if (cached) { this.sources.delete(url); this.sources.set(url, cached); return cached.objectUrl; }
    const existing = this.pending.get(url); if (existing) return existing;
    const task = (async () => {
      const response = await fetch(url, { signal: this.signal, credentials: "same-origin" });
      if (!response.ok) throw new Error("Page artwork could not be loaded");
      const blob = await response.blob();
      if (this.disposed || this.signal.aborted) throw new Error("Image request cancelled");
      const objectUrl = URL.createObjectURL(blob);
      this.sources.set(url, { objectUrl, bytes: blob.size }); this.bytes += blob.size;
      while (this.bytes > this.limit && this.sources.size > 1) {
        const [key, source] = this.sources.entries().next().value!;
        this.sources.delete(key); this.bytes -= source.bytes; URL.revokeObjectURL(source.objectUrl);
      }
      return objectUrl;
    })();
    this.pending.set(url, task);
    try { return await task; } finally { this.pending.delete(url); }
  }
  dispose() {
    this.disposed = true; this.sources.forEach(source => URL.revokeObjectURL(source.objectUrl));
    this.sources.clear(); this.pending.clear(); this.bytes = 0;
  }
}

export class PageTextures {
  private cache = new Map<number, THREE.Texture>();
  private pending = new Map<string, Promise<THREE.Texture>>();
  private abort = new AbortController();
  private artwork = new SessionArtwork(this.abort.signal);
  constructor(private issue: GarmentsIssue, private pages: GarmentsPageAsset[], private maxHeight: number, private anisotropy: number) {}
  get(index: number) { return this.cache.get(index); }
  sizes() { return Array.from(this.cache).map(([index, texture]) => ({ index, width: texture.image.width, height: texture.image.height })); }
  async ensure(indices: number[], resolution = this.maxHeight) {
    const settled = await Promise.allSettled(Array.from(new Set(indices)).filter(i => i >= 0 && i < this.pages.length).map(async i => {
      const current = this.cache.get(i);
      if (current && Math.max(current.image.width, current.image.height) >= resolution) return;
      const key = `${i}:${resolution}`;
      let promise = this.pending.get(key);
      if (!promise) {
        promise = pageTexture(this.pages[i], this.issue, resolution, this.abort.signal, async url => loadImage(await this.artwork.source(url), this.abort.signal));
        this.pending.set(key, promise);
      }
      try {
        const texture = await promise;
        texture.anisotropy = this.anisotropy;
        return { i, texture };
      } finally { this.pending.delete(key); }
    }));
    const failure = settled.find(result => result.status === "rejected");
    if (failure?.status === "rejected") {
      for (const result of settled) if (result.status === "fulfilled" && result.value && this.cache.get(result.value.i) !== result.value.texture) result.value.texture.dispose();
      throw failure.reason;
    }
    const results = settled.flatMap(result => result.status === "fulfilled" ? [result.value] : []);
    for (const result of results) {
      if (!result) continue;
      const old = this.cache.get(result.i);
      if (old === result.texture) continue;
      if (this.abort.signal.aborted || (old && Math.max(old.image.width, old.image.height) >= resolution)) { result.texture.dispose(); continue; }
      this.cache.set(result.i, result.texture); old?.dispose();
    }
  }
  retain(indices: number[], highDetailIndices: number[] = indices) {
    const keep = new Set(indices);
    const highDetail = new Set(highDetailIndices);
    this.cache.forEach((texture, index) => { if (!keep.has(index) || (!highDetail.has(index) && Math.max(texture.image.width, texture.image.height) > this.maxHeight)) { texture.dispose(); this.cache.delete(index); } });
  }
  dispose() { this.abort.abort(); this.artwork.dispose(); this.cache.forEach(t => t.dispose()); this.cache.clear(); }
}
