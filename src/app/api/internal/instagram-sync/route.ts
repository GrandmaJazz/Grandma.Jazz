import { authorized, runSync, syncStatus } from '@/lib/instagramSync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request: Request) {
  const headers = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' };
  if (!authorized(request.headers.get('authorization'), process.env.CRON_SECRET)) {
    return Response.json({ error: 'unauthorized' }, { status: 401, headers });
  }
  try {
    const mode = new URL(request.url).searchParams.get('mode');
    const result = mode === 'status' ? await syncStatus() : await runSync(mode === 'probe');
    return Response.json(result, { headers });
  } catch (error) {
    const category = error instanceof Error ? error.message : 'collector_failed';
    return Response.json({ error: category }, { status: category === 'locked' ? 409 : category === 'authentication_required' ? 428 : 503, headers });
  }
}
