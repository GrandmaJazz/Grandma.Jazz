import { afterEach, beforeEach, describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import { mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createCanvas } from "canvas";
import sharp from "sharp";
import { orderUploadBatch, previewDraft, type PreparedPage } from "../client/src/garments/draft";
import { readAdminKeyFile } from "../server/adminKey";
import { createGarmentsRouter, validateSvg } from "../server/garments";

let directory: string;
let app: express.Express;
const key = "upload-test-only";
const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600"><rect width="400" height="600" fill="#ff5500"/><text x="40" y="100">UPLOAD TEST</text></svg>';
beforeEach(async () => {
  directory = await mkdtemp(path.join(os.tmpdir(), "garments-test-"));
  const seed = path.join(directory, "seed.json");
  await writeFile(seed, JSON.stringify({ logo: null, issues: [] }));
  app = express(); app.use(express.json());
  app.use(createGarmentsRouter((req, res, next) => { if (req.header("X-Admin-Key") !== key) { res.sendStatus(401); return; } next(); }, directory, seed));
});
afterEach(async () => { await rm(directory, { recursive: true, force: true }); });
async function upload(buffer: Buffer, name: string) {
  const response = await request(app).post("/api/garments/uploads").set("X-Admin-Key", key).attach("file", buffer, name);
  expect(response.status).toBe(202);
  for (let n = 0; n < 300; n++) {
    const poll = await request(app).get(`/api/garments/uploads/${response.body.id}`).set("X-Admin-Key", key);
    if (poll.body.state !== "converting") { await new Promise(r => setTimeout(r, 30)); return poll.body; }
    await new Promise(r => setTimeout(r, 20));
  }
  throw new Error("Conversion timeout");
}
describe("Garments publishing", () => {
  it("loads a dedicated admin key without changing session credentials", async () => {
    const file = path.join(directory, ".admin-key");
    expect(readAdminKeyFile(file)).toBeUndefined();
    await writeFile(file, "test-admin-key\n"); expect(readAdminKeyFile(file)).toBe("test-admin-key");
    await writeFile(file, ""); expect(readAdminKeyFile(file)).toBe("");
  });
  it("sorts numbered batches naturally without mutating their source", () => {
    const files = [{ name: "page 10.svg" }, { name: "page 2.svg" }, { name: "page 1.svg" }];
    expect(orderUploadBatch(files).map(f => f.name)).toEqual(["page 1.svg", "page 2.svg", "page 10.svg"]);
    expect(files[0].name).toBe("page 10.svg");
  });
  it("previews the exact ordered faces without publishing or duplicating covers", () => {
    const pages: PreparedPage[] = Array.from({ length: 20 }, (_, index) => ({ job: "test", index, image: `/page-${index}.webp`, thumbnail: `/thumb-${index}.webp`, width: 400, height: 600, title: `Page ${index + 1}`, alt: `Artwork ${index + 1}` }));
    const draft = previewDraft(pages, "Preview", false);
    expect(draft.cover.image).toBe("/page-0.webp"); expect(draft.backCover.image).toBe("/page-19.webp"); expect(draft.pages).toHaveLength(18);
    expect(previewDraft(pages, "Preview", true).pages).toHaveLength(19);
    expect(() => previewDraft([], "Preview", true)).toThrow();
  });
  it("requires admin authentication before receiving uploads", async () => {
    expect((await request(app).post("/api/garments/uploads").attach("file", Buffer.from(svg), "cover.svg")).status).toBe(401);
    expect((await request(app).post("/api/garments/issues").send({})).status).toBe(401);
  });
  it("converts SVG, publishes atomically, persists and serves only raster pages", async () => {
    const job = await upload(Buffer.from(svg), "cover.svg");
    expect(job.state).toBe("ready");
    expect(job.pages[0].height).toBe(4096);
    expect((await request(app).get("/api/garments/issues")).body.issues).toHaveLength(0);
    const published = await request(app).post("/api/garments/issues").set("X-Admin-Key", key).send({ title: "Upload test", issueNumber: "1", publicationDate: "2026-09-05", blankBack: true, pages: [{ job: job.id, index: 0, alt: "Orange cover" }] });
    expect(published.status).toBe(201);
    const manifest = (await request(app).get("/api/garments/issues")).body;
    expect(manifest.issues[0].backCover.blank).toBe(true);
    expect(manifest.issues[0].width / manifest.issues[0].height).toBeCloseTo(2 / 3);
    expect(JSON.parse(await readFile(path.join(directory, "manifest.json"), "utf8"))).toEqual(manifest);
    expect((await request(app).get(job.pages[0].image)).headers["content-type"]).toContain("image/webp");
    expect((await request(app).get(`/garments/media/${job.id}/job.json`)).status).toBe(404);
  });
  it("preserves PDF page order and extracts accessible text", async () => {
    const canvas = createCanvas(400, 600, "pdf"); const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ff0000"; ctx.fillRect(0, 0, 400, 600); ctx.addPage(); ctx.fillStyle = "#0000ff"; ctx.fillRect(0, 0, 400, 600);
    const job = await upload(canvas.toBuffer("application/pdf"), "issue.pdf");
    expect(job.state).toBe("ready"); expect(job.pages).toHaveLength(2);
    const result = await request(app).post("/api/garments/issues").set("X-Admin-Key", key).send({ title: "PDF test", issueNumber: "2", publicationDate: "2026-09-05", blankBack: false, pages: [{ job: job.id, index: 1, alt: "Blue front" }, { job: job.id, index: 0, alt: "Red back" }] });
    expect(result.status).toBe(201);
    const issue = (await request(app).get("/api/garments/issues")).body.issues[0];
    expect(issue.cover.image).toContain("page-1"); expect(issue.backCover.image).toContain("page-0"); expect(issue.pages).toHaveLength(0);
  });
  it("rejects malformed assets without publishing anything", async () => {
    expect((await upload(Buffer.from("not an image"), "bad.png")).state).toBe("error");
    expect((await request(app).get("/api/garments/issues")).body.issues).toHaveLength(0);
  });
  it("validates disguised SVG before invoking the raster decoder", async () => {
    const disguised = `${" ".repeat(2000)}<svg xmlns="http://www.w3.org/2000/svg"><use xmlns:x="http://www.w3.org/1999/xlink" x:href="file:///etc/passwd"/></svg>`;
    expect((await upload(Buffer.from(disguised), "disguised.png")).state).toBe("error");
  });
  it("supports AVIF artwork without trusting the filename", async () => {
    const buffer = await sharp({ create: { width: 100, height: 150, channels: 3, background: "red" } }).avif().toBuffer();
    const job = await upload(buffer, "photo.avif"); expect(job.state).toBe("ready");
  });
  it.each(["png", "jpeg", "webp"] as const)("renders embedded %s artwork in SVG image and pattern elements", async format => {
    const raster = await sharp({ create: { width: 80, height: 120, channels: 3, background: "#ff0000" } }).toFormat(format).toBuffer();
    const source = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="400" height="600"><defs><image id="photo" width="80" height="120" xlink:href="data:image/${format};base64,${raster.toString("base64")}"/><pattern id="print" width="1" height="1" patternContentUnits="objectBoundingBox"><use xlink:href="#photo" transform="scale(0.0125 0.008333333)"/></pattern></defs><rect width="400" height="600" fill="url(#print)"/></svg>`;
    const job = await upload(Buffer.from(source), "client-page.svg");
    expect(job.state).toBe("ready");
    const response = await request(app).get(job.pages[0].image);
    const { data } = await sharp(response.body).resize(1, 1).raw().toBuffer({ resolveWithObject: true });
    expect(data[0]).toBeGreaterThan(200); expect(data[1]).toBeLessThan(40);
  });
  it("rejects nested SVG disguised as an embedded raster image", () => {
    const nested = Buffer.from('<svg><image href="file:///etc/passwd"/></svg>').toString("base64");
    expect(() => validateSvg(`<svg><image href="data:image/png;base64,${nested}"/></svg>`)).toThrow();
  });
  it("does not accept unconverted or invalid publication data", async () => {
    const response = await request(app).post("/api/garments/issues").set("X-Admin-Key", key).send({ title: "Bad", pages: [] });
    expect(response.status).toBe(400);
  });
  it.each([
    '<svg><script>alert(1)</script></svg>',
    '<svg><image href="https://example.com/private"/></svg>',
    '<svg><use href="file:///etc/passwd"/></svg>',
    '<svg><rect fill="url(https://example.com)"/></svg>',
    '<svg><g style="fill:url(file:///etc/passwd)"/></svg>',
    '<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///etc/passwd">]><svg>&x;</svg>',
  ])("rejects unsafe SVG: %s", source => { expect(() => validateSvg(source)).toThrow(); });
});
