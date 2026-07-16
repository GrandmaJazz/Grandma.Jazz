import { MetadataRoute } from 'next'

const baseUrl = 'https://www.grandmajazz.com'

interface BlogPost {
  slug: string
  isPublished: boolean
  updatedAt: string
  publishedAt: string
}

async function getBlogs(): Promise<BlogPost[]> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/blogs`, {
      next: { revalidate: 300 },
    })
    if (!res.ok) return []
    const data = await res.json()
    return data.success ? (data.blogs as BlogPost[]) : []
  } catch (error) {
    console.error('Sitemap: could not fetch blogs', error)
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/products`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/blogs`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ]

  const blogs = await getBlogs()

  const blogRoutes: MetadataRoute.Sitemap = blogs
    .filter((blog) => blog.isPublished && blog.slug)
    .map((blog) => ({
      url: `${baseUrl}/blogs/${blog.slug}`,
      lastModified: new Date(blog.updatedAt || blog.publishedAt),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }))

  return [...staticRoutes, ...blogRoutes]
}
