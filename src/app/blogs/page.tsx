// src/app/blogs/page.tsx
//
// Server-rendered. Every card link is in the HTML on first paint, so Google
// sees the whole journal without executing any JavaScript.
//
// Removed in this rebuild (all of it was reachable only from the old pop-up):
//   Swiper + 3 swiper stylesheets, BlogModal, ImageContainer,
//   useWindowDimensions, useAutoScroll and its constants, MODAL_STYLES.

import Link from 'next/link';
import { AnimatedSection } from '@/components/AnimatedSection';
import { MusicProtectedRoute } from '@/components/MusicProtectedRoute';
import { getFileUrl } from '@/utils/fileHelper';

export const revalidate = 300;

interface BlogPost {
  _id: string;
  title: string;
  excerpt: string;
  images: Array<{ path: string; caption: string }>;
  slug: string;
  isPublished: boolean;
  publishedAt: string;
}

// Same order as THEMES in [slug]/page.tsx — a post's card colour and its
// article background are derived from the slug, so they always agree and
// never shift when new posts are published.
const CARD_COLORS = ['#e3dcd4', '#31372b', '#7c4d33', '#b88c41'] as const;
const CARD_INK = ['#0A0A0A', '#F5F1E6', '#F5F1E6', '#0A0A0A'] as const;

// Publish order. Colours step cream -> green -> brown -> gold so no two
// neighbours ever match, and each post keeps its colour as new ones land.
const ORDER = [
  'why-grandma-jazz-exists-a-quiet-caf-built-on-care-community-and-inclusion',
  'garments-why-wearing-second-hand-clothing-still-makes-sense',
  'a-plastic-free-cannabis-caf-how-grandma-jazz-chose-reuse-over-convenience',
  'worlds-first-plastic-free-dispensary-high-times',
  'quiet-revolution-grandma-jazz-head-magazine',
  'visiting-grandma-jazz-kamala-phuket-guide',
  'how-to-choose-cannabis-first-time-guide',
  'skunk-magazine-grandma-jazz-legacy-continued',
  'sessions-with-grandma-live-music-phuket',
  'vegan-cafe-coffee-kamala-phuket',
  'how-to-run-a-plastic-free-dispensary',
];

// Anything not listed falls back to a stable hash, so a new post always
// gets a sensible colour even before it is added above.
const colorIndexForSlug = (slug: string) => {
  const known = ORDER.indexOf(slug);
  if (known !== -1) return known % 4;
  let hash = 0;
  for (let i = 0; i < slug.length; i++) hash = (hash * 31 + slug.charCodeAt(i)) >>> 0;
  return hash % 4;
};

const NOISE_TEXTURE_SVG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`;

const NOISE_STYLE = {
  backgroundImage: NOISE_TEXTURE_SVG,
  backgroundSize: '150px',
  backgroundRepeat: 'repeat' as const,
};



async function getBlogs(): Promise<BlogPost[]> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/blogs`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.success ? (data.blogs as BlogPost[]) : [];
  } catch (error) {
    console.error('Error fetching blogs:', error);
    return [];
  }
}

/* ---------------- presentational pieces (design unchanged) ---------------- */

const PlusIcon = ({ color, ink }: { color: string; ink: string }) => (
  <div
    className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 border-2 rounded-full flex items-center justify-center z-10 transition-transform duration-200 group-hover:scale-75"
    style={{ backgroundColor: color, borderColor: ink }}
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="sm:w-6 sm:h-6 lg:w-8 lg:h-8" style={{ color: ink }}>
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  </div>
);

const NoiseOverlay = () => (
  <div
    className="absolute inset-0 opacity-10 mix-blend-overlay pointer-events-none"
    style={NOISE_STYLE}
  />
);

const CardImage = ({ post, className }: { post: BlogPost; className: string }) => (
  <div className={className}>
    {post.images?.length > 0 ? (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={getFileUrl(post.images[0].path)}
        alt={post.images[0].caption || post.title}
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        loading="lazy"
        decoding="async"
      />
    ) : (
      <div className="w-full h-full bg-gradient-to-br from-[#F5F1E6]/20 to-[#b88c41]/20 flex items-center justify-center">
        <div className="text-[#0A0A0A]/60 text-4xl">📝</div>
      </div>
    )}
  </div>
);

const SmallCard = ({ post }: { post: BlogPost }) => {
  const i = colorIndexForSlug(post.slug);
  const color = CARD_COLORS[i];
  const ink = CARD_INK[i];

  return (
  <Link
    href={`/blogs/${post.slug}/`}
    className="block rounded-2xl shadow-lg overflow-hidden relative group"
    style={{ width: '325px', height: '475px', backgroundColor: color }}
  >
    <NoiseOverlay />
    <PlusIcon color={color} ink={ink} />

    <div>
      <CardImage post={post} className="relative overflow-hidden rounded-2xl m-4 h-[184px]" />
      <div className="px-6 pb-6 flex flex-col justify-start" style={{ height: '275px' }}>
        <h2 className="text-4xl font-bold" style={{ color: ink }}>{post.title}</h2>
      </div>
    </div>
  </Link>
  );
};

