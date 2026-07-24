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

          <div className="overflow-hidden rounded-2xl border border-[#0A0A0A]/30 bg-[#e3dcd4] shadow-2xl">
            <header className="px-5 pt-6 sm:px-8 sm:pt-8">
              <h1 className="text-3xl font-bold leading-tight text-[#0A0A0A] sm:text-5xl">
                {blog.title}
              </h1>
            </header>

            <div className="px-5 pb-8 sm:px-8 sm:pb-10">
              <div className="mb-6 flex flex-wrap items-center gap-4 border-b border-[#0A0A0A]/20 pb-4 text-xs text-[#0A0A0A] sm:text-sm">
                <time dateTime={blog.publishedAt}>{publishedDate}</time>
                {blog.author?.name && <span>{blog.author.name}</span>}
                <BlogViews slug={blog.slug} initialViews={blog.views} />
              </div>

              {blog.tags?.length > 0 && (
                <div className="mb-6 flex flex-wrap gap-2">
                  {blog.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-[#0A0A0A]/20 bg-[#0A0A0A]/10 px-3 py-1 text-xs text-[#0A0A0A]"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              <div
                style={{
                  ['--gj-ink' as string]: '#0A0A0A',
                  ['--gj-paper' as string]: '#e3dcd4',
                  ['--gj-accent' as string]: '#7c4d33',
                  ['--gj-rule' as string]: 'rgba(10,10,10,0.16)',
                }}
              >
                <BlogArticle content={blog.content} images={articleImages} />
                <ShareButtons url={shareUrl} title={blog.title} />
              </div>

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
