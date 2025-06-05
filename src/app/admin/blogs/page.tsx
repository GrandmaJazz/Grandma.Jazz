//src/app/admin/blogs/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AnimatedSection } from '@/components/AnimatedSection';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

interface BlogPost {
  _id: string;
  title: string;
  content: string;
  excerpt: string;
  images: Array<{
    path: string;
    caption: string;
  }>;
  slug: string;
  isPublished: boolean;
  publishedAt: string;
  author: {
    _id: string;
    name: string;
    email: string;
  };
  views: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export default function AdminBlogsPage() {
  const { isAuthenticated, isAuthLoading, isAdmin } = useAuth();

  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // โหลดข้อมูลบล็อกทั้งหมด
  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const token = localStorage.getItem('token');
        const queryParams = new URLSearchParams();

        if (filter !== 'all') {
          queryParams.append('status', filter);
        }

        if (searchTerm) {
          queryParams.append('search', searchTerm);
        }

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/blogs/admin/all?${queryParams}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );

        const data = await res.json();

        if (data.success) {
          setBlogs(data.blogs);
        } else {
          setError(data.message || 'Unable to load blog data.');
          toast.error(data.message || 'Unable to load blog data.');
        }
      } catch (error) {
        console.error('Error fetching blogs:', error);
        setError('An error occurred while loading the blog data.');
        toast.error('An error occurred while loading the blog data.');
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated && isAdmin) {
      fetchBlogs();
    }
  }, [isAuthenticated, isAdmin, filter, searchTerm]);

  // ลบบล็อก
  const handleDeleteBlog = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete the blog? "${title}"?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/blogs/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();

      if (data.success) {
        setBlogs(blogs.filter(blog => blog._id !== id));
      } else {
        toast.error(data.message || 'Unable to delete blog');
      }
    } catch (error) {
      console.error('Error deleting blog:', error);
      toast.error('An error occurred while deleting the blog.');
    }
  };

  // เปลี่ยนสถานะการเผยแพร่
  const handleTogglePublish = async (id: string, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/blogs/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          isPublished: !currentStatus,
          // ส่งข้อมูลอื่นที่จำเป็น
          title: blogs.find(b => b._id === id)?.title,
          content: blogs.find(b => b._id === id)?.content
        })
      });

      const data = await res.json();

      if (data.success) {
        const statusText = !currentStatus ? 'Published' : 'Unpublished';
        toast.success(`${statusText} blog successfully`);
        setBlogs(blogs.map(blog =>
          blog._id === id ? { ...blog, isPublished: !currentStatus } : blog
        ));
      } else {
        toast.error(data.message || 'Unable to update status');
      }
    } catch (error) {
      console.error('Error updating blog status:', error);
      toast.error('There was an error updating the status.');
    }
  };

  // แปลงวันที่
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // แสดง loading
  if (loading) {
    return (
      <div className="min-h-screen pt-28 pb-16 bg-[#0A0A0A] flex justify-center items-center relative overflow-hidden">
        <div className="w-14 h-14 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      <AnimatedSection animation="fadeIn">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <h1 className="text-4xl md:text-5xl font-editorial-ultralight text-[#F5F1E6]">
            Manage <span className="text-[#D4AF37]">Blogs</span>
          </h1>

          <Link
            href="/admin/blogs/new"
            className="bg-[#D4AF37] hover:bg-[#b88c41] text-[#0A0A0A] py-2.5 px-5 rounded-full transition-colors duration-300 font-suisse-intl-mono text-sm uppercase tracking-wider"
          >
            Add New Blog
          </Link>
        </div>

        <div className="h-0.5 bg-gradient-to-r from-transparent via-[#7c4d33] to-transparent w-48 mb-8"></div>
      </AnimatedSection>

      {/* Filters */}
      <AnimatedSection animation="fadeIn" className="mb-8">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {/* Status Filter */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-full text-sm font-suisse-intl-mono transition-colors ${filter === 'all'
                  ? 'bg-[#D4AF37] text-[#0A0A0A]'
                  : 'bg-[#31372b] text-[#e3dcd4] hover:bg-[#7c4d33]'
                }`}
            >
              All ({blogs.length})
            </button>
            <button
              onClick={() => setFilter('published')}
              className={`px-4 py-2 rounded-full text-sm font-suisse-intl-mono transition-colors ${filter === 'published'
                  ? 'bg-[#D4AF37] text-[#0A0A0A]'
                  : 'bg-[#31372b] text-[#e3dcd4] hover:bg-[#7c4d33]'
                }`}
            >
              Published ({blogs.filter(b => b.isPublished).length})
            </button>
            <button
              onClick={() => setFilter('draft')}
              className={`px-4 py-2 rounded-full text-sm font-suisse-intl-mono transition-colors ${filter === 'draft'
                  ? 'bg-[#D4AF37] text-[#0A0A0A]'
                  : 'bg-[#31372b] text-[#e3dcd4] hover:bg-[#7c4d33]'
                }`}
            >
              Draft ({blogs.filter(b => !b.isPublished).length})
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search blogs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#31372b] border border-[#7c4d33]/30 rounded-full px-4 py-2 text-[#F5F1E6] placeholder-[#e3dcd4]/60 focus:border-[#D4AF37] focus:outline-none w-64"
            />
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#e3dcd4]/60">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="M21 21l-4.35-4.35"></path>
            </svg>
          </div>
        </div>
      </AnimatedSection>

      {/* Blogs Table */}
      <AnimatedSection animation="fadeIn">
        <div className="bg-[#0A0A0A] rounded-xl border border-[#7c4d33]/40 overflow-hidden shadow-lg">
          <div className="p-6 border-b border-[#7c4d33]/30">
            <h2 className="text-[#F5F1E6] text-xl font-suisse-intl">
              All Blogs {filter !== 'all' && `(${filter})`}
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs font-suisse-intl-mono uppercase text-[#e3dcd4] bg-[#0A0A0A]">
                <tr>
                  <th className="px-6 py-3 border-b border-[#7c4d33]/30">Image</th>
                  <th className="px-6 py-3 border-b border-[#7c4d33]/30">Title</th>
                  <th className="px-6 py-3 border-b border-[#7c4d33]/30">Status</th>
                  <th className="px-6 py-3 border-b border-[#7c4d33]/30">Views</th>
                  <th className="px-6 py-3 border-b border-[#7c4d33]/30">Created</th>
                  <th className="px-6 py-3 border-b border-[#7c4d33]/30">Actions</th>
                </tr>
              </thead>
              <tbody>
                {blogs.length === 0 ? (
                  <tr className="border-b border-[#7c4d33]/30">
                    <td colSpan={6} className="px-6 py-4 text-center text-[#e3dcd4]">
                      {filter === 'all' ? 'No blogs found' : `No ${filter} blogs found`}
                    </td>
                  </tr>
                ) : (
                  blogs.map((blog) => (
                    <tr key={blog._id} className="border-b border-[#7c4d33]/30 hover:bg-[#7c4d33]/10 transition-colors duration-300">
                      <td className="px-6 py-4">
                        <div className="w-16 h-16 rounded-lg overflow-hidden border border-[#7c4d33]/30">
                          {blog.images.length > 0 ? (
                            <img
                              src={`${process.env.NEXT_PUBLIC_API_URL}${blog.images[0].path}`}
                              alt="Blog image"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-[#31372b] flex items-center justify-center">
                              <span className="text-[#e3dcd4]/60 text-2xl">📝</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="max-w-xs">
                          <h3 className="text-[#F5F1E6] font-suisse-intl truncate">{blog.title}</h3>
                          {blog.excerpt && (
                            <p className="text-[#e3dcd4]/80 text-sm mt-1 line-clamp-2">{blog.excerpt}</p>
                          )}
                          {blog.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {blog.tags.slice(0, 3).map((tag, index) => (
                                <span
                                  key={index}
                                  className="px-2 py-1 text-xs bg-[#7c4d33]/20 text-[#D4AF37] rounded-full"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleTogglePublish(blog._id, blog.isPublished)}
                          className={`px-3 py-1 rounded-full text-xs font-suisse-intl-mono uppercase ${blog.isPublished
                              ? 'bg-[#7EB47E]/20 text-[#7EB47E]'
                              : 'bg-[#E6B05E]/20 text-[#E6B05E]'
                            }`}
                        >
                          {blog.isPublished ? 'Published' : 'Draft'}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-[#e3dcd4] font-suisse-intl-mono">
                        {blog.views.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-[#e3dcd4] font-suisse-intl">
                        {formatDate(blog.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-3">
                          <Link
                            href={`/admin/blogs/${blog._id}`}
                            className="px-3 py-1 text-xs font-suisse-intl-mono uppercase text-[#D4AF37] hover:text-[#b88c41] border border-[#D4AF37] hover:border-[#b88c41] rounded-full transition-colors duration-300"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => handleDeleteBlog(blog._id, blog.title)}
                            className="px-3 py-1 text-xs font-suisse-intl-mono uppercase text-[#E67373] hover:text-[#b35151] border border-[#E67373] hover:border-[#b35151] rounded-full transition-colors duration-300"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </AnimatedSection>
    </div>
  );
}