const LargeCard = ({ post }: { post: BlogPost }) => {
  const i = colorIndexForSlug(post.slug);
  const color = CARD_COLORS[i];
  const ink = CARD_INK[i];

  return (
  <Link
    href={`/blogs/${post.slug}/`}
    className="block rounded-2xl shadow-lg overflow-hidden relative group"
    style={{ width: '580px', height: '480px', backgroundColor: color }}
  >
    <NoiseOverlay />
    <PlusIcon color={color} ink={ink} />

    <div className="flex h-full">
      <CardImage post={post} className="relative overflow-hidden rounded-2xl m-4 w-[282px]" />
      <div className="py-8 pl-2 pr-8 flex flex-col justify-start" style={{ width: '290px' }}>
        <h2 className="text-4xl font-bold" style={{ color: ink }}>{post.title}</h2>
      </div>
    </div>
  </Link>
  );
};

/* ------------------------------- the page ------------------------------- */

export default async function BlogsPage() {
  const all = await getBlogs();
  const blogPosts = all.filter((b) => b.isPublished !== false);

  const pairs = Array.from({ length: Math.ceil(blogPosts.length / 2) }, (_, i) => ({
    first: blogPosts[i * 2],
    second: blogPosts[i * 2 + 1],
    index: i,
  }));

  return (
    <MusicProtectedRoute>
      <div className="min-h-screen pt-20 sm:pt-28 pb-16 bg-[#0A0A0A] relative overflow-hidden">
        {/* Ambient background elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-40 mix-blend-soft-light">
          <div className="absolute top-0 left-0 w-1/3 h-1/2 rounded-full bg-[#7c4d33]/10 blur-[150px] transform -translate-x-1/2"></div>
          <div className="absolute bottom-0 right-0 w-1/2 h-1/2 rounded-full bg-[#b88c41]/10 blur-[180px] transform translate-x-1/4"></div>
        </div>

        {/* Noise texture overlay */}
        <div
          className="absolute inset-0 opacity-20 mix-blend-overlay pointer-events-none"
          style={NOISE_STYLE}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <h1 className="sr-only">Grandma Jazz Journal — Cannabis, Coffee and Jazz in Kamala, Phuket</h1>

          {blogPosts.length === 0 ? (
            <AnimatedSection animation="fadeIn" className="text-center py-20">
              <div className="text-[#e3dcd4] text-lg sm:text-xl">There is currently no content to display.</div>
            </AnimatedSection>
          ) : (
            <div className="py-8 sm:py-12">

              {/* Mobile — single column (< 1024px) */}
              <div className="lg:hidden space-y-6 flex flex-col items-center">
                {blogPosts.map((post, index) => (
                  <AnimatedSection key={post._id} animation="fadeIn">
                    <SmallCard post={post} />
                  </AnimatedSection>
                ))}
              </div>

              {/* Medium desktop — staggered small cards (1024–1279px) */}
              <div className="hidden lg:block xl:hidden">
                <div className="flex flex-col items-center space-y-8">
                  {pairs.map(({ first, second, index }) => (
                    <AnimatedSection key={index} animation="fadeIn">
                      <div className="flex justify-center items-start w-full max-w-6xl" style={{ height: '555px', gap: '100px' }}>
                        <div style={{ alignSelf: 'flex-start' }}>
                          <SmallCard post={first} />
                        </div>
                        {second && (
                          <div style={{ alignSelf: 'flex-end' }}>
                            <SmallCard post={second} />
                          </div>
                        )}
                      </div>
                    </AnimatedSection>
                  ))}
                </div>
              </div>

              {/* Large desktop — mixed layout (>= 1280px) */}
              <div className="hidden xl:block">
                <div className="px-6 py-12 w-full flex flex-col items-center">
                  <div className="space-y-8">
                    {pairs.map(({ first, second, index }) => {
                      const evenGroup = index % 2 === 0;

                      return (
                        <AnimatedSection key={index} animation="fadeIn">
                          <div
                            className={`flex items-start ${evenGroup ? 'justify-end' : 'justify-start'}`}
                            style={{ width: '1095px', height: evenGroup ? '555px' : '635px', gap: '100px' }}
                          >
                            <div style={{ alignSelf: 'flex-end' }}>
                              {evenGroup ? (
                                <SmallCard post={first} />
                              ) : (
                                <LargeCard post={first} />
                              )}
                            </div>
                            {second &&
                              (evenGroup ? (
                                <LargeCard post={second} />
                              ) : (
                                <SmallCard post={second} />
                              ))}
                          </div>
                        </AnimatedSection>
                      );
                    })}
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </MusicProtectedRoute>
  );
}
