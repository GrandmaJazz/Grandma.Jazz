//src/app/admin/blogs/[id]/page.tsx
'use client';

import { useEffect, useState, FormEvent, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AnimatedSection } from '@/components/AnimatedSection';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { useRouter, useParams } from 'next/navigation';

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

export default function BlogFormPage() {
  const { isAuthenticated, isAuthLoading, isAdmin } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isEditMode = id !== 'new';
  
  const [blog, setBlog] = useState<Partial<BlogPost>>({
    title: '',
    content: '',
    excerpt: '',
    tags: [],
    isPublished: false,
    images: [],
    seo: {
      metaDescription: '',
      metaKeywords: []
    }
  });
  
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [imageCaptions, setImageCaptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);

  // โหลดข้อมูลบล็อก (ถ้าเป็นโหมดแก้ไข)
  useEffect(() => {
    if (isEditMode) {
      const fetchBlog = async () => {
        try {
          const token = localStorage.getItem('token');
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/blogs/${id}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          const data = await res.json();
          
          if (data.success) {
            setBlog(data.blog);
            // ตั้งค่า previews สำหรับรูปภาพที่มีอยู่
            const previews = data.blog.images.map((img: any) => 
              `${process.env.NEXT_PUBLIC_API_URL}${img.path}`
            );
            const captions = data.blog.images.map((img: any) => img.caption || '');
            setImagePreviews(previews);
            setImageCaptions(captions);
          } else {
            toast.error('Unable to load blog data.');
            router.push('/admin/blogs');
          }
        } catch (error) {
          console.error('Error fetching blog:', error);
          toast.error('An error occurred while loading the blog data.');
          router.push('/admin/blogs');
        } finally {
          setLoading(false);
        }
      };
      
      fetchBlog();
    }
  }, [id, isEditMode, router]);

  // จัดการเมื่อเลือกรูปภาพ
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const newFiles: File[] = [];
    const newPreviews: string[] = [];
    const newCaptions: string[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // ตรวจสอบประเภทไฟล์
      if (!file.type.startsWith('image/')) {
        toast.error(`"${file.name}" It's not an image file.`);
        continue;
      }
      
      // ตรวจสอบขนาดไฟล์ (ไม่เกิน 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`"${file.name}" It is over 10MB in size.`);
        continue;
      }
      
      newFiles.push(file);
      newCaptions.push('');
      
      // สร้าง preview
      const reader = new FileReader();
      reader.onload = () => {
        newPreviews.push(reader.result as string);
        if (newPreviews.length === newFiles.length) {
          setImageFiles(prev => [...prev, ...newFiles]);
          setImagePreviews(prev => [...prev, ...newPreviews]);
          setImageCaptions(prev => [...prev, ...newCaptions]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // ลบรูปภาพ
  const removeImage = async (index: number) => {
    // ถ้าเป็นรูปภาพที่มีอยู่แล้ว (ในโหมดแก้ไข)
    if (isEditMode && index < (blog.images?.length || 0)) {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/blogs/${id}/images/${index}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        const data = await res.json();
        
        if (data.success) {
          setBlog(data.blog);
          const newPreviews = [...imagePreviews];
          const newCaptions = [...imageCaptions];
          newPreviews.splice(index, 1);
          newCaptions.splice(index, 1);
          setImagePreviews(newPreviews);
          setImageCaptions(newCaptions);
        } else {
          toast.error('Unable to delete image');
        }
      } catch (error) {
        console.error('Error removing image:', error);
        toast.error('There was an error deleting the image.');
      }
    } else {
      // ลบรูปภาพใหม่ที่ยังไม่ได้บันทึก
      const newFileIndex = index - (blog.images?.length || 0);
      const newFiles = [...imageFiles];
      const newPreviews = [...imagePreviews];
      const newCaptions = [...imageCaptions];
      
      newFiles.splice(newFileIndex, 1);
      newPreviews.splice(index, 1);
      newCaptions.splice(index, 1);
      
      setImageFiles(newFiles);
      setImagePreviews(newPreviews);
      setImageCaptions(newCaptions);
    }
  };

  // อัปเดต caption
  const updateCaption = (index: number, caption: string) => {
    const newCaptions = [...imageCaptions];
    newCaptions[index] = caption;
    setImageCaptions(newCaptions);
  };

  // จัดการ textarea auto-resize
  useEffect(() => {
    const textarea = contentTextareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    }
  }, [blog.content]);

  // จัดการเมื่อส่งฟอร์ม
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!blog.title || !blog.content) {
      toast.error('Please fill in the title and content.');
      return;
    }
    
    setSaving(true);
    
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      
      // เพิ่มข้อมูลพื้นฐาน
      formData.append('title', blog.title);
      formData.append('content', blog.content);
      formData.append('excerpt', blog.excerpt || '');
      formData.append('tags', blog.tags?.join(',') || '');
      formData.append('isPublished', String(blog.isPublished));
      
      // เพิ่มข้อมูล SEO
      if (blog.seo) {
        formData.append('seo[metaDescription]', blog.seo.metaDescription || '');
        formData.append('seo[metaKeywords]', blog.seo.metaKeywords?.join(',') || '');
      }
      
      // เพิ่มรูปภาพใหม่
      imageFiles.forEach((file, index) => {
        formData.append('images', file);
        const captionIndex = (blog.images?.length || 0) + index;
        formData.append(`imageCaption_${index}`, imageCaptions[captionIndex] || '');
      });
      
      const url = isEditMode 
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/blogs/${id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/blogs`;
      
      const method = isEditMode ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      const data = await res.json();
      
      if (data.success) {
        router.push('/admin/blogs');
      } else {
        toast.error(data.message || 'Unable to save blog');
      }
    } catch (error) {
      console.error('Error saving blog:', error);
      toast.error('An error occurred while saving the blog.');
    } finally {
      setSaving(false);
    }
  };

  // แสดง loading
  if (loading) {
    return (
      <div className="min-h-screen pt-28 pb-16 bg-[#0A0A0A] flex justify-center items-center">
        <div className="w-14 h-14 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      <AnimatedSection animation="fadeIn" className="mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-4xl md:text-5xl font-editorial-ultralight text-[#F5F1E6]">
            {isEditMode ? 'Edit' : 'Create'} <span className="text-[#D4AF37]">Blog</span>
          </h1>
          
          <Link 
            href="/admin/blogs" 
            className="bg-[#7c4d33]/80 hover:bg-[#7c4d33] text-[#F5F1E6] py-2.5 px-6 rounded-full transition-colors duration-300 shadow-lg shadow-[#7c4d33]/20 font-suisse-intl-mono uppercase tracking-wider text-sm"
          >
            Back to List
          </Link>
        </div>
        <div className="h-0.5 bg-gradient-to-r from-transparent via-[#7c4d33] to-transparent w-48 mt-4"></div>
      </AnimatedSection>
      
      <AnimatedSection animation="fadeIn">
        <div className="bg-[#0A0A0A] rounded-2xl border border-[#7c4d33]/30 overflow-hidden shadow-lg">
          <form onSubmit={handleSubmit}>
            <div className="p-6 border-b border-[#7c4d33]/30">
              <h2 className="text-[#F5F1E6] text-xl font-suisse-intl mb-1">Blog Details</h2>
              <p className="text-[#e3dcd4] text-sm">Fill in the information for your blog post</p>
            </div>
            
            <div className="p-6 space-y-8">
              {/* Title */}
              <div>
                <label className="block text-[#D4AF37] mb-2 font-suisse-intl-mono text-sm uppercase tracking-wider">
                  Title *
                </label>
                <input
                  type="text"
                  value={blog.title || ''}
                  onChange={(e) => setBlog({ ...blog, title: e.target.value })}
                  className="w-full bg-[#31372b] border border-[#7c4d33]/30 rounded-lg px-4 py-3 text-[#F5F1E6] placeholder-[#e3dcd4]/60 focus:border-[#D4AF37] focus:outline-none"
                  placeholder="Enter blog title"
                  required
                />
              </div>

              {/* Excerpt */}
              <div>
                <label className="block text-[#D4AF37] mb-2 font-suisse-intl-mono text-sm uppercase tracking-wider">
                  Excerpt
                </label>
                <textarea
                  value={blog.excerpt || ''}
                  onChange={(e) => setBlog({ ...blog, excerpt: e.target.value })}
                  rows={3}
                  className="w-full bg-[#31372b] border border-[#7c4d33]/30 rounded-lg px-4 py-3 text-[#F5F1E6] placeholder-[#e3dcd4]/60 focus:border-[#D4AF37] focus:outline-none resize-none"
                  placeholder="Brief description of the blog post (optional)"
                />
                <p className="text-[#e3dcd4]/60 text-sm mt-1">Max 300 characters. Leave empty to auto-generate.</p>
              </div>

              {/* Content */}
              <div>
                <label className="block text-[#D4AF37] mb-2 font-suisse-intl-mono text-sm uppercase tracking-wider">
                  Content *
                </label>
                <textarea
                  ref={contentTextareaRef}
                  value={blog.content || ''}
                  onChange={(e) => setBlog({ ...blog, content: e.target.value })}
                  className="w-full bg-[#31372b] border border-[#7c4d33]/30 rounded-lg px-4 py-3 text-[#F5F1E6] placeholder-[#e3dcd4]/60 focus:border-[#D4AF37] focus:outline-none resize-none overflow-hidden"
                  placeholder="Write your blog content here... You can use HTML tags."
                  style={{ minHeight: '200px' }}
                  required
                />
                <p className="text-[#e3dcd4]/60 text-sm mt-1">You can use HTML tags for formatting.</p>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-[#D4AF37] mb-2 font-suisse-intl-mono text-sm uppercase tracking-wider">
                  Tags
                </label>
                <input
                  type="text"
                  value={blog.tags?.join(', ') || ''}
                  onChange={(e) => setBlog({ 
                    ...blog, 
                    tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag) 
                  })}
                  className="w-full bg-[#31372b] border border-[#7c4d33]/30 rounded-lg px-4 py-3 text-[#F5F1E6] placeholder-[#e3dcd4]/60 focus:border-[#D4AF37] focus:outline-none"
                  placeholder="technology, design, development (separated by commas)"
                />
              </div>

              {/* Images */}
              <div>
                <label className="block text-[#D4AF37] mb-4 font-suisse-intl-mono text-sm uppercase tracking-wider">
                  Images
                </label>
                
                {/* Image Upload */}
                <div className="mb-6">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    ref={fileInputRef}
                    className="hidden"
                    multiple
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-[#7c4d33]/70 hover:bg-[#7c4d33] text-[#F5F1E6] py-2.5 px-6 rounded-full transition-colors duration-300 font-suisse-intl-mono uppercase tracking-wider text-sm"
                  >
                    Add Images
                  </button>
                  <p className="text-[#e3dcd4]/60 text-sm mt-2">JPG, PNG, GIF (max 10MB each)</p>
                </div>

                {/* Image Previews */}
                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <div className="relative h-48 rounded-lg overflow-hidden bg-[#31372b] border border-[#7c4d33]/30">
                          <img 
                            src={preview}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          
                          {/* Remove Button */}
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-2 right-2 w-8 h-8 bg-[#E67373]/80 hover:bg-[#E67373] rounded-full flex items-center justify-center transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                              <line x1="18" y1="6" x2="6" y2="18"></line>
                              <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                          </button>
                        </div>
                        
                        {/* Caption Input */}
                        <input
                          type="text"
                          value={imageCaptions[index] || ''}
                          onChange={(e) => updateCaption(index, e.target.value)}
                          placeholder="Image caption (optional)"
                          className="w-full mt-2 bg-[#31372b] border border-[#7c4d33]/30 rounded px-3 py-2 text-[#F5F1E6] placeholder-[#e3dcd4]/60 focus:border-[#D4AF37] focus:outline-none text-sm"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SEO Settings */}
              <div className="pt-6 border-t border-[#7c4d33]/30">
                <h3 className="text-[#F5F1E6] text-lg font-suisse-intl mb-4">SEO Settings</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-[#D4AF37] mb-2 font-suisse-intl-mono text-sm uppercase tracking-wider">
                      Meta Description
                    </label>
                    <textarea
                      value={blog.seo?.metaDescription || ''}
                      onChange={(e) => setBlog({ 
                        ...blog, 
                        seo: { 
                          metaDescription: e.target.value,
                          metaKeywords: blog.seo?.metaKeywords || []
                        } 
                      })}
                      rows={2}
                      className="w-full bg-[#31372b] border border-[#7c4d33]/30 rounded-lg px-4 py-3 text-[#F5F1E6] placeholder-[#e3dcd4]/60 focus:border-[#D4AF37] focus:outline-none resize-none"
                      placeholder="Brief description for search engines (max 160 characters)"
                      maxLength={160}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-[#D4AF37] mb-2 font-suisse-intl-mono text-sm uppercase tracking-wider">
                      Meta Keywords
                    </label>
                    <input
                      type="text"
                      value={blog.seo?.metaKeywords?.join(', ') || ''}
                      onChange={(e) => setBlog({ 
                        ...blog, 
                        seo: { 
                          metaDescription: blog.seo?.metaDescription || '',
                          metaKeywords: e.target.value.split(',').map(k => k.trim()).filter(k => k)
                        } 
                      })}
                      className="w-full bg-[#31372b] border border-[#7c4d33]/30 rounded-lg px-4 py-3 text-[#F5F1E6] placeholder-[#e3dcd4]/60 focus:border-[#D4AF37] focus:outline-none"
                      placeholder="keyword1, keyword2, keyword3"
                    />
                  </div>
                </div>
              </div>

              {/* Publish Status */}
              <div className="pt-6 border-t border-[#7c4d33]/30">
                <h3 className="text-[#F5F1E6] text-lg font-suisse-intl mb-4">Publish Settings</h3>
                
                <div className="flex items-center space-x-6">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="publishStatus"
                      checked={!blog.isPublished}
                      onChange={() => setBlog({ ...blog, isPublished: false })}
                      className="w-4 h-4 text-[#D4AF37] focus:ring-[#D4AF37]"
                    />
                    <span className="ml-2 text-[#e3dcd4]">Save as Draft</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="publishStatus"
                      checked={blog.isPublished}
                      onChange={() => setBlog({ ...blog, isPublished: true })}
                      className="w-4 h-4 text-[#D4AF37] focus:ring-[#D4AF37]"
                    />
                    <span className="ml-2 text-[#e3dcd4]">Publish Now</span>
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-6 border-t border-[#7c4d33]/30">
                <button
                  type="submit"
                  disabled={saving}
                  className={`px-8 py-3 rounded-full bg-[#D4AF37] text-[#0A0A0A] font-suisse-intl-mono uppercase tracking-wider transition-all duration-300 shadow-lg shadow-[#D4AF37]/20 ${
                    saving 
                      ? 'opacity-70 cursor-not-allowed' 
                      : 'hover:bg-[#b88c41] hover:shadow-xl hover:shadow-[#D4AF37]/30'
                  }`}
                >
                  {saving ? (
                    <span className="flex items-center">
                      <span className="w-4 h-4 border-2 border-[#0A0A0A] border-t-transparent rounded-full animate-spin mr-2"></span>
                      Saving...
                    </span>
                  ) : (
                    isEditMode ? 'Update Blog' : 'Create Blog'
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </AnimatedSection>
    </div>
  );
}