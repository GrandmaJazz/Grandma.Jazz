import { MetadataRoute } from 'next'
import { upcomingOccurrences } from '@/lib/recurringEvents'
import { quizPath } from '@/lib/quizSeo'

export const dynamic = 'force-dynamic'

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

async function getProducts(): Promise<{ _id: string }[]> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products`, { next: { revalidate: 300 } })
    if (!res.ok) return []
    const data = await res.json()
    return data.products ?? []
  } catch { return [] }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/products/`,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/blogs/`,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/events/`,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/visit/`,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/family/`,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
  ]

  const [blogs, products] = await Promise.all([getBlogs(), getProducts()])

  const blogRoutes: MetadataRoute.Sitemap = blogs
    .filter((blog) => blog.isPublished && blog.slug)
    .map((blog) => ({
      url: `${baseUrl}/blogs/${blog.slug}/`,
      lastModified: new Date(blog.updatedAt || blog.publishedAt),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }))

  const quizRoutes = upcomingOccurrences(4).map(quiz => ({
    url: `${baseUrl}${quizPath(quiz)}`,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))
  const productRoutes = products.filter(product => /^[a-f0-9]{24}$/i.test(product._id)).map(product => ({
    url: `${baseUrl}/products/${product._id}/`,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))
  return [...staticRoutes, ...blogRoutes, ...quizRoutes, ...productRoutes]
}

