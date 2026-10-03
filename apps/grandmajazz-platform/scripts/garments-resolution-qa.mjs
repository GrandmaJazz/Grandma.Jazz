import { chromium } from "/root/hermes-agent/node_modules/playwright/index.mjs";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";

const base = "http://127.0.0.1:3024";
const out = "/tmp/grandmajazz-resolution-qa";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: "/root/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell", args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const issues = (await (await fetch(`${base}/api/garments/issues`)).json()).issues;
const errors = []; page.on("pageerror", e => errors.push(e.message));
try {
  assert(issues.length);
  await page.goto(`${base}/garments/${issues[0].slug}`);
  await page.waitForFunction(() => document.querySelector("[data-mode]")?.dataset.mode === "reading", null, { timeout: 60000 });
  await page.getByRole("button", { name: "Zoom page", exact: true }).click();
  await page.waitForFunction(() => {
    const host = document.querySelector("[data-mode]"); host?.dispatchEvent(new Event("garments:metrics"));
    return JSON.parse(host?.dataset.metrics || "{}").pageTextureSizes?.some(p => Math.max(p.width, p.height) === 4096);
  }, null, { timeout: 60000 });
  const metrics = JSON.parse(await page.locator("[data-mode]").getAttribute("data-metrics"));
  assert.equal(metrics.pixelRatio, 2);
  assert.equal(metrics.pageTextureSizes.filter(p => Math.max(p.width, p.height) === 4096).length, 2);
  const canvas = await page.locator("canvas").evaluate(el => ({ backing: el.width, css: el.clientWidth }));
  assert(canvas.backing >= canvas.css * 2 - 1);
  await page.screenshot({ path: `${out}/retina-zoom.png` });
  await page.getByRole("button", { name: "Fit page", exact: true }).click();
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await page.waitForFunction(() => document.querySelector("[data-mode]")?.dataset.mode === "reading");
  await page.locator("[data-mode]").evaluate(el => el.dispatchEvent(new Event("garments:metrics")));
  assert.equal(JSON.parse(await page.locator("[data-mode]").getAttribute("data-metrics")).pixelRatio, 2);
  assert.deepEqual(errors, []);
  await writeFile(`${out}/result.json`, JSON.stringify({ retinaViewportEmulation: true, nativeSettledResolution: true, zoom4096: true, canvas, metrics, errors }, null, 2));
  console.log("Retina canvas DPR2, 4096px zoom textures, native resolution restored after a turn: PASS");
} finally { await browser.close(); }
