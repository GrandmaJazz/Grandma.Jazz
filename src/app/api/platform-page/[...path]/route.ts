// Preserve the platform response while versioning CSS links after chrome updates.
export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  if (!['events', 'garments'].includes(path[0]) || path.some(part => part === '.' || part === '..')) {
    return new Response('Not found', { status: 404 });
  }
  const origin = process.env.EVENTS_PLATFORM_ORIGIN || 'https://185-111-159-228.sslip.io';
  const incoming = new URL(request.url);
  const url = new URL('/' + path.map(encodeURIComponent).join('/'), origin);
  url.search = incoming.search;
  const headers = new Headers();
  const cookie = request.headers.get('cookie');
  if (cookie) headers.set('cookie', cookie);
  const upstream = await fetch(url, { headers, cache: 'no-store', redirect: 'manual', signal: AbortSignal.timeout(15000) });
  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete('content-length');
  responseHeaders.delete('content-encoding');
  responseHeaders.set('Cache-Control', 'private, no-store');
  const location = responseHeaders.get('location');
  if (location?.startsWith(origin)) responseHeaders.set('location', location.replace(origin, incoming.origin));
  if (!upstream.headers.get('content-type')?.includes('text/html')) {
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  }
  const html = (await upstream.text()).replace(/(href=["'])(\/assets\/[^"'?]+\.css)(["'])/g, '$1$2?chrome=20261009-2$3');
  return new Response(html, { status: upstream.status, headers: responseHeaders });
}
