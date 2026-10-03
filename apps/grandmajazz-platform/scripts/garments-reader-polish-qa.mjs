import { chromium, webkit } from "/root/hermes-agent/node_modules/playwright/index.mjs";
import { mkdir, writeFile, access } from "node:fs/promises";
import assert from "node:assert/strict";
import sharp from "sharp";

const out = "/tmp/grandmajazz-reader-polish-qa";
await mkdir(out, { recursive: true });
const base = "http://127.0.0.1:3026";
const source = await (await fetch(`${base}/api/garments/issues`)).json();
const issues = Array.from({ length: 24 }, (_, index) => ({ ...source.issues[index % source.issues.length], id: `polish-${index}`, slug: `polish-${index}`, title: `QA edition ${index + 1}`, issueNumber: String(index + 1) }));
const browser = await chromium.launch({ executablePath: "/root/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell", args: ["--no-sandbox", "--disable-dev-shm-usage", "--enable-unsafe-swiftshader"] });
const errors = [], results = [];
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, recordVideo: { dir: out, size: { width: 960, height: 960 } } });
await context.route("**/api/garments/issues", route => route.fulfill({ json: { logo: null, issues } }));
const page = await context.newPage();
page.on("pageerror", e => errors.push(e.message));
const host = () => page.locator('[data-testid="garments-3d-stage"]');
const mode = value => page.waitForFunction(value => document.querySelector('[data-testid="garments-3d-stage"]')?.dataset.mode === value, value, { timeout: 60000 });
const position = async () => Number(await host().getAttribute("data-global-page"));
const metrics = () => host().evaluate(el => { el.dispatchEvent(new Event("garments:metrics")); return JSON.parse(el.dataset.metrics); });
const ready = async () => { await page.locator(".garments-immersive").waitFor(); await page.waitForTimeout(350); await mode("reading"); };
const key = async direction => { await page.keyboard.press(direction === "forward" ? "ArrowRight" : "ArrowLeft"); await mode("reading"); };
const drag = async (direction, { start = .8, amount = .72, cancel = false, pointerType = "mouse", reverse = false, capture = "" } = {}) => {
  const box = await page.locator("canvas").boundingBox();
  const x = box.x + box.width * start, y = box.y + box.height * .73;
  const end = x + box.width * amount * (direction === "forward" ? -1 : 1);
  const send = async (type, px) => {
    if (pointerType === "mouse") {
      if (type === "pointerdown") { await page.mouse.move(px, y); await page.mouse.down(); }
      else if (type === "pointermove") await page.mouse.move(px, y, { steps: 8 });
      else if (type === "pointerup") await page.mouse.up();
      else await page.locator("canvas").dispatchEvent(type, { pointerId: 1, pointerType, clientX: px, clientY: y });
    } else await page.locator("canvas").evaluate((el, event) => el.dispatchEvent(new PointerEvent(event.type, { ...event, bubbles: true, button: 0, isPrimary: true })), { type, pointerId: 7, pointerType, clientX: px, clientY: y });
  };
  // Real mouse pointer capture is exercised; touch is covered separately through CDP below.
  await send("pointerdown", x);
  if (reverse) await send("pointermove", x - (end - x) * .15);
  if (capture) { await send("pointermove", x + (end - x) * .55); await mode("dragging"); await page.screenshot({ path: `${out}/${capture}.png` }); }
  await send("pointermove", end); await mode("dragging");
  const before = await position(); const current = await metrics();
  assert(current.deformationCount > 0);
  await send(cancel ? "pointercancel" : "pointerup", end);
  if (cancel && pointerType === "mouse") await page.mouse.up();
  await mode("reading"); return { before, after: await position(), current };
};
try {
  await page.goto(`${base}/garments`); await mode("browsing");
  await page.waitForFunction(() => document.querySelector("[data-mode]")?.dataset.coversLoaded === "6");
  const instance = await host().getAttribute("data-reader-instance");
  await page.getByRole("button", { name: "More editions on shelf 1", exact: true }).click();
  await page.waitForFunction(() => !!document.querySelector('[data-issue="polish-6"]'));
  await page.getByRole("button", { name: "More editions on shelf 1", exact: true }).waitFor({ state: "visible" });
  await page.waitForFunction(() => !document.querySelector('[aria-label="More editions on shelf 1"]').disabled);
  await page.screenshot({ path: `${out}/mobile-rail.png` });
  assert((await metrics()).coverTextures <= 15);
  const shelfBounds = await page.locator("canvas").boundingBox();
  const rowControls = await page.getByRole("navigation", { name: "Shelf 1", exact: true }).boundingBox();
  await page.mouse.move(shelfBounds.x + shelfBounds.width / 2, rowControls.y - 60);
  await page.mouse.wheel(-120, 0);
  await page.locator('[data-issue="polish-0"]').waitFor();
  await page.waitForTimeout(500);
  await page.mouse.wheel(120, 0);
  await page.locator('[data-issue="polish-6"]').waitFor();
  await page.waitForFunction(() => !document.querySelector('[aria-label="More editions on shelf 1"]').disabled);
  await page.locator('[data-issue="polish-6"]').click(); await ready();
  assert.equal(await position(), 24);
  assert.equal(await host().getAttribute("data-reader-instance"), instance);
  assert.equal(await page.locator(".garments-page button:visible").count(), 1);
  assert(await page.locator(".garments-reader-backdrop img").evaluate(img => img.complete && img.naturalWidth > 0));
  const screenshot = await page.screenshot({ path: `${out}/mobile-cover.png` });
  assert((await sharp(screenshot).stats()).channels[0].stdev > 20);
  assert.equal((await metrics()).zoom, 1);
  const deformations = (await metrics()).deformationCount;
  for (let index = 25; index <= 28; index++) {
    const result = await drag("forward", { start: .8, capture: index === 26 ? "mobile-curl-half" : "" });
    assert.equal(result.after, index);
  }
  assert((await metrics()).deformationCount > deformations);
  assert(page.url().endsWith("/garments/polish-7"));
  assert.equal(await host().getAttribute("data-reader-instance"), instance);
  await page.screenshot({ path: `${out}/mobile-next-cover.png` });
  for (let index = 27; index >= 24; index--) {
    assert.equal((await drag("backward", { start: .2 })).after, index);
  }
  assert.equal((await drag("forward", { start: .25, amount: .12, cancel: true })).after, 24);
  assert.equal((await drag("forward", { start: .25, reverse: true })).after, 25);
  // Double-tap does not zoom or turn.
  const box = await page.locator("canvas").boundingBox();
  await page.mouse.dblclick(box.x + box.width / 2, box.y + box.height / 2); await page.waitForTimeout(300);
  assert.equal((await metrics()).zoom, 1); assert.equal(await position(), 25);
  // Chromium touch input uses actual touch events and browser pointer capture.
  const cdp = await context.newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: box.x + 300, y: box.y + 400 }] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: box.x + 50, y: box.y + 400 }] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); await mode("reading");
  assert.equal(await position(), 26);
  // A two-finger pinch neither scales nor turns pages.
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 150, y: 350 }, { x: 230, y: 350 }] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 80, y: 350 }, { x: 300, y: 350 }] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  assert.equal((await metrics()).zoom, 1); assert.equal(await position(), 26);
  for (const [width, height] of [[430,932], [768,1024], [1024,900], [1440,1000], [1920,1080], [844,390]]) {
    await page.setViewportSize({ width, height }); await page.waitForTimeout(250); await mode("reading");
    assert.equal(await position(), 26);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    assert.equal(await page.locator(".garments-page button:visible").count(), 1);
    await page.screenshot({ path: `${out}/reader-${width}.png` });
    results.push({ width, height, position: await position() });
  }
  await page.getByRole("button", { name: "Close magazine", exact: true }).click(); await mode("browsing");
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(500);
  assert(await page.locator('[data-issue="polish-6"]').count());
  await page.locator('[data-issue="polish-6"]').click(); await ready();
  assert.equal(await position(), 24);
  await page.goBack(); await mode("browsing");
  await page.goto(`${base}/garments/polish-0`); await ready();
  assert.equal((await drag("backward", { start: .2 })).after, 0);
  assert.equal((await drag("forward", { start: .75, reverse: true })).after, 1);
  await page.goto(`${base}/garments/polish-23`); await ready();
  for (let i = 0; i < 3; i++) await key("forward");
  assert.equal(await position(), 95);
  assert.equal((await drag("forward")).after, 95);
  await key("backward"); assert.equal(await position(), 94);
  const measured = await metrics();
  assert.deepEqual(errors, []);
  let webkitStatus = "unavailable";
  try { const wk = await webkit.launch({ headless: true }); await wk.close(); webkitStatus = "launchable; interaction suite uses Chromium"; }
  catch (error) { webkitStatus = error.message.includes("dependencies") || error.message.includes("libraries") ? "unavailable: missing Linux host libraries" : "unavailable: browser launch failed"; }
  const reduced = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  await reduced.route("**/api/garments/issues", route => route.fulfill({ json: { logo: null, issues } }));
  const accessible = await reduced.newPage();
  await accessible.goto(`${base}/garments/polish-7`);
  await accessible.locator(".garments-fallback").waitFor();
  assert.equal(await accessible.locator("canvas").count(), 0);
  assert.equal(await accessible.locator(".garments-page button:visible").count(), 1);
  assert.equal(await accessible.locator("[data-chapter]").count(), 24);
  await reduced.close();
  await writeFile(`${out}/result.json`, JSON.stringify({ results, errors, measured, webkitStatus, physicalDevice: false, rails: true, noZoom: true, continuous: true, reducedMotion: true }, null, 2));
  console.log(`PASS reader, rails, touch, resize, boundaries, no zoom and clean controls. ${out}`);
} catch (error) { await page.screenshot({ path: `${out}/failure.png` }).catch(() => {}); console.error(errors); throw error; }
finally { await context.close(); await browser.close(); }
