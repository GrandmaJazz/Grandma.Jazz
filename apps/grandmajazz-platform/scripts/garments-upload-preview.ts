import express from "express";
import path from "node:path";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import { createGarmentsRouter } from "../server/garments";

const app = express();
const root = await mkdtemp(path.join(os.tmpdir(), "garments-browser-"));
app.use(express.json());
app.use(createGarmentsRouter((req, res, next) => {
  if (req.header("X-Admin-Key") !== "local-browser-qa-only") { res.sendStatus(401); return; } next();
}, root, "/root/grandmajazz-work/client/public/garments/manifest.json"));
const assets = "/root/grandmajazz-work/dist/public";
app.use(express.static(assets));
app.get("*", (_req, res) => res.sendFile(path.join(assets, "index.html")));
const server = app.listen(3024, "0.0.0.0", () => console.log("Isolated upload QA listening on port 3024"));
process.on("SIGTERM", () => server.close());
