import { chromium } from "/root/hermes-agent/node_modules/playwright/index.mjs";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import sharp from "sharp";

const base = process.env.GARMENTS_QA_URL || "http://127.0.0.1:3026";
const out = process.env.GARMENTS_QA_OUT || "/tmp/grandmajazz-hint-qa";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: "/root/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell", args: ["--no-sandbox", "--disable-dev-shm-usage", "--enable-unsafe-swiftshader"] });
const results = [], errors = [];
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 1000 }, hasTouch: width === 390, recordVideo: { dir: out } });
    const page = await context.newPage();
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(() => {
      window.hintTimes = [];
      let visible = false;
      new MutationObserver(() => {
        const next = !!document.querySelector(".garments-turn-hint");
        if (next !== visible) { window.hintTimes.push({ visible: next, time: performance.now() }); visible = next; }
      }).observe(document, { childList: true, subtree: true });
    });
    const host = page.locator('[data-testid="garments-3d-stage"]');
    const mode = value => page.waitForFunction(value => document.querySelector('[data-testid="garments-3d-stage"]')?.dataset.mode === value, value, { timeout: 60000 });
    const position = async () => Number(await host.getAttribute("data-global-page"));
    await page.goto(`${base}/garments`); await mode("browsing");
    const cover = page.locator("button[data-issue]").first();
    await cover.click();
    const hint = page.locator(".garments-turn-hint");
    await hint.waitFor(); await page.waitForTimeout(850);
    assert.equal(await position(), 0);
    assert.equal(await page.locator(".garments-page button:visible").count(), 1);
    const bounds = await hint.boundingBox();
    assert(bounds.x >= 0 && bounds.x + bounds.width <= width && bounds.y > 44);
    assert(Number(await host.getAttribute("data-progress")) > 0);
    const capture = await page.screenshot({ path: `${out}/hint-${width}.png` });
    assert((await sharp(capture).stats()).channels[0].stdev > 20);
    await hint.waitFor({ state: "detached", timeout: 10000 });
    assert.equal(await position(), 0);
    const timing = await page.evaluate(() => window.hintTimes);
    const duration = timing[1].time - timing[0].time;
    assert(duration >= 4800 && duration < 6500, `Unexpected hint duration: ${duration}`);
    await page.screenshot({ path: `${out}/settled-${width}.png` });
    await page.getByRole("button", { name: "Close magazine", exact: true }).click(); await mode("browsing");
    await cover.click(); await hint.waitFor(); await page.waitForTimeout(650);
    const box = await page.locator("canvas").boundingBox();
    const x = box.x + box.width * .8, y = box.y + box.height * .65;
    if (width === 390) {
      const cdp = await context.newCDPSession(page);
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
      assert.equal(await hint.count(), 0);
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: box.x + box.width * .08, y }] });
      await page.waitForTimeout(150);
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    } else {
      await page.mouse.move(x, y); await page.mouse.down();
      assert.equal(await hint.count(), 0);
      await page.mouse.move(box.x + box.width * .08, y, { steps: 12 });
      await page.mouse.up();
    }
    await mode("reading"); assert.equal(await position(), 1);
    await page.waitForTimeout(5100); assert.equal(await hint.count(), 0);
    assert.equal(await position(), 1);
    const metrics = await host.evaluate(el => { el.dispatchEvent(new Event("garments:metrics")); return JSON.parse(el.dataset.metrics); });
    assert.equal(metrics.zoom, 1); assert(metrics.deformationCount > 0);
    await page.getByRole("button", { name: "Close magazine", exact: true }).click(); await mode("browsing");
    results.push({ width, hintDurationMs: duration, bounds, deformations: metrics.deformationCount, renderer: metrics.renderer, video: await page.video().path() });
    await context.close();
  }
  assert.deepEqual(errors, []);
  await writeFile(`${out}/result.json`, JSON.stringify({ base, results, errors }, null, 2));
  console.log(JSON.stringify({ base, results, errors }, null, 2));
} finally { await browser.close(); }
