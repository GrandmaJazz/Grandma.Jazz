import { SITE_CHROME_CSS } from '../../../../../shared/site/chromeStyles';

export async function GET(_request: Request, { params }: { params: Promise<{ asset: string }> }) {
  const { asset } = await params;
  if (!/^[A-Za-z0-9_-]+\.css$/.test(asset)) return new Response('Not found', { status: 404 });
  const origin = process.env.EVENTS_PLATFORM_ORIGIN || 'https://185-111-159-228.sslip.io';
  // Keep the platform bundle intact; append the same scoped chrome styles as Next.
  const upstream = await fetch(new URL('/assets/' + asset, origin), { cache: 'no-store', signal: AbortSignal.timeout(10000) });
  if (!upstream.ok) return new Response('Styles unavailable', { status: upstream.status });
  return new Response(await upstream.text() + '\n' + SITE_CHROME_CSS, {
    headers: { 'Content-Type': 'text/css; charset=utf-8', 'Cache-Control': 'public, max-age=0, s-maxage=300', 'X-Content-Type-Options': 'nosniff' },
  });
}
