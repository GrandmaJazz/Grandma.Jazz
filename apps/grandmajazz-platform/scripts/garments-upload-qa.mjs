import { chromium } from "/root/hermes-agent/node_modules/playwright/index.mjs";
import { createCanvas } from "canvas";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";

const evidence = "/tmp/grandmajazz-upload-qa";
await mkdir(evidence, { recursive: true });
const browser = await chromium.launch({ executablePath: "/root/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell", args: ["--no-sandbox"] });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, recordVideo: { dir: evidence, size: { width: 1280, height: 900 } } });
const page = await context.newPage();
const errors = []; page.on("pageerror", error => errors.push(error.message));
try {
  await page.goto("http://127.0.0.1:3024/garments/manage");
  await page.getByLabel("Admin key", { exact: true }).fill("local-browser-qa-only");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByLabel("Issue title", { exact: true }).fill("Upload QA - development specimen");
  await page.getByLabel("Issue number", { exact: true }).fill("QA");
  const canvas = createCanvas(600, 800, "pdf"); const ctx = canvas.getContext("2d");
  for (let i = 0; i < 6; i++) {
    if (i) ctx.addPage();
    ctx.fillStyle = ["#fa754a", "#dcefe6", "#eee4d1", "#b9d4da", "#fafafa", "#e3d3df"][i]; ctx.fillRect(0, 0, 600, 800);
    ctx.fillStyle = "#181818"; ctx.font = "40px sans-serif"; ctx.fillText("DEVELOPMENT", 45, 100); ctx.fillText("UPLOAD TEST", 45, 160);
    ctx.font = "200px sans-serif"; ctx.fillText(String(i + 1), 210, 470);
    ctx.font = "24px sans-serif"; ctx.fillText("Not a published Garments issue", 45, 730);
  }
  await page.getByLabel("Choose magazine files").setInputFiles({ name: "development-specimen.pdf", mimeType: "application/pdf", buffer: canvas.toBuffer("application/pdf") });
  await page.getByText("Pages ready", { exact: true }).waitFor({ timeout: 120000 });
  assert.equal(await page.locator(".garments-upload-pages li").count(), 6);
  await page.getByLabel("Blank back cover").uncheck();
  await page.getByRole("button", { name: "Move page 2 later", exact: true }).click();
  await page.getByRole("button", { name: "Move page 3 earlier", exact: true }).click();
  await page.screenshot({ path: `${evidence}/desktop-uploader.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: `${evidence}/mobile-uploader.png`, fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "Save and publish", exact: true }).click();
  await page.waitForURL(/\/garments\/upload-qa/);
  const host = page.locator("[data-mode]");
  await page.waitForFunction(() => document.querySelector("[data-mode]")?.dataset.mode === "reading", { timeout: 60000 });
  await page.screenshot({ path: `${evidence}/uploaded-reader.png` });
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${evidence}/turned-upload.png` });
  await page.getByRole("button", { name: "Previous page", exact: true }).click();
  await page.waitForTimeout(1800);
  await page.getByRole("button", { name: "Return to newsstand", exact: true }).click();
  await page.waitForFunction(() => document.querySelector("[data-mode]")?.dataset.mode === "browsing");
  await page.screenshot({ path: `${evidence}/uploaded-rack.png` });
  await page.reload();
  await page.getByRole("button", { name: /Issue QA/ }).waitFor();
  assert.equal(await page.getByText("Development preview · Test pages, not a published issue.").count(), 0);
  assert.deepEqual(errors, []);
  await writeFile(`${evidence}/result.json`, JSON.stringify({ passed: true, environment: "Chromium desktop and mobile viewport emulation, software WebGL", errors }, null, 2));
  console.log("Upload -> PDF conversion -> ordered pages -> publication -> real 3D reader -> turn -> return -> persistence: PASS");
} finally { await context.close(); await browser.close(); }
