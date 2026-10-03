import { chromium } from "/root/hermes-agent/node_modules/playwright/index.mjs";
import { execFileSync } from "node:child_process";
import { createCanvas } from "canvas";
import { mkdir, rm, writeFile, readFile } from "node:fs/promises";
import assert from "node:assert/strict";

// Read the existing key into memory only. Never log it, store it in artifacts or send it off-origin.
const processes = JSON.parse(execFileSync("pm2", ["jlist"], { encoding: "utf8", env: { ...process.env, PM2_HOME: "/root/.pm2" } }));
const env = processes.find(p => p.name === "grandmajazz")?.pm2_env;
const fileKey = await readFile("/var/www/grandmajazz/.admin-key", "utf8").then(value => value.trim()).catch(error => { if (error.code === "ENOENT") return undefined; throw error; });
const key = fileKey ?? (env?.ADMIN_TOKEN || env?.GRANDMAJAZZ_ADMIN_TOKEN || env?.SESSION_SECRET);
assert(key, "Existing admin authentication must be configured");
const base = "https://grandmajazz.com";
const before = await (await fetch(`${base}/api/garments/issues`)).json();
const output = "/tmp/grandmajazz-upload-live";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: "/root/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell", args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = []; const uploads = [];
page.on("pageerror", e => errors.push(e.message));
page.on("response", async response => {
  if (response.url() === `${base}/api/garments/uploads` && response.status() === 202) uploads.push((await response.json()).id);
});
try {
  assert.equal((await fetch(`${base}/api/garments/admin`)).status, 401);
  await page.goto(`${base}/garments/manage`);
  await page.getByLabel("Admin key", { exact: true }).fill(key);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByLabel("Issue title", { exact: true }).fill("Unpublished deployment verification");
  const canvas = createCanvas(400, 600, "pdf"); const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#dcefe6"; ctx.fillRect(0, 0, 400, 600); ctx.fillStyle = "black"; ctx.font = "28px sans-serif"; ctx.fillText("UNPUBLISHED QA", 30, 100);
  const embedded = createCanvas(80, 120); const embeddedContext = embedded.getContext("2d");
  embeddedContext.fillStyle = "#b49b73"; embeddedContext.fillRect(0, 0, 80, 120);
  const start = Date.now();
  await page.getByLabel("Choose magazine files").setInputFiles([
    { name: "unpublished-qa.pdf", mimeType: "application/pdf", buffer: canvas.toBuffer("application/pdf") },
    { name: "unpublished-qa.svg", mimeType: "image/svg+xml", buffer: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600"><rect width="400" height="600" fill="#e3d3df"/><image x="40" y="150" width="200" height="300" href="data:image/png;base64,${embedded.toBuffer("image/png").toString("base64")}"/><text x="30" y="100" font-size="28">UNPUBLISHED SVG QA</text></svg>`) },
  ]);
  await page.getByText("Pages ready", { exact: true }).waitFor({ timeout: 120000 });
  assert.equal(await page.locator(".garments-upload-pages li").count(), 2);
  assert(await page.locator(".garments-upload-pages img").evaluateAll(images => images.every(img => img.complete && img.naturalWidth > 0)));
  await page.getByRole("button", { name: "Add page", exact: true }).waitFor();
  await page.getByRole("button", { name: "Save and publish", exact: true }).waitFor();
  await page.getByRole("button", { name: "Preview magazine", exact: true }).click();
  await page.waitForFunction(() => document.querySelector("dialog [data-mode]")?.dataset.mode === "reading" || document.querySelector("dialog .garments-draft-pages img"), null, { timeout: 60000 });
  await page.getByRole("button", { name: "Close preview", exact: true }).click();
  await page.screenshot({ path: `${output}/desktop-upload.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: `${output}/mobile-upload.png`, fullPage: true });
  assert.deepEqual(await (await fetch(`${base}/api/garments/issues`)).json(), before);
  assert.deepEqual(errors, []);
  await writeFile(`${output}/result.json`, JSON.stringify({ authenticated: true, unauthorizedRejected: true, pdfAndSvgConverted: true, publishedTestContent: false, elapsedUploadAndConversionMs: Date.now() - start, errors }, null, 2));
  console.log("Deployed admin login, PDF + SVG uploads, raster previews, mobile layout, unchanged public archive: PASS");
} catch (error) {
  await page.screenshot({ path: `${output}/failure.png`, fullPage: true });
  console.log(JSON.stringify({ errors, mode: await page.locator("dialog [data-mode]").getAttribute("data-mode").catch(() => null), alerts: await page.getByRole("alert").allTextContents() }));
  throw error;
} finally {
  await browser.close();
  for (const id of uploads) if (/^[a-f0-9-]{36}$/.test(id)) await rm(`/var/www/grandmajazz/uploads/garments/${id}`, { recursive: true, force: true });
}
