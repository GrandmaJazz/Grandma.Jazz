// src/app/blogs/[slug]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MusicProtectedRoute } from "@/components/MusicProtectedRoute";
import { getFileUrl } from "@/utils/fileHelper";
import { BlogViews } from "@/components/BlogViews";
import BlogArticle, { ResolvedImage } from "@/components/blog/BlogArticle";
import ShareButtons from "@/components/blog/ShareButtons";

export const revalidate = 300;

import {
  getPublishedBlogs,
  type PublicBlog as BlogPost,
} from "@/lib/publicBlogs";
import { articleLayout } from "@/lib/blogContent";
import { journalCategory, readingMinutes } from "@/lib/journalDesign";
import { JournalTitle } from "@/components/blog/JournalTitle";
import { JournalReturn } from "@/components/blog/JournalReturn";
import { JournalCard } from "@/components/blog/JournalCard";
import { BrandText } from "@/components/blog/BrandText";
const SITE_URL = "https://www.grandmajazz.com";
const getBlogs = getPublishedBlogs;
async function getBlogBySlug(slug: string) {
  return (await getBlogs()).find((b) => b.slug === slug) ?? null;
}

export async function generateStaticParams() {
  const blogs = await getBlogs();
  return blogs.map((blog) => ({ slug: blog.slug }));
}

function buildDescription(blog: BlogPost): string {
  const raw = (blog.seo?.metaDescription || blog.excerpt || blog.content || "")
    .replace(/\s+/g, " ")
    .trim();
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
    return { title: "Post not found" };
  }

  const description = buildDescription(blog);
  const image = blog.images?.[0]?.path
    ? getFileUrl(blog.images[0].path)
    : `${SITE_URL}/images/og-image.jpg`;

  return {
    title: blog.title,
    description,
    alternates: {
      canonical: `/blogs/${blog.slug}/`,
    },
    openGraph: {
      title: blog.title,
      description,
      url: `${SITE_URL}/blogs/${blog.slug}/`,
      siteName: "Grandma Jazz",
      type: "article",
      publishedTime: blog.publishedAt,
      modifiedTime: blog.updatedAt,
      images: [{ url: image, alt: blog.title }],
    },
    twitter: {
      card: "summary_large_image",
      site: "@grandma_jazz",
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
  const heroImage = blog.images?.[0]?.path
    ? getFileUrl(blog.images[0].path)
    : null;
  const publishedDate = new Date(blog.publishedAt).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: blog.title,
    description,
    image: heroImage ? [heroImage] : [`${SITE_URL}/images/og-image.jpg`],
    datePublished: blog.publishedAt,
    dateModified: blog.updatedAt || blog.publishedAt,
    author: {
      "@type": "Organization",
      name: "Grandma Jazz",
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: "Grandma Jazz",
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/icons/GrandmaJazz.webp`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${SITE_URL}/blogs/${blog.slug}/`,
    },
  };

  const articleImages: ResolvedImage[] = (blog.images ?? [])
    .filter((img) => img?.path)
    .map((img) => ({ src: getFileUrl(img.path), caption: img.caption }));

  const shareUrl = `${SITE_URL}/blogs/${blog.slug}/`;
  const layout = articleLayout(blog.content, articleImages.length);
  const category = journalCategory(blog);
  const related = (await getBlogs())
    .filter((b) => b.slug !== blog.slug)
    .sort(
      (a, b) =>
        Number(journalCategory(b) === category) -
        Number(journalCategory(a) === category),
    )
    .slice(0, 2);

  return (
    <MusicProtectedRoute>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleSchema).replace(/</g, "\\u003c"),
        }}
      />

      <div className="journal">
        <article className="wrap article view">
          <JournalReturn />
          <header>
            <div className="eyebrow">{category} / Grandma Jazz Journal</div>
            <div className="articlehead">
              <div>
                <h1>
                  <JournalTitle title={blog.title} slug={blog.slug} />
                </h1>
                <p className="dek">
                  <BrandText text={blog.excerpt} linked />
                </p>
              </div>
              <div className="articlemeta">
                <time dateTime={blog.publishedAt}>{publishedDate}</time>
                <span>{readingMinutes(blog.content)} min read</span>
                <span>By AC, Joy & Grandma</span>
                <BlogViews slug={blog.slug} initialViews={blog.views} />
              </div>
            </div>
          </header>
          {layout.hero && articleImages[0] && (
            <figure className="articlehero">
              <img
                src={articleImages[0].src}
                alt={articleImages[0].caption || blog.title}
                width={1536}
                height={2048}
                fetchPriority="high"
              />
              <figcaption>{articleImages[0].caption}</figcaption>
            </figure>
          )}
          <div className="storylayout">
            <aside className="storyaside">
              <div className="eyebrow">
                From our corner
                <br />
                of Kamala.
              </div>
              <p>Stories from the café and the people around it.</p>
              <JournalReturn />
            </aside>
            <div>
              <BlogArticle
                content={blog.content}
                images={articleImages}
                layoutBlocks={layout.blocks}
              />
              <ShareButtons url={shareUrl} title={blog.title} />
            </div>
          </div>
          {!!related.length && (
            <section className="related">
              <div className="eyebrow">Stay a little longer</div>
              <h2>One more, dear?</h2>
              <div className="grid">
                {related.map((b, i) => (
                  <JournalCard
                    key={b._id}
                    index={i}
                    post={{
                      _id: b._id,
                      title: b.title,
                      slug: b.slug,
                      excerpt: b.excerpt,
                      tags: b.tags || [],
                      minutes: readingMinutes(b.content),
                      images: (b.images || []).map((image) => ({
                        ...image,
                        path: getFileUrl(image.path),
                      })),
                    }}
                  />
                ))}
              </div>
              <div className="journal-return-bottom">
                <JournalReturn />
              </div>
            </section>
          )}
        </article>
      </div>
    </MusicProtectedRoute>
  );
}
