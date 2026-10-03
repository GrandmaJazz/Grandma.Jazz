import express from "express";
import multer from "multer";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, statfs, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { GarmentsRepository, ManagementError } from "./garmentsRepository";
import { garmentsAuth, asyncRoute } from "./garmentsAuth";
import { convertGarmentsFile } from "./garments";
import { editionActions } from "../shared/garments-management";
import type { GarmentsManifest } from "../client/src/garments/issues";

export async function createManagedGarments(repo: GarmentsRepository, options: { root: string; seed: string; secret: string; origin: string; bootstrapKey: () => string | undefined; worker?: boolean }) {
  const { root } = options;
  await mkdir(root, { recursive: true });
  if (!(await repo.pool.query("SELECT 1 FROM gj_garments_settings WHERE id=1")).rowCount) {
    let manifest: GarmentsManifest;
    try { manifest = JSON.parse(await readFile(path.join(root, "manifest.json"), "utf8")); }
    catch (e: any) { if (e.code !== "ENOENT") throw e; manifest = JSON.parse(await readFile(options.seed, "utf8")); }
    await repo.importManifest(manifest);
  }
  const router = express.Router(), auth = garmentsAuth(repo, options.secret, options.origin, options.bootstrapKey);
  router.use("/garments", auth.middleware);
  router.use("/garments/api", (_req, res, next) => { res.set({ "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" }); next(); });
  router.use("/garments/api/auth", auth.router);
  router.get("/api/garments/issues", asyncRoute(async (req, res) => { res.set("Cache-Control", "no-store").json(await repo.publicManifest(req.query.archive === "1")); }));
  router.get("/api/garments/issues/:slug", asyncRoute(async (req, res) => { const manifest = await repo.publicManifest(false, req.params.slug); if (!manifest.issues.length) throw new ManagementError(404, "This edition is not available"); res.set("Cache-Control", "no-store").json(manifest); }));
  // Legacy shared-key publication must not bypass membership or revision checks.
  router.all(["/api/garments/admin", "/api/garments/uploads", "/api/garments/uploads/:id"], (_req, res) => res.status(410).json({ error: "Use the Garments staff editor" }));
  router.post("/api/garments/issues", (_req, res) => res.status(410).json({ error: "Use the Garments staff editor" }));
  router.get("/garments/media/:id/:file", asyncRoute(async (req, res) => {
    if (!z.string().uuid().safeParse(req.params.id).success || !/^(page|thumb)-\d+\.webp$/.test(req.params.file)) throw new ManagementError(404, "Artwork not found");
    const image = `/garments/media/${req.params.id}/${req.params.file}`;
    if (!await repo.publicAsset(image) && !await auth.staff(req)) throw new ManagementError(404, "Artwork not found");
    res.set({ "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Vary": "Cookie" });
    res.sendFile(path.join(root, req.params.id, req.params.file), error => { if (error && !res.headersSent) res.sendStatus(404); });
  }));
  const manage = express.Router(); router.use("/garments/api/manage", auth.required, auth.csrf, manage);
  const version = (req: express.Request) => z.number().int().positive().parse(req.body.version);
  manage.get("/editions", asyncRoute(async (req, res) => { res.json(await repo.list(z.enum(["draft", "published", "archived", "trash"]).parse(req.query.status || "draft"))); }));
  manage.post("/editions", asyncRoute(async (_req, res) => { res.status(201).json(await repo.create(res.locals.staff.id)); }));
  manage.get("/editions/:id", asyncRoute(async (req, res) => { res.json(await repo.get(req.params.id)); }));
  manage.put("/editions/:id", asyncRoute(async (req, res) => { res.json(await repo.save(req.params.id, version(req), req.body.document, res.locals.staff.id)); }));
  manage.post("/editions/:id/action", asyncRoute(async (req, res) => { res.json(await repo.action(req.params.id, version(req), z.enum(editionActions).parse(req.body.action), res.locals.staff.id)); }));
  manage.get("/editions/:id/history", asyncRoute(async (req, res) => { res.json(await repo.history(req.params.id)); }));
  manage.post("/editions/:id/history/:revision", asyncRoute(async (req, res) => { res.json(await repo.restoreRevision(req.params.id, version(req), z.string().uuid().parse(req.params.revision), res.locals.staff.id)); }));
  manage.delete("/editions/:id", auth.owner, asyncRoute(async (req, res) => { await repo.remove(req.params.id, version(req), z.string().parse(req.body.title), res.locals.staff.id); res.json({ ok: true }); }));
  const upload = multer({ dest: root, limits: { fileSize: 25 * 1024 * 1024, files: 1, fields: 0 } }).single("file");
  manage.post("/uploads", asyncRoute(async (req, res, next) => {
    const disk = await statfs(root);
    if (disk.bavail * disk.bsize < 1024 ** 3) throw new ManagementError(503, "Upload storage is full");
    if (Number((await repo.pool.query("SELECT count(*) FROM gj_garments_jobs WHERE state IN ('queued','converting')")).rows[0].count) >= 30) throw new ManagementError(429, "Conversion queue is full. Try again shortly.");
    upload(req, res, error => {
      if (error) return next(error);
      void (async () => {
        if (!req.file) throw new ManagementError(400, "Choose a file");
        const id = randomUUID(), directory = path.join(root, id);
        try {
          await mkdir(directory); await rename(req.file.path, path.join(directory, "source.upload"));
          await repo.pool.query("INSERT INTO gj_garments_jobs(id,filename,state,created_by) VALUES($1,$2,'queued',$3)", [id, req.file.originalname.slice(0, 250), res.locals.staff.id]);
        } catch (e) { await rm(directory, { recursive: true, force: true }); await rm(req.file.path, { force: true }); throw e; }
        res.status(202).json({ id }); void work();
      })().catch(next);
    });
  }));
  manage.get("/uploads", asyncRoute(async (_req, res) => { res.json((await repo.pool.query("SELECT id,filename,state,pages,error FROM gj_garments_jobs WHERE created_by=$1 AND created_at>now()-interval '1 day' ORDER BY created_at DESC LIMIT 40", [res.locals.staff.id])).rows); }));
  manage.get("/uploads/:id", asyncRoute(async (req, res) => {
    const row = (await repo.pool.query("SELECT id,filename,state,pages,error FROM gj_garments_jobs WHERE id=$1", [z.string().uuid().parse(req.params.id)])).rows[0];
    if (!row) throw new ManagementError(404, "Upload not found"); res.json(row);
  }));
  let working = false, stopped = false, lastCleanup = 0;
  async function work() {
    if (working || stopped || options.worker === false) return;
    working = true;
    const c = await repo.pool.connect().catch(error => { working = false; console.error("Garments worker connection failed", error.message); return null; });
    if (!c) return;
    let acquired = false;
    try {
      acquired = (await c.query("SELECT pg_try_advisory_lock(7612903) AS locked")).rows[0].locked;
      if (!acquired) return;
      // The global worker lock proves any interrupted conversion has no living worker.
      await c.query("UPDATE gj_garments_jobs SET state=CASE WHEN attempts<3 THEN 'queued' ELSE 'error' END,error=CASE WHEN attempts>=3 THEN 'Conversion was interrupted repeatedly. Upload again.' ELSE NULL END WHERE state='converting'");
      while (!stopped) {
        const job = (await c.query("UPDATE gj_garments_jobs SET state='converting',attempts=attempts+1,updated_at=now() WHERE id=(SELECT id FROM gj_garments_jobs WHERE state='queued' ORDER BY created_at LIMIT 1) RETURNING *")).rows[0];
        if (!job) break;
        try {
          const directory = path.join(root, job.id);
          const pages = await convertGarmentsFile(path.join(directory, "source.upload"), directory, job.id, job.filename);
          await repo.transaction(async tx => {
            const registered = await repo.registerAssets(tx, pages, job.id);
            await tx.query("UPDATE gj_garments_jobs SET state='ready',pages=$2,error=NULL,updated_at=now() WHERE id=$1", [job.id, JSON.stringify(registered)]);
          });
        } catch (error: any) {
          const message = /SVG|PDFs must|Use PDF|Animated|incomplete/.test(error.message) ? error.message : "Could not convert this file. Try a flattened PDF or image.";
          await c.query("UPDATE gj_garments_jobs SET state='error',pages='[]',error=$2,updated_at=now() WHERE id=$1", [job.id, message]);
        }
      }
      if (Date.now() - lastCleanup > 3600000) { await cleanup(); lastCleanup = Date.now(); }
    } catch (error) { console.error("Garments worker failed", (error as Error).message); }
    finally { if (acquired) await c.query("SELECT pg_advisory_unlock(7612903)"); c.release(); working = false; }
  }
  async function cleanup() {
    const removed = await repo.transaction(async c => {
      const expired = (await c.query("SELECT id FROM gj_garments_editions WHERE status='trash' AND trashed_at<now()-interval '30 days' FOR UPDATE")).rows;
      for (const row of expired) { await repo.audit(c, null, row.id, "edition.expired"); await c.query("DELETE FROM gj_garments_editions WHERE id=$1", [row.id]); }
      // FK constraints protect assets if a concurrent draft attaches them during cleanup.
      const jobs = (await c.query("DELETE FROM gj_garments_jobs j WHERE state IN ('ready','error') AND updated_at<now()-interval '1 day' AND NOT EXISTS(SELECT 1 FROM gj_garments_assets a JOIN gj_garments_revision_assets r ON r.asset_id=a.id WHERE a.job_id=j.id) RETURNING id")).rows;
      return jobs;
    });
    for (const job of removed) await rm(path.join(root, job.id), { recursive: true, force: true });
    for (const entry of await readdir(root, { withFileTypes: true })) {
      const id = z.string().uuid().safeParse(entry.name);
      if (!id.success && !/^[a-f0-9]{32}$/.test(entry.name)) continue;
      const file = path.join(root, entry.name);
      if (Date.now() - (await stat(file)).mtimeMs < 86400000) continue;
      if (id.success && (await repo.pool.query("SELECT 1 FROM gj_garments_jobs WHERE id=$1", [entry.name])).rowCount) continue;
      await rm(file, { recursive: true, force: true });
    }
  }
  const timer = setInterval(() => void work(), 3000); timer.unref(); void work();
  router.use((error: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (res.headersSent) return next(error);
    const status = error instanceof ManagementError ? error.status : error instanceof z.ZodError || error instanceof multer.MulterError ? 400 : 500;
    if (status === 500) console.error("Garments request failed", error.message);
    res.set("Cache-Control", "no-store").status(status).json({ error: status === 500 ? "The request could not be completed. Please retry." : error instanceof z.ZodError ? "Check the edition details and page descriptions." : error.message });
  });
  return { router, work, cleanup, close: () => { stopped = true; clearInterval(timer); auth.close(); } };
}
