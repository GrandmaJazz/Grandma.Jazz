import { timingSafeEqual } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import https from 'node:https';

type Post = { url: string; image: string; caption?: string; kind: 'photo' | 'reel'; pinned?: boolean };
type Observed = Omit<Post, 'image'> & { source: string };
type Manifest = { posts: Post[] };
const postPattern = /^https:\/\/www\.instagram\.com\/(?:[\w.]+\/)?(?:p|reel)\/([\w-]{5,64})\/$/;
const code = (url: string) => url.match(postPattern)?.[1];
export function authorized(header: string | null, secret: string | undefined) {
  if (!secret || !header) return false;
  const a = Buffer.from(header), b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

class SyncError extends Error {
  constructor(public category: string) { super(category); }
}

async function publisher(path: string, body?: object) {
  // The origin is fixed to the existing owned gallery. Request data can never
  // select another destination or forward this bearer to an arbitrary host.
  const response = await fetch(`https://185-111-159-228.sslip.io/instagram-sync-internal/${path}`, {
    method: body ? 'POST' : 'GET', redirect: 'error', cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
    headers: { Authorization: `Bearer ${process.env.INSTAGRAM_PUBLISHER_SECRET}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) throw new SyncError(response.status === 428 ? 'authentication_required' : response.status === 409 ? 'locked' : 'publisher_failed');
  return response.json();
}

export async function syncStatus() { return publisher('status'); }

function publicAddress(address: string) {
  // Only public IPv4 is used for image connections. The same verified IP is
  // pinned into the actual TLS request, closing DNS rebinding and IPv6 gaps.
  if (!/^\d+\.\d+\.\d+\.\d+$/.test(address)) return false;
  const [a,b] = address.split('.').map(Number);
  return !(a === 0 || a === 10 || a === 127 || a >= 224 || a === 169 && b === 254 || a === 172 && b >= 16 && b <= 31 || a === 192 && (b === 168 || b === 0) || a === 100 && b >= 64 && b <= 127 || a === 198 && (b === 18 || b === 19));
}

export async function downloadImage(source: string): Promise<{ data: Buffer; mime: string }> {
  const url = new URL(source);
  if (url.protocol !== 'https:' || url.username || url.password || url.port && url.port !== '443' || !/(?:^|\.)(?:cdninstagram\.com|fbcdn\.net)$/.test(url.hostname)) throw new SyncError('image_download');
  const addresses = await lookup(url.hostname, { all: true, family: 4 });
  if (!addresses.length || addresses.some(({ address }) => !publicAddress(address))) throw new SyncError('image_download');
  return new Promise((resolve, reject) => {
    const request = https.get(url, {
      family: 4,
      lookup: (_host, _options, cb) => cb(null, addresses[0].address, 4),
    }, response => {
      const mime = String(response.headers['content-type'] || '').split(';')[0];
      if (response.statusCode !== 200 || !['image/jpeg', 'image/png', 'image/webp'].includes(mime) || Number(response.headers['content-length'] || 0) > 4_000_000) {
        response.destroy(); reject(new SyncError('image_download')); return;
      }
      let size = 0; const chunks: Buffer[] = [];
      response.on('data', (chunk: Buffer) => {
        size += chunk.length;
        if (size > 4_000_000) { response.destroy(); reject(new SyncError('image_download')); }
        else chunks.push(chunk);
      });
      response.on('error', () => reject(new SyncError('image_download')));
      response.on('end', () => {
        const data = Buffer.concat(chunks);
        const signature = mime === 'image/jpeg' ? data.subarray(0,3).equals(Buffer.from([255,216,255])) : mime === 'image/png' ? data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) : data.subarray(0,4).toString() === 'RIFF' && data.subarray(8,12).toString() === 'WEBP';
        if (!signature || data.length < 32) reject(new SyncError('image_download'));
        else resolve({ data, mime });
      });
    });
    const timer = setTimeout(() => request.destroy(new SyncError('image_download')), 12_000);
    request.on('close', () => clearTimeout(timer));
    request.on('error', () => reject(new SyncError('image_download')));
  });
}

export async function runSync(probe = false) {
  if (!process.env.INSTAGRAM_PUBLISHER_SECRET) throw new SyncError('publisher_failed');
  const started = Date.now();
  const deadline = () => { if (Date.now() - started > 235_000) throw new SyncError('deadline'); };
  const { lease, manifest }: { lease: string; manifest: Manifest } = await publisher('lock', {});
  let browser: import('playwright-core').Browser | undefined;
  let failure: string | undefined;
  try {
    const session = probe ? undefined : await publisher('session', { lease });
    const chromium = (await import('@sparticuz/chromium')).default;
    const { chromium: playwright } = await import('playwright-core');
    browser = await playwright.launch({ args: chromium.args, executablePath: await chromium.executablePath(), headless: true, timeout: 30_000 });
    if (probe) {
      // A separate browser-only check proves Linux Chromium packaging without
      // attempting an unauthorized or logged-out Instagram scan.
      const page = await browser.newPage();
      await page.goto('https://www.grandmajazz.com/instagram/?embed=1', { timeout: 30_000, waitUntil: 'domcontentloaded' });
      await page.locator('[aria-label="Scrollable Instagram profile"]').waitFor({ timeout: 15_000 });
      return { browserLaunch: true, galleryLoaded: true, liveSync: false };
    }
    const context = await browser.newContext({ storageState: session.storageState, locale: 'en-US', viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    page.setDefaultTimeout(10_000);
    await page.route('**/*', route => {
      const u = new URL(route.request().url());
      const allowed = u.protocol === 'https:' && /(?:^|\.)(?:instagram\.com|cdninstagram\.com|fbcdn\.net)$/.test(u.hostname);
      return allowed && !['media', 'font'].includes(route.request().resourceType()) ? route.continue() : route.abort();
    });
    await page.goto('https://www.instagram.com/grandmajazzphuket/', { timeout: 35_000, waitUntil: 'domcontentloaded' });
    const known = new Map(manifest.posts.map(p => [code(p.url), p]));
    const observed = new Map<string, Observed>();
    let overlap = false;
    let previous: string[] = [];
    for (let section = 0; section < 45; section++) {
      deadline();
      if (/\/(?:accounts\/login|challenge|checkpoint|consent)\//.test(page.url())) throw new SyncError('access_restricted');
      if (await page.locator('input[name="username"]').isVisible()) throw new SyncError('authentication_required');
      if (await page.getByText(/confirm your age|restricted profile|verify your identity|suspended|try again later/i).first().isVisible()) throw new SyncError('access_restricted');
      try { await page.locator('main a[href*="/p/"], main a[href*="/reel/"]').first().waitFor({ timeout: 8000 }); }
      catch { throw new SyncError('empty_scan'); }
      const batch = await page.locator('main a[href*="/p/"], main a[href*="/reel/"]').evaluateAll(anchors => anchors.flatMap(a => {
        const image = a.querySelector('img');
        if (!image?.currentSrc || !image.complete || !image.naturalWidth) return [];
        return [{ url: (a as HTMLAnchorElement).href.split('?')[0], source: image.currentSrc, caption: image.alt || '', kind: (a as HTMLAnchorElement).href.includes('/reel/') ? 'reel' as const : 'photo' as const, pinned: !!a.querySelector('[aria-label*="Pinned"], [aria-label*="pinned"]') }];
      }));
      const current = batch.map(p => code(p.url)).filter((c): c is string => !!c);
      // Adjacent sections must share an explicit anchor. Missing virtualized
      // rows cannot silently become a successful newest-post check.
      if (previous.length && !current.some(c => previous.includes(c))) throw new SyncError('partial_scan');
      for (const p of batch) { const c = code(p.url); if (c) observed.set(c, p); }
      let run = 0;
      for (const [c,p] of observed) {
        if (p.pinned || known.get(c)?.pinned) continue;
        run = known.has(c) ? run + 1 : 0;
        if (run >= 3) overlap = true;
      }
      if (overlap) break;
      previous = current;
      await page.mouse.wheel(0, 500);
      await page.waitForTimeout(750);
    }
    if (!overlap) throw new SyncError('partial_scan');
    const collected = [...observed.entries()];
    const fresh = collected.filter(([c]) => !known.has(c));
    // Download an oldest-first bounded slice so each later run extends the
    // verified archive towards the newest post without dropping a backlog.
    const selected = new Set(fresh.slice(-24).map(([c]) => c));
    const refresh = new Set(collected.filter(([c]) => known.has(c)).slice(0, Math.min(6, 24 - selected.size)).map(([c]) => c));
    const posts: Post[] = [];
    for (const [c,p] of collected) {
      deadline();
      if (known.has(c) && !refresh.has(c)) { posts.push({ ...known.get(c)!, pinned: p.pinned || known.get(c)!.pinned }); continue; }
      if (!known.has(c) && !selected.has(c)) continue;
      const { data, mime } = await downloadImage(p.source);
      const { image } = await publisher('image', { lease, data: data.toString('base64'), mime });
      // An image must be public before a manifest may reference it.
      const check = await fetch(`https://www.grandmajazz.com/instagram/instagram-gallery/${image}`, { method: 'HEAD', cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10_000) });
      if (!check.ok) throw new SyncError('image_download');
      const { source: _source, ...post } = p;
      posts.push(known.has(c) ? { ...known.get(c)!, image, pinned: p.pinned || known.get(c)!.pinned } : { ...post, image });
    }
    const result = await publisher('commit', { lease, posts });
    return { ...result, remainingObservedBacklog: fresh.length - selected.size };
  } catch (error) {
    failure = error instanceof SyncError ? error.category : 'collector_failed';
    console.error('instagram_sync', { category: failure });
    throw new SyncError(failure);
  } finally {
    await browser?.close().catch(() => {});
    await publisher('release', { lease, failure }).catch(() => console.error('instagram_sync', { category: 'release_failed' }));
  }
}
