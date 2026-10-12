// Same-origin streaming lets public music enter Web Audio even when the
// existing S3 bucket does not supply Access-Control-Allow-Origin.
const S3_HOST = 'grandma-jazz-uploads.s3.ap-southeast-2.amazonaws.com';
const API_HOST = 'grandma-jazz-api.onrender.com';
const AUDIO_EXTENSION = /\.(mp3|m4a|aac|ogg|wav|flac|webm)$/i;

async function stream(request: Request) {
  const source = new URL(request.url).searchParams.get('src');
  let url: URL;
  try { url = new URL(source || ''); } catch { return new Response(null, { status: 400 }); }
  const allowed = (url.hostname === S3_HOST && /^\/(cards|music)\//.test(url.pathname)) ||
    (url.hostname === API_HOST && /^\/api\/files\/(cards|music)\//.test(url.pathname));
  if (!allowed || url.protocol !== 'https:' || url.port || url.username || url.password || !AUDIO_EXTENSION.test(url.pathname)) {
    return new Response(null, { status: 400 });
  }
  const headers = new Headers();
  for (const name of ['range', 'if-range', 'if-none-match', 'if-modified-since']) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  try {
    const upstream = await fetch(url, {
      method: request.method === 'HEAD' ? 'HEAD' : 'GET',
      headers,
      redirect: 'error',
      cache: 'no-store',
      signal: request.signal,
    });
    const responseHeaders = new Headers();
    for (const name of ['content-type', 'content-length', 'content-range', 'accept-ranges', 'etag', 'last-modified']) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    responseHeaders.set('Cache-Control', 'public, max-age=86400');
    responseHeaders.set('X-Content-Type-Options', 'nosniff');
    return new Response(request.method === 'HEAD' ? null : upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return new Response(null, { status: 502 });
  }
}

export const GET = stream;
export const HEAD = stream;
