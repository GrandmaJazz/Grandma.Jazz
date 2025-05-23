'use client';

import { useEffect, useState } from 'react';
import { AnimatedSection } from '@/components/AnimatedSection';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

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

const CARD_COLORS = ['#e3dcd4', '#31372b', '#7c4d33', '#b88c41'];

// BlogModal Component
interface BlogModalProps {
  blog: BlogPost;
  color: string;
  onClose: () => void;
}

const BlogModal: React.FC<BlogModalProps> = ({ blog, color, onClose }) => {
  // ปิด modal เมื่อกด ESC
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  // แปลงวันที่
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // แปลง content ที่มี HTML tags
  const createMarkup = (content: string) => {
    // ตรวจสอบว่าเป็น HTML หรือ plain text
    const hasHTMLTags = /<[^>]*>/g.test(content);
    
    if (!hasHTMLTags) {
      // ถ้าเป็น plain text ให้แปลง line breaks เป็น <br>
      const formattedContent = content
        .split('\n')
        .map(line => line.trim() === '' ? '<br>' : line)
        .join('<br>');
      return { __html: formattedContent };
    }
    
    // ถ้าเป็น HTML ใช้ตามเดิม
    return { __html: content };
  };

  // Debug log
  console.log('Blog data in modal:', {
    id: blog._id,
    title: blog.title,
    hasContent: !!blog.content,
    contentLength: blog.content?.length || 0,
    contentPreview: blog.content?.substring(0, 100)
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-sm overflow-y-auto">
      {/* Blog Detail Card - ความสูงตามเนื้อหา */}
      <div 
        className="relative w-full max-w-2xl my-8 rounded-2xl shadow-2xl overflow-hidden border border-[#0A0A0A]/30"
        style={{ backgroundColor: color }}
      >
        {/* Noise texture overlay */}
        <div 
          className="absolute inset-0 opacity-10 mix-blend-overlay pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            backgroundSize: '150px',
            backgroundRepeat: 'repeat'
          }}
        />

        {/* Close Button (X) */}
        <div className="absolute top-4 right-4 w-12 h-12 border-2 border-[#0A0A0A] rounded-full flex items-center justify-center z-20 cursor-pointer" 
             style={{ backgroundColor: color }} 
             onClick={onClose}>
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="text-[#0A0A0A] transition-transform duration-200 hover:scale-75">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </div>

        {/* Content Container */}
        <div className="relative z-10">
          {/* Title */}
          <div className="p-6 pb-4">
            <h1 className="text-3xl md:text-4xl font-bold text-[#0A0A0A] leading-tight pr-16">
              {blog.title}
            </h1>
          </div>

          {/* Header Image(s) */}
          {blog.images.length > 0 && (
            <div className="relative h-[600px] bg-[#0A0A0A]/10 mx-4 mb-4 rounded-2xl overflow-hidden">
              {blog.images.length === 1 ? (
                <div className="relative w-full h-full">
                  <img 
                    src={`${process.env.NEXT_PUBLIC_API_URL}${blog.images[0].path}`}
                    alt={blog.title}
                    className="w-full h-full object-cover"
                  />
                  {blog.images[0].caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                      <p className="text-white text-sm font-suisse-intl">
                        {blog.images[0].caption}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <Swiper
                  modules={[Pagination]}
                  pagination={{ clickable: true }}
                  loop={blog.images.length > 1}
                  className="w-full h-full blog-swiper"
                >
                  {blog.images.map((image, index) => (
                    <SwiperSlide key={index}>
                      <div className="relative w-full h-full">
                        <img 
                          src={`${process.env.NEXT_PUBLIC_API_URL}${image.path}`}
                          alt={`${blog.title} - รูปที่ ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        {image.caption && (
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                            <p className="text-white text-sm font-suisse-intl">
                              {image.caption}
                            </p>
                          </div>
                        )}
                      </div>
                    </SwiperSlide>
                  ))}
                </Swiper>
              )}
            </div>
          )}

          {/* Content Container */}
          <div className="px-6 pb-6">
            {/* Meta Info */}
            <div className="flex flex-wrap items-center gap-4 mb-6 pb-4 border-b border-[#0A0A0A]/20">
              <div className="flex items-center text-[#0A0A0A] text-sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-[#0A0A0A]">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                {formatDate(blog.publishedAt)}
              </div>
              
              <div className="flex items-center text-[#0A0A0A] text-sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-[#0A0A0A]">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                {blog.views} views
              </div>

              {blog.author.name && (
                <div className="flex items-center text-[#0A0A0A] text-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-[#0A0A0A]">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  {blog.author.name}
                </div>
              )}
            </div>

            {/* Tags */}
            {blog.tags.length > 0 && (
              <div className="mb-6">
                <div className="flex flex-wrap gap-2">
                  {blog.tags.map((tag, index) => (
                    <span 
                      key={index}
                      className="px-3 py-1 text-sm bg-[#0A0A0A]/10 text-[#0A0A0A] rounded-full border border-[#0A0A0A]/20"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Main Content */}
            <div className="prose prose-lg max-w-none">
              {blog.content && blog.content.trim() !== '' ? (
                <div 
                  className="text-[#0A0A0A] leading-relaxed blog-content"
                  dangerouslySetInnerHTML={createMarkup(blog.content)}
                  style={{
                    fontFamily: 'inherit',
                    fontSize: '16px',
                    lineHeight: '1.8',
                    color: '#0A0A0A',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}
                />
              ) : (
                <div className="text-center py-12">
                  <div className="text-[#0A0A0A]/50 text-xl mb-2">📝</div>
                  <p className="text-[#0A0A0A] italic">
                    There is no content in this blog.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const BlogsPage = () => {
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [selectedBlog, setSelectedBlog] = useState<BlogPost | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // โหลดข้อมูลบล็อก
  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/blogs`);
        const data = await res.json();
        
        if (data.success) {
          console.log('Loaded blogs:', data.blogs.length);
          console.log('First blog content preview:', data.blogs[0]?.content?.substring(0, 100));
          setBlogPosts(data.blogs);
        } else {
          setError('Unable to load blog data.');
        }
      } catch (error) {
        console.error('Error fetching blogs:', error);
        setError('An error occurred while loading data.');
      } finally {
        setLoading(false);
      }
    };

    fetchBlogs();
  }, []);

  // สุ่มสีการ์ด
  const getCardColor = (index: number) => {
    return CARD_COLORS[index % CARD_COLORS.length];
  };

  // ไอคอน + สำหรับการ์ด
  const PlusIcon = ({ color }: { color: string }) => (
    <div className="absolute bottom-4 right-4 w-12 h-12 border-2 border-[#0A0A0A] rounded-full flex items-center justify-center z-10" style={{ backgroundColor: color }}>
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="text-[#0A0A0A] transition-transform duration-200 hover:scale-75">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
    </div>
  );

// การ์ดขนาดใหญ่
const LargeCard = ({ post, color }: { post: BlogPost; color: string }) => (
  <div 
    className="rounded-2xl shadow-lg overflow-hidden cursor-pointer relative group"
    style={{ width: '580px', height: '480px', backgroundColor: color }}
    onClick={() => {
      setSelectedBlog(post);
      setSelectedColor(color);
    }}
  >
    {/* Noise texture overlay */}
    <div 
      className="absolute inset-0 opacity-10 mix-blend-overlay pointer-events-none"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        backgroundSize: '150px',
        backgroundRepeat: 'repeat'
      }}
    />

    <PlusIcon color={color} />

    <div className="flex h-full">
      <div className="relative overflow-hidden rounded-2xl m-4" style={{ width: '282px' }}>
        {post.images.length > 0 ? (
          <img 
            src={`${process.env.NEXT_PUBLIC_API_URL}${post.images[0].path}`}
            alt={post.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#F5F1E6]/20 to-[#D4AF37]/20 flex items-center justify-center">
            <div className="text-[#0A0A0A]/60 text-6xl">📝</div>
          </div>
        )}
      </div>
      
      <div className="py-8 pl-2 pr-8 flex flex-col justify-start" style={{ width: '290px' }}>
        <h3 className="text-2xl font-bold text-[#0A0A0A]">
          {post.title}
        </h3>
      </div>
    </div>
  </div>
);

// การ์ดขนาดเล็ก
const SmallCard = ({ post, color }: { post: BlogPost; color: string }) => (
  <div 
    className="rounded-2xl shadow-lg overflow-hidden cursor-pointer relative group"
    style={{ width: '325px', height: '475px', backgroundColor: color }}
    onClick={() => {
      setSelectedBlog(post);
      setSelectedColor(color);
    }}
  >
    {/* Noise texture overlay */}
    <div 
      className="absolute inset-0 opacity-10 mix-blend-overlay pointer-events-none"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        backgroundSize: '150px',
        backgroundRepeat: 'repeat'
      }}
    />

    <PlusIcon color={color} />

    <div>
      <div className="relative overflow-hidden rounded-2xl m-4" style={{ height: '184px' }}>
        {post.images.length > 0 ? (
          <img 
            src={`${process.env.NEXT_PUBLIC_API_URL}${post.images[0].path}`}
            alt={post.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#F5F1E6]/20 to-[#D4AF37]/20 flex items-center justify-center">
            <div className="text-[#0A0A0A]/60 text-4xl">📝</div>
          </div>
        )}
      </div>
      
      <div className="px-6 pb-6 flex flex-col justify-start" style={{ height: '275px' }}>
        <h3 className="text-xl font-bold text-[#0A0A0A]">
          {post.title}
        </h3>
      </div>
    </div>
  </div>
);

  if (loading) {
    return (
      <div className="min-h-screen pt-28 pb-16 bg-[#0A0A0A] flex justify-center items-center relative overflow-hidden">
        {/* Ambient background elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-40 mix-blend-soft-light">
          <div className="absolute top-0 left-0 w-1/3 h-1/2 rounded-full bg-[#7c4d33]/10 blur-[150px] transform -translate-x-1/2"></div>
          <div className="absolute bottom-0 right-0 w-1/2 h-1/2 rounded-full bg-[#b88c41]/10 blur-[180px] transform translate-x-1/4"></div>
        </div>
        
        <div className="w-14 h-14 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen pt-28 pb-16 bg-[#0A0A0A] flex justify-center items-center">
        <div className="text-center">
          <div className="text-[#E67373] text-xl mb-4">An error occurred.</div>
          <div className="text-[#e3dcd4]">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-28 pb-16 bg-[#0A0A0A] relative overflow-hidden">
      {/* Ambient background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-40 mix-blend-soft-light">
        <div className="absolute top-0 left-0 w-1/3 h-1/2 rounded-full bg-[#7c4d33]/10 blur-[150px] transform -translate-x-1/2"></div>
        <div className="absolute bottom-0 right-0 w-1/2 h-1/2 rounded-full bg-[#b88c41]/10 blur-[180px] transform translate-x-1/4"></div>
      </div>
      
      {/* Noise texture overlay */}
      <div 
        className="absolute inset-0 opacity-20 mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundSize: '150px',
          backgroundRepeat: 'repeat'
        }}
      />

      <div className="max-w-6xl mx-auto px-4 relative z-10">
        {blogPosts.length === 0 ? (
          <AnimatedSection animation="fadeIn" className="text-center py-20">
            <div className="text-[#e3dcd4] text-xl">There is currently no content to display.</div>
          </AnimatedSection>
        ) : (
          <div className="px-6 py-12 w-full flex flex-col items-center">
            <div className="space-y-8">
              {/* จัดเรียงการ์ดแบบสลับ Large/Small ตามตัวอย่าง */}
              {Array.from({ length: Math.ceil(blogPosts.length / 2) }).map((_, groupIndex) => {
                const blog1 = blogPosts[groupIndex * 2];
                const blog2 = blogPosts[groupIndex * 2 + 1];
                const isEvenGroup = groupIndex % 2 === 0;

                if (isEvenGroup) {
                  // แถวคู่: justify-end -> SmallCard (alignSelf: flex-end) + LargeCard
                  return (
                    <AnimatedSection key={groupIndex} animation="fadeIn">
                      <div 
                        className="flex justify-end items-start" 
                        style={{ width: '1095px', height: '555px', gap: '100px' }}
                      >
                        <div style={{ alignSelf: 'flex-end' }}>
                          <SmallCard post={blog1} color={getCardColor(groupIndex * 2)} />
                        </div>
                        {blog2 && (
                          <LargeCard post={blog2} color={getCardColor(groupIndex * 2 + 1)} />
                        )}
                      </div>
                    </AnimatedSection>
                  );
                } else {
                  // แถวคี่: justify-start -> LargeCard (alignSelf: flex-end) + SmallCard
                  return (
                    <AnimatedSection key={groupIndex} animation="fadeIn">
                      <div 
                        className="flex justify-start items-start" 
                        style={{ width: '1095px', height: '635px', gap: '100px' }}
                      >
                        <div style={{ alignSelf: 'flex-end' }}>
                          <LargeCard post={blog1} color={getCardColor(groupIndex * 2)} />
                        </div>
                        {blog2 && (
                          <SmallCard post={blog2} color={getCardColor(groupIndex * 2 + 1)} />
                        )}
                      </div>
                    </AnimatedSection>
                  );
                }
              })}
            </div>
          </div>
        )}
      </div>

      {/* Blog Modal */}
      {selectedBlog && (
        <BlogModal 
          blog={selectedBlog}
          color={selectedColor}
          onClose={() => {
            setSelectedBlog(null);
            setSelectedColor('');
          }}
        />
      )}
    </div>
  );
};

export default BlogsPage;