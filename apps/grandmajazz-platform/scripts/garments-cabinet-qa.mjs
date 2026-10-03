import { chromium } from "/root/hermes-agent/node_modules/playwright/index.mjs";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import sharp from "sharp";

const out = "/tmp/grandmajazz-cabinet-qa";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: "/root/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell", args: ["--no-sandbox", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, recordVideo: { dir: out, size: { width: 1440, height: 1000 } } });
const errors = []; page.on("pageerror", e => errors.push(e.message));
const mode = value => page.waitForFunction(v => document.querySelector("[data-mode]")?.dataset.mode === v, value, { timeout: 60000 });
const results = [];
let releaseWood;
const woodReady = new Promise(resolve => { releaseWood = resolve; });
await page.route("**/garments/materials/walnut-grain.jpg", async route => { await woodReady; await route.continue(); });
try {
  await page.goto("http://127.0.0.1:3026/garments", { waitUntil: "domcontentloaded" });
  await mode("browsing");
  await page.locator("canvas").screenshot({ path: `${out}/wood-loading.png` });
  releaseWood();
  await page.waitForFunction(() => document.querySelector("[data-mode]")?.dataset.coversLoaded === "4", null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  for (const [width, height] of [[1440,1000],[390,844],[430,932],[768,1024],[1024,900],[1920,1080]]) {
    await page.setViewportSize({ width, height }); await page.waitForTimeout(600);
    const canvas = page.locator("canvas");
    await canvas.scrollIntoViewIfNeeded(); await page.waitForTimeout(200);
    const pixels = await canvas.screenshot({ path: `${out}/cabinet-${width}.png` });
    await page.screenshot({ path: `${out}/page-${width}.png`, fullPage: true });
    const stats = await sharp(pixels).stats();
    assert(stats.channels[0].stdev > 15, "Canvas must contain rendered artwork");
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "No horizontal overflow");
    assert.equal(await page.locator("[data-mode]").getAttribute("data-cabinet-columns"), "2");
    results.push({ width, height, pixelDeviation: stats.channels.map(c => c.stdev) });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("http://127.0.0.1:3026/garments");
  await page.waitForFunction(() => document.querySelector("[data-mode]")?.dataset.coversLoaded === "4");
  await page.waitForTimeout(1000);
  await page.locator("canvas").scrollIntoViewIfNeeded();
  const shelf = await page.locator("canvas").boundingBox();
  const shelfScale = Math.min(shelf.height * .86 / 5.18, shelf.width * .88 / 3.6);
  await page.mouse.click(shelf.x + shelf.width / 2 - .62 * shelfScale, shelf.y + shelf.height / 2 - .87 * shelfScale);
  await mode("reading");
  await page.waitForTimeout(600); assert.equal(await page.locator("[data-mode]").getAttribute("data-page"), "0");
  await page.screenshot({ path: `${out}/reader-cover.png` });
  const reader = await page.locator("canvas").boundingBox();
  const printedWidth = Number(await page.locator("[data-mode]").getAttribute("data-page-width-pixels"));
  const edge = reader.x + reader.width / 2 + printedWidth / 2 - 5;
  const cornerY = reader.y + reader.height * .72;
  await page.mouse.move(edge, cornerY); await page.mouse.down();
  await page.mouse.move(edge - 20, cornerY, { steps: 2 });
  await mode("dragging");
  for (const progress of [.25, .5, .75]) {
    await page.mouse.move(edge - printedWidth * 2 * progress, cornerY - 20 * progress, { steps: 8 });
    await page.waitForTimeout(250);
    await page.screenshot({ path: `${out}/curl-${progress}.png` });
  }
  await page.locator("canvas").dispatchEvent("pointercancel", { pointerId: 1, pointerType: "mouse" });
  await page.mouse.up(); await mode("reading");
  assert.equal(await page.locator("[data-mode]").getAttribute("data-page"), "0");
  await page.keyboard.press("ArrowRight"); await mode("reading");
  assert.equal(await page.locator("[data-mode]").getAttribute("data-page"), "1");
  await page.screenshot({ path: `${out}/reader-spread.png` });
  await page.getByRole("button", { name: "Close magazine", exact: true }).click(); await mode("browsing");
  await page.waitForTimeout(600);
  await page.locator("[data-mode]").evaluate(el => el.dispatchEvent(new Event("garments:metrics")));
  const metrics = JSON.parse(await page.locator("[data-mode]").getAttribute("data-metrics"));
  const original = await (await page.request.get("http://127.0.0.1:3026/api/garments/issues")).json();
  await page.route("**/api/garments/issues", route => route.fulfill({ json: { ...original, issues: Array.from({ length: 12 }, (_, i) => ({ ...original.issues[i % 4], id: `qa-${i}`, slug: `qa-${i}`, title: `Development fixture ${i}` })) } }));
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await page.goto("http://127.0.0.1:3026/garments"); await mode("browsing");
    const count = width === 390 ? 6 : 12;
    await page.waitForFunction(n => document.querySelector("[data-mode]")?.dataset.coversLoaded === String(n), count, { timeout: 60000 });
    assert.equal(await page.locator("[data-mode]").getAttribute("data-cabinet-rows"), "3");
    assert.equal(await page.locator("[data-issue]").count(), count);
    await page.locator("canvas").screenshot({ path: `${out}/capacity-${count}.png` });
  }
  assert.deepEqual(errors, []);
  await writeFile(`${out}/result.json`, JSON.stringify({ results, metrics, errors, coverFirst: true, turnAndReturn: true }, null, 2));
  console.log(`PASS: six viewports, rendered canvas, cover, curl and return. Evidence: ${out}`);
} finally { await page.close(); await browser.close(); }
