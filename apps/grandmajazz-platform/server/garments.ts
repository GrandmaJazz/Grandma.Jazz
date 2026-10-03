import express, { type RequestHandler } from "express";
import multer from "multer";
import sharp from "sharp";
import { Parser, parseDocument, DomUtils } from "htmlparser2";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, rename, rm, readdir, stat, statfs } from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { z } from "zod";
import { blankPage, parseManifest, type GarmentsManifest } from "../client/src/garments/issues";

const exec = promisify(execFile);
const idSchema = z.string().uuid();
type Page = { image: string; thumbnail: string; width: number; height: number; title: string; text?: string };
type Job = { id: string; state: "converting" | "ready" | "error"; pages: Page[]; error?: string };

// SVGs are never served or evaluated. Reject active content and all external resources before rasterising.
export function validateSvg(source: string) {
  let root = false;
  const embedded: Buffer[] = [];
  const allowed = new Set("svg g defs path rect circle ellipse line polyline polygon text tspan title desc linearGradient radialGradient stop clipPath mask use symbol image pattern".split(" "));
  const parser = new Parser({
    onprocessinginstruction(name) { if (name.toLowerCase() !== "?xml") throw new Error("SVG declarations are not supported"); },
    onopentag(name, attrs) {
      if (!root && name !== "svg") throw new Error("Invalid SVG document");
      root = true;
      if (!allowed.has(name)) throw new Error(`Unsupported SVG element: ${name}. Export as PDF or PNG instead.`);
      for (const [key, value] of Object.entries(attrs)) {
        if (/^on/i.test(key) || key === "style" || key === "xml:base") throw new Error("SVG scripts and CSS are not supported. Export as PDF or PNG instead.");
        if ((key === "href" || key.endsWith(":href")) && !/^#[\w.-]+$/.test(value)) {
          const data = name === "image" && value.match(/^data:image\/(png|jpeg|webp);base64,([a-z0-9+/=\s]+)$/i);
          if (!data) throw new Error("SVG images must be embedded PNG, JPEG or WebP data, not external links.");
          const bytes = Buffer.from(data[2], "base64");
          const type = data[1].toLowerCase();
          const valid = type === "png" ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
            : type === "jpeg" ? bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255]))
            : bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
          if (!valid) throw new Error("SVG embedded image data does not match its image type.");
          embedded.push(bytes);
          if (embedded.length > 100 || embedded.reduce((sum, b) => sum + b.length, 0) > 25 * 1024 * 1024) throw new Error("SVG embedded artwork exceeds the upload limits.");
        }
        if (/url\s*\(/i.test(value) && !/^url\(#[\w.-]+\)$/.test(value)) throw new Error("SVG external resources are not allowed");
        if (value.includes("\\")) throw new Error("SVG escaped resource references are not allowed");
      }
    },
  }, { xmlMode: true, decodeEntities: true });
  parser.write(source); parser.end();
  if (!root) throw new Error("Invalid SVG document");
  return embedded;
}

async function prepareSvg(source: string) {
  let pixels = 0;
  const images: string[] = [];
  for (const bytes of validateSvg(source)) {
    const meta = await sharp(bytes, { limitInputPixels: 30_000_000, failOn: "warning" }).metadata();
    pixels += (meta.width || 0) * (meta.height || 0);
    if (!meta.width || !meta.height || pixels > 30_000_000 || (meta.pages || 1) > 1) throw new Error("SVG embedded images exceed 30 megapixels or contain animation.");
    // librsvg does not consistently decode embedded WebP. Normalise all raster resources to PNG.
    const png = await sharp(bytes, { limitInputPixels: 30_000_000 }).png().timeout({ seconds: 20 }).toBuffer();
    images.push(`data:image/png;base64,${png.toString("base64")}`);
  }
  if (!images.length) return source;
  const document = parseDocument(source, { xmlMode: true });
  let index = 0;
  for (const element of DomUtils.findAll(element => element.name === "image", document.children)) {
    for (const [key, value] of Object.entries(element.attribs)) {
      if ((key === "href" || key.endsWith(":href")) && value.startsWith("data:")) element.attribs[key] = images[index++];
    }
  }
  return DomUtils.getOuterHTML(document, { xmlMode: true });
}

