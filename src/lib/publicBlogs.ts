import { cache } from "react";

export interface PublicBlog {
  _id: string;
  title: string;
  content: string;
  excerpt: string;
  slug: string;
  images: { path: string; caption: string }[];
  isPublished: boolean;
  publishedAt: string;
  updatedAt: string;
  views: number;
  tags: string[];
  seo?: { metaDescription?: string };
}

// Follow the public API's pagination; never use an admin endpoint for the journal.
export async function fetchPublishedBlogs(
  fetcher: typeof fetch = fetch,
): Promise<PublicBlog[]> {
  const posts = new Map<string, PublicBlog>();
  let page = 1;
  while (true) {
    const response = await fetcher(
      `${process.env.NEXT_PUBLIC_API_URL}/api/blogs?limit=100&page=${page}`,
      { next: { revalidate: 300 } },
    );
    if (!response.ok)
      throw new Error(`Public journal unavailable (${response.status})`);
    const data = await response.json();
    if (!data.success || !Array.isArray(data.blogs))
      throw new Error("Invalid public journal response");
    for (const blog of data.blogs)
      if (blog.isPublished === true && blog.slug) posts.set(blog._id, blog);
    const pages = Number(data.totalPages);
    if (
      Number.isFinite(pages) && pages > 0
        ? page >= pages
        : data.blogs.length < 100
    )
      break;
    if (page >= 1000)
      throw new Error("Public journal pagination exceeded its safe bound");
    page++;
  }
  return [...posts.values()].sort(
    (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
  );
}
export const getPublishedBlogs = cache(() => fetchPublishedBlogs());
