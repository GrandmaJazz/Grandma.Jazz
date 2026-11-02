import { MusicProtectedRoute } from "@/components/MusicProtectedRoute";
import JournalIndex from "@/components/blog/JournalIndex";
import { getPublishedBlogs } from "@/lib/publicBlogs";
import { readingMinutes } from "@/lib/journalDesign";
import { getFileUrl } from "@/utils/fileHelper";
export const revalidate = 300;
export default async function BlogsPage() {
  const blogs = await getPublishedBlogs();
  const posts = blogs.map((b) => ({
    _id: b._id,
    title: b.title,
    slug: b.slug,
    excerpt: b.excerpt,
    tags: b.tags || [],
    minutes: readingMinutes(b.content),
    images: (b.images || []).map((i) => ({ ...i, path: getFileUrl(i.path) })),
  }));
  return (
    <MusicProtectedRoute>
      <div className="journal">
        <JournalIndex posts={posts} />
      </div>
    </MusicProtectedRoute>
  );
}
