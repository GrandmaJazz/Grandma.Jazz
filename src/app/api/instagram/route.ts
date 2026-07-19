// src/app/api/instagram/route.ts
// Serves the live Instagram feed (via Behold) for the Contact section.
// Fetched server-side and cached so we stay well within Behold's free tier
// no matter how much traffic the site gets.

const FEED_ID = 'ouVgFDZCMDn3pIuVGCoa';
const FEED_URL = `https://feeds.behold.so/${FEED_ID}`;

// Refresh at most every 6 hours (Behold updates once a day on the free plan).
export const revalidate = 21600;

interface BeholdSize {
  mediaUrl?: string;
}

interface BeholdPost {
  id?: string;
  permalink?: string;
  mediaType?: string;
  mediaUrl?: string;
  prunedCaption?: string;
  caption?: string;
  sizes?: {
    small?: BeholdSize;
    medium?: BeholdSize;
    large?: BeholdSize;
    full?: BeholdSize;
  };
  colorPalette?: { dominant?: string };
}

export async function GET() {
  try {
    const res = await fetch(FEED_URL, {
      headers: { Referer: 'https://www.grandmajazz.com/' },
      next: { revalidate: 21600 },
    });

    if (!res.ok) {
      return Response.json({ username: '', profilePictureUrl: null, posts: [] });
    }

    const data = await res.json();
    const rawPosts: BeholdPost[] = Array.isArray(data?.posts) ? data.posts : [];

    const posts = rawPosts.map((p) => ({
      id: p.id ?? p.permalink ?? '',
      permalink: p.permalink ?? '',
      mediaType: p.mediaType ?? 'IMAGE',
      thumb: p.sizes?.small?.mediaUrl ?? p.sizes?.medium?.mediaUrl ?? p.mediaUrl ?? '',
      full: p.sizes?.large?.mediaUrl ?? p.sizes?.full?.mediaUrl ?? p.mediaUrl ?? '',
      caption: (p.prunedCaption ?? p.caption ?? '').trim(),
      color: p.colorPalette?.dominant ?? '10,10,10',
    }));

    return Response.json({
      username: data?.username ?? '',
      profilePictureUrl: data?.profilePictureUrl ?? null,
      posts,
    });
  } catch {
    return Response.json({ username: '', profilePictureUrl: null, posts: [] });
  }
}
