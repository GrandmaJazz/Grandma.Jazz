// Analysis-only copy, never the playback path. S3 does not allow browser CORS.
// Small bounded chunks avoid large serverless responses. A track ID must be
// present in our public catalogue; this is not an arbitrary URL proxy.
const CATALOG = 'https://grandma-jazz-api.onrender.com/api/cards';
const HOST = 'grandma-jazz-uploads.s3.ap-southeast-2.amazonaws.com';
const CHUNK = 1024 * 1024;
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const id = query.get('id');
  const part = Number(query.get('part') ?? 0);
  if (!id || !Number.isInteger(part) || part < 0 || part > 31) return new Response('Invalid track or chunk', { status: 400 });
  try {
    const catalogResponse = await fetch(CATALOG, { next: { revalidate: 300 }, signal: AbortSignal.timeout(15000) });
    if (!catalogResponse.ok) throw new Error('Catalogue unavailable');
    const catalog = await catalogResponse.json();
    const tracks = (catalog.cards ?? []).flatMap((card: { music?: { _id: string; filePath: string }[] }) => card.music ?? []);
    const track = tracks.find((item: { _id: string }) => item._id === id);
    if (!track) return new Response('Track not found', { status: 404 });
    const url = new URL(track.filePath);
    if (url.protocol !== 'https:' || url.hostname !== HOST || !url.pathname.endsWith('.mp3')) return new Response('Unsupported source', { status: 422 });
    const result = await fetch(url, { headers: { Range: `bytes=${part * CHUNK}-${(part + 1) * CHUNK - 1}` }, redirect: 'error', signal: AbortSignal.timeout(20000) });
    if (result.status !== 206) return new Response('Source does not support analysis chunks', { status: 502 });
    const total = Number(result.headers.get('content-range')?.split('/')[1]);
    if (!total || total > CHUNK * 32) return new Response('Track requires a precomputed beat map', { status: 413 });
    return new Response(result.body, { headers: { 'Content-Type': 'application/octet-stream', 'X-Total-Bytes': String(total), 'Cache-Control': 'public, max-age=86400, s-maxage=86400' } });
  } catch {
    return new Response('Analysis unavailable', { status: 502 });
  }
}