export function createGarmentsRouter(requireAdmin: RequestHandler, root = path.resolve("uploads/garments"), seed = path.resolve("client/public/garments/manifest.json")) {
  const router = express.Router();
  const jobs = new Map<string, Job>();
  let occupied = false;
  let publishing = false;
  const ready = mkdir(root, { recursive: true });
  const manifestPath = path.join(root, "manifest.json");
  async function manifest(): Promise<GarmentsManifest> {
    try { return parseManifest(JSON.parse(await readFile(manifestPath, "utf8"))); }
    catch (error: any) { if (error.code !== "ENOENT") throw error; }
    return parseManifest(JSON.parse(await readFile(seed, "utf8")));
  }
  const wrap = (fn: express.RequestHandler): express.RequestHandler => (req, res, next) => { Promise.resolve(fn(req, res, next)).catch(next); };
  router.get("/api/garments/issues", wrap(async (_req, res) => { res.set("Cache-Control", "no-store").json(await manifest()); }));
  router.get("/api/garments/admin", requireAdmin, (_req, res) => { res.json({ ok: true }); });
  router.get("/garments/media/:id/:file", wrap(async (req, res) => {
    if (!idSchema.safeParse(req.params.id).success || !/^(page-\d+|thumb-\d+)\.webp$/.test(req.params.file)) { res.sendStatus(404); return; }
    res.set({ "X-Content-Type-Options": "nosniff", "Cache-Control": "public, max-age=31536000, immutable" });
    res.sendFile(path.join(root, req.params.id, req.params.file), error => { if (error && !res.headersSent) res.sendStatus(404); });
  }));
  const upload = multer({ dest: root, limits: { fileSize: 25 * 1024 * 1024, files: 1, fields: 0 } }).single("file");
  router.post("/api/garments/uploads", requireAdmin, wrap(async (req, res) => {
    await ready;
    if (occupied || publishing) { res.status(409).json({ error: "Another file is converting or publishing. Please retry shortly." }); return; }
    occupied = true;
    try {
      const current = JSON.stringify(await manifest());
      for (const entry of await readdir(root, { withFileTypes: true })) {
        if (!idSchema.safeParse(entry.name).success && !/^[a-f0-9]{32}$/.test(entry.name)) continue;
        const item = path.join(root, entry.name);
        if (!current.includes(entry.name) && Date.now() - (await stat(item)).mtimeMs > 86400000) {
          await rm(item, { recursive: true, force: true }); jobs.delete(entry.name);
        }
      }
      const disk = await statfs(root);
      if (disk.bavail * disk.bsize < 1024 * 1024 * 1024) throw new Error("Insufficient storage");
    } catch { occupied = false; res.status(503).json({ error: "Upload storage is unavailable or full." }); return; }
    upload(req, res, error => {
      if (error || !req.file) { occupied = false; res.status(400).json({ error: error?.message || "Choose a file" }); return; }
      const file = req.file;
      const job: Job = { id: randomUUID(), state: "converting", pages: [] };
      jobs.set(job.id, job);
      res.status(202).json({ id: job.id });
      void (async () => {
        const directory = path.join(root, job.id);
        await mkdir(directory);
        job.pages = await convertGarmentsFile(file.path, directory, job.id, file.originalname);
        await writeFile(path.join(directory, "job.json"), JSON.stringify({ ...job, state: "ready" }));
        job.state = "ready";
      })().catch(async error => {
        job.state = "error"; job.pages = []; job.error = /SVG|PDFs must|Use PDF|Animated|incomplete/.test(error.message) ? error.message : "Could not convert this file. Try a flattened PDF or image.";
        await rm(path.join(root, job.id), { recursive: true, force: true });
      }).finally(async () => { occupied = false; await rm(file.path, { force: true }); if (jobs.size > 100) jobs.delete(jobs.keys().next().value!); }).catch(console.error);
    });
  }));
  async function getJob(id: string): Promise<Job> {
    idSchema.parse(id);
    return jobs.get(id) || JSON.parse(await readFile(path.join(root, id, "job.json"), "utf8"));
  }
  router.get("/api/garments/uploads/:id", requireAdmin, wrap(async (req, res) => { res.set("Cache-Control", "no-store").json(await getJob(req.params.id)); }));
  router.post("/api/garments/issues", requireAdmin, wrap(async (req, res) => {
    const data = z.object({ title: z.string().trim().min(1).max(160), issueNumber: z.string().trim().max(40), publicationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), enquiryUrl: z.string().max(300).optional(), blankBack: z.boolean(), pages: z.array(z.object({ job: idSchema, index: z.number().int().min(0).max(39), alt: z.string().trim().min(1).max(2000) })).min(1).max(80) }).parse(req.body);
    if (publishing || occupied) { res.status(409).json({ error: "Publication is busy. Retry shortly." }); return; }
    publishing = true;
    try {
      const selected = await Promise.all(data.pages.map(async p => { const job = await getJob(p.job); const page = job.pages[p.index]; if (job.state !== "ready" || !page) throw new Error("Page conversion is not ready"); return { ...page, id: `${p.job}-${p.index}`, alt: p.alt }; }));
      if (!data.blankBack && selected.length < 2) throw new Error("Add a back cover or select blank back cover");
      const id = randomUUID();
      const slug = `${data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70) || "issue"}-${id.slice(0, 8)}`;
      const cover = selected[0];
      const backCover = data.blankBack ? blankPage : selected[selected.length - 1];
      const issue = { id, slug, title: data.title, issueNumber: data.issueNumber, publicationDate: data.publicationDate, width: cover.width, height: cover.height, cover, backCover, pages: selected.slice(1, data.blankBack ? undefined : -1), ...(data.enquiryUrl ? { enquiryUrl: data.enquiryUrl } : {}) };
      const current = await manifest();
      const next = parseManifest({ ...current, issues: [...current.issues, issue] });
      const temporary = `${manifestPath}.${id}.tmp`;
      await writeFile(temporary, JSON.stringify(next, null, 2));
      await rename(temporary, manifestPath);
      res.status(201).json({ slug });
    } finally { publishing = false; }
  }));
  router.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(400).json({ error: error instanceof z.ZodError ? "Check the issue details and Instagram URL." : error.code === "ENOENT" ? "Upload not found. Please upload again." : "The request could not be completed." });
  });
  return router;
}

