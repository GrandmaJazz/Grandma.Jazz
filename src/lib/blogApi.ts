//src/lib/blogApi.ts
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
  seo?: {
    metaDescription?: string;
    metaKeywords?: string[];
  };
  createdAt: string;
  updatedAt: string;
}

interface BlogResponse {
  success: boolean;
  count?: number;
  total?: number;
  totalPages?: number;
  currentPage?: number;
  blogs?: BlogPost[];
  blog?: BlogPost;
  message?: string;
  stats?: {
    total: number;
    published: number;
    draft: number;
    totalViews: number;
    recentBlogs: BlogPost[];
  };
}

export class BlogAPI {
  private static getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  // Public Methods
  static async getPublicBlogs(params?: {
    page?: number;
    limit?: number;
    search?: string;
    tags?: string;
  }): Promise<BlogResponse> {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.tags) queryParams.append('tags', params.tags);

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/blogs?${queryParams}`
    );
    
    return await response.json();
  }

  static async getBlogBySlug(slug: string): Promise<BlogResponse> {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/blogs/${slug}`
    );
    
    return await response.json();
  }

  // Admin Methods
  static async getAllBlogs(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: 'published' | 'draft';
  }): Promise<BlogResponse> {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/blogs/admin/all?${queryParams}`,
      {
        headers: this.getAuthHeaders()
      }
    );
    
    return await response.json();
  }

  static async getBlogById(id: string): Promise<BlogResponse> {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/blogs/${id}`,
      {
        headers: this.getAuthHeaders()
      }
    );
    
    return await response.json();
  }

  static async createBlog(formData: FormData): Promise<BlogResponse> {
    const token = localStorage.getItem('token');
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/blogs`,
      {
        method: 'POST',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: formData
      }
    );
    
    return await response.json();
  }

  static async updateBlog(id: string, formData: FormData): Promise<BlogResponse> {
    const token = localStorage.getItem('token');
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/blogs/${id}`,
      {
        method: 'PUT',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: formData
      }
    );
    
    return await response.json();
  }

  static async deleteBlog(id: string): Promise<BlogResponse> {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/blogs/${id}`,
      {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      }
    );
    
    return await response.json();
  }

  static async togglePublishStatus(id: string, isPublished: boolean): Promise<BlogResponse> {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/blogs/${id}`,
      {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ isPublished })
      }
    );
    
    return await response.json();
  }

  static async deleteImageFromBlog(blogId: string, imageIndex: number): Promise<BlogResponse> {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/blogs/${blogId}/images/${imageIndex}`,
      {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      }
    );
    
    return await response.json();
  }

  static async getBlogStats(): Promise<BlogResponse> {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/blogs/admin/stats`,
      {
        headers: this.getAuthHeaders()
      }
    );
    
    return await response.json();
  }

  // Utility Methods
  static formatDate(dateString: string, locale: string = 'en-US'): string {
    const date = new Date(dateString);
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  static formatDateTime(dateString: string, locale: string = 'en-US'): string {
    const date = new Date(dateString);
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  static extractTextFromHtml(html: string, maxLength: number = 150): string {
    const text = html.replace(/<[^>]*>/g, '');
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }

  static generateSlug(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  static validateBlogData(data: Partial<BlogPost>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.title?.trim()) {
      errors.push('Title is required');
    } else if (data.title.length > 200) {
      errors.push('Title cannot exceed 200 characters');
    }

    if (!data.content?.trim()) {
      errors.push('Content is required');
    }

    if (data.excerpt && data.excerpt.length > 300) {
      errors.push('Excerpt cannot exceed 300 characters');
    }

    if (data.seo?.metaDescription && data.seo.metaDescription.length > 160) {
      errors.push('Meta description cannot exceed 160 characters');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export type { BlogPost, BlogResponse };