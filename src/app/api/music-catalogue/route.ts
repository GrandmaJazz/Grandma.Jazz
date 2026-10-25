// Public album data only. A shared short cache avoids making each new phone
// visit wait for the shop API; no session headers or cookies are forwarded.
export async function GET() {
  try {
    const origin = process.env.NEXT_PUBLIC_API_URL || 'https://grandma-jazz-api.onrender.com';
    const response = await fetch(`${origin}/api/cards`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) throw new Error('Catalogue unavailable');
    const data = await response.json();
    if (data.success === false || !Array.isArray(data.cards)) throw new Error('Invalid catalogue');
    return Response.json({ success: true, cards: data.cards }, {
      headers: { 'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300' },
    });
  } catch {
    return Response.json({ success: false, cards: [] }, {
      status: 503, headers: { 'Cache-Control': 'no-store' },
    });
  }
}