export async function convertGarmentsFile(sourcePath: string, directory: string, id: string, filename: string): Promise<Page[]> {
  const pages: Page[] = [];
  const originalSource = sourcePath;
        const input = await readFile(sourcePath);
        const pdf = input.subarray(0, 5).toString() === "%PDF-";
        const raster = input.subarray(0, 3).equals(Buffer.from([255, 216, 255]))
          || input.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
          || (input.toString("ascii", 0, 4) === "RIFF" && input.toString("ascii", 8, 12) === "WEBP")
          || ["49492a00", "4d4d002a", "49492b00", "4d4d002b"].includes(input.subarray(0, 4).toString("hex"))
          || input.toString("ascii", 4, 8) === "ftyp";
        const svg = !pdf && !raster;
        let inputs = [sourcePath];
        if (pdf) {
          const info = await exec("pdfinfo", [sourcePath], { timeout: 10000, maxBuffer: 1024 * 1024, env: { ...process.env, LC_ALL: "C" } });
          const count = Number(info.stdout.match(/^Pages:\s+(\d+)/m)?.[1]);
          if (!count || count > 40) throw new Error("PDFs must contain 1 to 40 pages");
          await exec("prlimit", ["--as=1073741824", "--cpu=85", "--fsize=268435456", "--", "pdftoppm", "-f", "1", "-l", String(count), "-scale-to", "4096", "-png", sourcePath, path.join(directory, "source")], { timeout: 90000, maxBuffer: 1024 * 1024 });
          inputs = (await readdir(directory)).filter(n => n.endsWith(".png")).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).map(n => path.join(directory, n));
          if (inputs.length !== count) throw new Error("PDF conversion was incomplete");
        } else if (svg) { sourcePath = path.join(directory, "prepared.svg"); inputs = [sourcePath]; await writeFile(sourcePath, await prepareSvg(input.toString("utf8"))); }
        for (let i = 0; i < inputs.length; i++) {
          let density = 72;
          if (svg) {
            const dimensions = await sharp(inputs[i], { limitInputPixels: 30_000_000 }).metadata();
            density = Math.min(2400, Math.max(1, 72 * 4096 / Math.max(dimensions.width || 4096, dimensions.height || 4096)));
          }
          const image = sharp(inputs[i], { limitInputPixels: 30_000_000, failOn: "warning", density });
          const meta = await image.metadata();
          if (meta.format === "svg" && !svg) throw new Error("SVG input must pass validation before conversion.");
          if (!pdf && !["svg", "jpeg", "png", "webp", "tiff"].includes(meta.format || "") && !(meta.format === "heif" && meta.compression === "av1")) throw new Error("Use PDF, SVG, JPEG, PNG, WebP, TIFF or AVIF");
          if ((meta.pages || 1) > 1) throw new Error("Animated or multi-frame images are not supported. Use PDF for multiple pages.");
          const result = await image.rotate().resize({ width: 4096, height: 4096, fit: "inside", withoutEnlargement: !svg }).flatten({ background: "#ffffff" }).webp({ lossless: true, effort: 2 }).timeout({ seconds: 30 }).toFile(path.join(directory, `page-${i}.webp`));
          await sharp(path.join(directory, `page-${i}.webp`)).resize({ width: 440, height: 440, fit: "inside" }).webp({ quality: 85 }).toFile(path.join(directory, `thumb-${i}.webp`));
          let text: string | undefined;
          if (pdf) { try { text = (await exec("pdftotext", ["-f", String(i + 1), "-l", String(i + 1), sourcePath, "-"], { timeout: 5000, maxBuffer: 256 * 1024 })).stdout.trim(); } catch { /* Scanned pages have no extractable text. */ } }
          pages.push({ image: `/garments/media/${id}/page-${i}.webp`, thumbnail: `/garments/media/${id}/thumb-${i}.webp`, width: result.width, height: result.height, title: `${filename} - ${i + 1}`, text });
        }
        for (const temporary of inputs) if (temporary !== sourcePath) await rm(temporary, { force: true });
        if (path.resolve(originalSource) !== path.resolve(directory, "source.upload")) await writeFile(path.join(directory, "source.upload"), input);
        if (svg) await rm(sourcePath, { force: true });

  return pages;
}
