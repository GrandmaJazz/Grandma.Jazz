import { MetadataRoute } from 'next'
import { upcomingOccurrences } from '@/lib/recurringEvents'
import { quizPath } from '@/lib/quizSeo'
import { getGarmentsEditions } from '@/lib/garmentsSeo'

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
      url: `${baseUrl}/shipping/`,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/garments/`,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/family/`,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
  ]

  const [blogs, products, garments, archivedGarments] = await Promise.all([
    getBlogs(), getProducts(),
    getGarmentsEditions().catch(error => { console.error('Sitemap: could not fetch Garments', error); return [] }),
    getGarmentsEditions(true).catch(error => { console.error('Sitemap: could not fetch Garments archive', error); return [] }),
  ])

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
  const editionRoutes: MetadataRoute.Sitemap = Array.from(new Map([...garments, ...archivedGarments].map(issue => [issue.slug, issue])).values()).map(issue => ({
    url: `${baseUrl}/garments/${issue.slug}/`,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))
  const archiveRoutes: MetadataRoute.Sitemap = archivedGarments.length ? [{ url: `${baseUrl}/garments/archive/`, changeFrequency: 'monthly', priority: 0.5 }] : []
  return [...staticRoutes, ...blogRoutes, ...quizRoutes, ...productRoutes, ...archiveRoutes, ...editionRoutes]
}

