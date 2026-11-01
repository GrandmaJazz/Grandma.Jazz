// Run locally as the owner. This creates an isolated context, never reads the
// everyday Chrome profile, and exports only Instagram worker authentication.
import { chromium } from 'playwright-core';
import { mkdir, writeFile, chmod } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline/promises';

const dir = join(homedir(), '.codex/private/grandmajazz-instagram-sync');
await mkdir(dir, { recursive: true, mode: 0o700 });
await chmod(dir, 0o700);
const browser = await chromium.launch({ channel: 'chrome', headless: false });
try {
  const context = await browser.newContext({ locale: 'en-US' });
  const page = await context.newPage();
  await page.goto('https://www.instagram.com/accounts/login/');
  const input = createInterface({ input: process.stdin, output: process.stdout });
  await input.question('Sign in with the dedicated, age-eligible worker account. Open grandmajazzphuket and confirm its grid loads, then press Enter here. ');
  input.close();
  if (!page.url().startsWith('https://www.instagram.com/grandmajazzphuket/')) throw new Error('Open the permitted profile before exporting.');
  if (!await page.locator('main a[href*="/p/"], main a[href*="/reel/"]').count()) throw new Error('Profile access not verified; no session exported.');
  const state = await context.storageState();
  const cookies = state.cookies.filter(c => /(?:^|\.)instagram\.com$/.test(c.domain.replace(/^\./,'')));
  if (!cookies.some(c => c.name === 'sessionid')) throw new Error('No signed-in worker session; nothing exported.');
  const session = { cookies, origins: state.origins.filter(o => o.origin === 'https://www.instagram.com') };
  const file = join(dir,'worker-session.json');
  await writeFile(file, JSON.stringify(session), { mode:0o600 });
  await chmod(file,0o600);
  console.log('Worker session saved privately. No credentials were printed. Transfer using the deployment runbook.');
} finally { await browser.close(); }
