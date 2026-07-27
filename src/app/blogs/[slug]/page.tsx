// src/app/blogs/[slug]/page.tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { MusicProtectedRoute } from '@/components/MusicProtectedRoute';
import { getFileUrl } from '@/utils/fileHelper';
import { BlogViews } from '@/components/BlogViews';
import BlogArticle, { ResolvedImage } from '@/components/blog/BlogArticle';
import ShareButtons from '@/components/blog/ShareButtons';

export const revalidate = 300;

interface BlogImage {
  path: string;
  caption: string;
}

interface BlogPost {
  _id: string;
  title: string;
  content: string;
  excerpt: string;
  images: BlogImage[];
  slug: string;
  isPublished: boolean;
  publishedAt: string;
  updatedAt: string;
  author?: { name?: string };
  views: number;
  tags: string[];
}

const SITE_URL = 'https://www.grandmajazz.com';

const THEMES = [
  { key: 'cream', bg: '#e3dcd4', ink: '#0A0A0A' },
  { key: 'green', bg: '#31372b', ink: '#F5F1E6' },
  { key: 'brown', bg: '#7c4d33', ink: '#F5F1E6' },
  { key: 'gold',  bg: '#b88c41', ink: '#0A0A0A' },
] as const;

// Colour is taken from a post's position in publish order, oldest first.
// This is deliberate: the admin generates slugs from titles, so a fixed
// slug list could never stay correct. Chronological position cannot drift —
// publishing a new post never changes an older post's index.
const paletteIndexFor = (slug: string, all: { slug: string; publishedAt: string }[]) => {
  const ordered = [...all].sort(
    (a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime(),
  );
  const i = ordered.findIndex((b) => b.slug === slug);
  return (i === -1 ? 0 : i) % 4;
};

export function themeForSlug(slug: string, all: { slug: string; publishedAt: string }[]) {
  return THEMES[paletteIndexFor(slug, all)];
}

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

async function getBlogBySlug(slug: string): Promise<BlogPost | null> {
  const blogs = await getBlogs();
  return blogs.find((b) => b.slug === slug) ?? null;
}

export async function generateStaticParams() {
  const blogs = await getBlogs();
  return blogs.map((blog) => ({ slug: blog.slug }));
}

function buildDescription(blog: BlogPost): string {
  const raw = (blog.excerpt || blog.content || '').replace(/\s+/g, ' ').trim();
  return raw.length > 155 ? `${raw.slice(0, 152)}...` : raw;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const blog = await getBlogBySlug(slug);

  if (!blog) {
    return { title: 'Post not found' };
  }

  const description = buildDescription(blog);
  const image = blog.images?.[0]?.path
    ? getFileUrl(blog.images[0].path)
    : `${SITE_URL}/images/og-image.jpg`;

  return {
    title: blog.title,
    description,
    alternates: {
      canonical: `/blogs/${blog.slug}`,
    },
    openGraph: {
      title: blog.title,
      description,
      url: `${SITE_URL}/blogs/${blog.slug}/`,
      siteName: 'Grandma Jazz',
      type: 'article',
      publishedTime: blog.publishedAt,
      modifiedTime: blog.updatedAt,
      images: [{ url: image, alt: blog.title }],
    },
    twitter: {
      card: 'summary_large_image',
      site: '@grandma_jazz',
      title: blog.title,
      description,
      images: [image],
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const blog = await getBlogBySlug(slug);

  if (!blog || !blog.isPublished) {
    notFound();
  }

  const description = buildDescription(blog);
  const heroImage = blog.images?.[0]?.path ? getFileUrl(blog.images[0].path) : null;
  const publishedDate = new Date(blog.publishedAt).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: blog.title,
    description,
    image: heroImage ? [heroImage] : [`${SITE_URL}/images/og-image.jpg`],
    datePublished: blog.publishedAt,
    dateModified: blog.updatedAt || blog.publishedAt,
    author: {
      '@type': 'Organization',
      name: 'Grandma Jazz',
      url: SITE_URL,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Grandma Jazz',
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/icons/GrandmaJazz.webp`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/blogs/${blog.slug}/`,
    },
  };

  const articleImages: ResolvedImage[] = (blog.images ?? [])
    .filter((img) => img?.path)
    .map((img) => ({ src: getFileUrl(img.path), caption: img.caption }));

  const shareUrl = `${SITE_URL}/blogs/${blog.slug}/`;
  const theme = themeForSlug(blog.slug, await getBlogs());

  return (
    <MusicProtectedRoute>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      <div className="min-h-screen bg-[#0A0A0A] pt-24 pb-16 sm:pt-28">
        <article className="mx-auto max-w-3xl px-4 sm:px-6">
          <Link
            href="/blogs"
            className="mb-8 inline-flex items-center text-sm uppercase tracking-wider text-[#b88c41] transition-colors hover:text-[#F5F1E6]"
          >
            &larr; All journal entries
          </Link>

          <div
            className={`gj-theme gj-theme--${theme.key} overflow-hidden rounded-2xl border border-black/25 shadow-2xl`}
            style={{ backgroundColor: theme.bg }}
          >
            <header className="px-5 pt-6 sm:px-8 sm:pt-8">
              <h1 className="text-3xl font-bold leading-tight sm:text-5xl" style={{ color: theme.ink }}>
                {blog.title}
              </h1>
            </header>

            <div className="px-5 pb-8 sm:px-8 sm:pb-10">
              <div
                className="mb-6 flex flex-wrap items-center gap-4 border-b pb-4 text-xs sm:text-sm"
                style={{ color: theme.ink, borderColor: 'var(--gj-rule)', opacity: 0.85 }}
              >
                <time dateTime={blog.publishedAt}>{publishedDate}</time>
                <BlogViews slug={blog.slug} initialViews={blog.views} />
              </div>

              {blog.tags?.length > 0 && (
                <div className="mb-6 flex flex-wrap gap-2">
                  {blog.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border px-3 py-1 text-xs"
                      style={{ color: theme.ink, borderColor: 'var(--gj-rule)', background: 'rgba(128,128,128,0.12)' }}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              <BlogArticle content={blog.content} images={articleImages} />
              <ShareButtons url={shareUrl} title={blog.title} />

            </div>
          </div>

          <div className="mt-10 text-center">
            <Link
              href="/blogs"
              className="text-sm uppercase tracking-wider text-[#b88c41] transition-colors hover:text-[#F5F1E6]"
            >
              &larr; Back to the journal
            </Link>
          </div>
        </article>
      </div>
    </MusicProtectedRoute>
  );
}
