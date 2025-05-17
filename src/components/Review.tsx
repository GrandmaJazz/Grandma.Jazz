'use client';

import { useState, useEffect, useRef } from 'react';
import { AnimatedSection } from '@/components/AnimatedSection';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import LoginModal from '@/components/LoginModal';

// ประกาศ interface สำหรับ Review
interface IReview {
  id: string;
  rating: number;
  text: string;
  userName: string;
  createdAt?: string;
}

// Review Card Component
const ReviewCard = ({ review }: { review: IReview }) => {
  const textRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  
  // ตรวจสอบว่าข้อความยาวเกินกรอบหรือไม่
  useEffect(() => {
    if (textRef.current) {
      const { scrollWidth, clientWidth } = textRef.current;
      setIsOverflowing(scrollWidth > clientWidth);
    }
  }, [review.text]);
  
  // แสดงดาวตามคะแนน
  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 0; i < 5; i++) {
      stars.push(
        <span key={i} className={`text-xl ${i < rating ? 'text-white' : 'text-white/30'}`}>
          ★
        </span>
      );
    }
    return stars;
  };
  
  return (
    <div className="min-w-[280px] w-[280px] h-[200px] bg-[#0A0A0A]/70 border border-white/20 backdrop-blur-md p-6 rounded-[20px] shadow-xl relative overflow-hidden flex flex-col flex-shrink-0">
      {/* Star Rating */}
      <div className="flex mb-4">
        {renderStars(review.rating)}
      </div>
      
      {/* Review Text ที่มีแอนิเมชันเลื่อนเมื่อข้อความยาวเกินกรอบ */}
      <div 
        ref={textRef}
        className={`flex-grow mb-4 text-white text-base font-suisse-intl relative ${isOverflowing ? 'overflow-hidden whitespace-nowrap' : 'line-clamp-3'}`}
        style={isOverflowing ? {
          animation: 'scrollText 15s linear infinite',
          animationDelay: '2s'
        } : {}}
      >
        "{review.text}"
      </div>
      
      {/* ชื่อผู้ใช้ */}
      <div className="mt-auto text-white/70 font-suisse-intl-mono tracking-wide text-sm">
        — {review.userName}
      </div>
    </div>
  );
};

// Modal สำหรับส่งรีวิว
const ReviewModal = ({ 
  isOpen, 
  onClose, 
  onSubmit 
}: { 
  isOpen: boolean; 
  onClose: () => void;
  onSubmit: (rating: number, reviewText: string) => Promise<void>;
}) => {
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [hoveredRating, setHoveredRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  if (!isOpen) return null;
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      toast.error('Please select a score.');
      return;
    }
    
    if (reviewText.trim() === '') {
      toast.error('Please enter review text.');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await onSubmit(rating, reviewText);
      setRating(5);
      setReviewText('');
    } catch (error) {
      console.error('Error submitting review:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="fixed inset-0 z-50 bg-[#0A0A0A]/80 backdrop-blur-md flex items-center justify-center p-4">
      <div 
        className="bg-[#0A0A0A] border border-white/30 rounded-[30px] p-8 max-w-md w-full relative"
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
          disabled={isSubmitting}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <h2 className="text-3xl font-editorial-ultralight mb-6 text-center text-white">
          แบ่งปันประสบการณ์ของคุณ
        </h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-sm font-suisse-intl-mono uppercase mb-2 text-white">
              คะแนนของคุณ
            </label>
            <div className="flex justify-center space-x-3 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="focus:outline-none text-3xl transform transition-transform hover:scale-110"
                  disabled={isSubmitting}
                >
                  <span className={`${(hoveredRating || rating) >= star ? 'text-white' : 'text-white/30'}`}>
                    ★
                  </span>
                </button>
              ))}
            </div>
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-suisse-intl-mono uppercase mb-2 text-white">
              ข้อความรีวิว
            </label>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="แชร์ความคิดเห็นเกี่ยวกับประสบการณ์ของคุณ..."
              className="bg-[#0A0A0A]/80 border border-white/30 text-white rounded-2xl px-5 py-4 w-full focus:outline-none focus:ring-2 focus:ring-white/50 transition duration-300 font-suisse-intl min-h-[120px]"
              maxLength={200}
              disabled={isSubmitting}
            />
            <div className="text-right text-xs text-white/50 mt-1">
              {reviewText.length}/200
            </div>
          </div>
          
          <div className="flex justify-center">
            <button
              type="submit"
              className="px-8 py-3 rounded-full bg-white text-[#0A0A0A] hover:bg-gray-200 transition-all duration-300 font-suisse-intl-mono text-sm tracking-wide shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="mr-2 w-4 h-4 border-2 border-[#0A0A0A] border-t-transparent rounded-full animate-spin"></span>
                  กำลังส่ง...
                </>
              ) : (
                'ส่งรีวิว'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ตัวแปรสำหรับ API endpoint
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Sample review data
const sampleReviews = [
  {
    id: '1',
    rating: 5,
    text: 'Grandma Jazz is a truly exceptional experience. The music is soulful and the ambiance takes you back to a golden era that feels both nostalgic and fresh.',
    userName: 'Somchai T.'
  },
  {
    id: '2',
    rating: 4,
    text: 'The performances were incredible, but the venue was a bit crowded. Still, the energy was amazing and I would definitely come back again!',
    userName: 'Lalita P.'
  },
  {
    id: '3',
    rating: 5,
    text: 'This is absolutely the best jazz performance I have witnessed in Bangkok. The combination of traditional Thai elements with classic jazz created an unforgettable fusion.',
    userName: 'Alex W.'
  },
  {
    id: '4',
    rating: 4,
    text: 'Had a wonderful evening. The musicians were top-notch and the crowd was appreciative and respectful. My only wish is that it lasted longer!',
    userName: 'Nuttapong K.'
  },
  {
    id: '5',
    rating: 5,
    text: 'An intimate setting with world-class musicians. You can feel Grandma Jazz\'s influence in every note. A must-visit for any jazz enthusiast in Thailand.',
    userName: 'Sarah J.'
  }
];

// สร้างชุดข้อมูลรีวิวเพิ่มเติมเพื่อให้มีรีวิวมากขึ้น
const extendedSampleReviews = [
  ...sampleReviews,
  {
    id: '6',
    rating: 5,
    text: 'The blend of traditional Thai music with classic jazz creates a unique atmosphere that I\'ve never experienced before. Truly one-of-a-kind.',
    userName: 'David L.'
  },
  {
    id: '7',
    rating: 4,
    text: 'Beautiful venue, amazing performers. The cocktails were also exceptional. Would highly recommend for a special night out.',
    userName: 'Pitchaya S.'
  },
  {
    id: '8',
    rating: 5,
    text: 'As a jazz enthusiast, I can confidently say this is among the best experiences in Bangkok. The attention to detail and the talent on display is remarkable.',
    userName: 'John T.'
  },
  {
    id: '9',
    rating: 5,
    text: 'The perfect blend of nostalgia and contemporary sound. You can feel the passion in every note played. A must for music lovers.',
    userName: 'Nareenart P.'
  },
  {
    id: '10',
    rating: 4,
    text: 'Great atmosphere and talented musicians. The place gets quite busy so I recommend booking in advance. Worth every moment spent there.',
    userName: 'Michael R.'
  }
];

// Main Review Component
export default function Review() {
  const [reviews, setReviews] = useState<IReview[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [repeatedReviews, setRepeatedReviews] = useState<IReview[]>([]);
  const trackRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { 
    user, 
    token, 
    isAuthenticated, 
    isAuthLoading, 
    checkAuthentication 
  } = useAuth();
  
  // เพิ่ม animation keyframes ตอน mount
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes scrollText {
        0% { transform: translateX(0); }
        10% { transform: translateX(0); }
        60% { transform: translateX(calc(-100% + 100%)); }
        100% { transform: translateX(0); }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  
  // โหลดรีวิวเมื่อ component mount
  useEffect(() => {
    fetchReviews();
  }, []);
  
  // สร้างรีวิวที่ทำซ้ำให้มีจำนวนมากพอเพื่อเต็มหน้าจอ
  useEffect(() => {
    if (reviews.length === 0) return;
    
    // คำนวณจำนวนรีวิวที่ต้องการทำซ้ำให้เต็มหน้าจอ
    const minCardsNeeded = Math.max(20, Math.ceil(window.innerWidth / 280) + 5);
    
    // ทำซ้ำรีวิวให้มีจำนวนมากพอ
    let repeated: IReview[] = [];
    const multiplier = Math.ceil(minCardsNeeded / reviews.length);
    
    for (let i = 0; i < multiplier; i++) {
      repeated = [...repeated, ...reviews];
    }
    
    setRepeatedReviews(repeated);
  }, [reviews]);
  
  // ปรับความกว้างของ track และความเร็วของ animation เมื่อขนาดหน้าจอเปลี่ยน
  useEffect(() => {
    if (!trackRef.current || !containerRef.current || repeatedReviews.length === 0) return;
    
    const updateMarqueeAnimation = () => {
      const track = trackRef.current;
      const container = containerRef.current;
      if (!track || !container) return;
      
      // คำนวณความกว้างของ track และ container
      const trackWidth = track.scrollWidth;
      const containerWidth = container.clientWidth;
      
      // กำหนดระยะเวลาของ animation ตามขนาดของ track (ยิ่งยาวยิ่งต้องใช้เวลามากขึ้น)
      // แต่ไม่เกิน 30 วินาที เพื่อให้วนเร็วพอสำหรับรีวิวน้อย
      const baseDuration = Math.min(30, Math.max(10, trackWidth / 100));
      
      // กำหนด animation ให้กับ track
      track.style.animation = `marquee ${baseDuration}s linear infinite`;
      
      // ถ้าจำนวนรีวิวน้อยเกินไป ทำให้ track มีความกว้างมากกว่า container เพื่อให้เกิดการเลื่อน
      if (trackWidth < containerWidth * 2) {
        // ปรับระยะห่างระหว่างการ์ดให้มากขึ้น
        track.style.columnGap = '3rem';
      }
    };
    
    updateMarqueeAnimation();
    
    // อัปเดตเมื่อขนาดหน้าจอเปลี่ยน
    window.addEventListener('resize', updateMarqueeAnimation);
    return () => {
      window.removeEventListener('resize', updateMarqueeAnimation);
    };
  }, [repeatedReviews]);
  
  // ตรวจสอบว่ามี API หรือยัง ถ้ายังให้ใช้ sample data
  const fetchReviews = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`${API_URL}/api/reviews`);
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setReviews(data.reviews);
          } else {
            // ถ้าไม่มี API หรือเรียก API ไม่สำเร็จ ให้ใช้ sample data แทน
            console.log('Using sample review data');
            setReviews(extendedSampleReviews);
          }
        } else {
          // ถ้าไม่มี API หรือเรียก API ไม่สำเร็จ ให้ใช้ sample data แทน
          console.log('Using sample review data');
          setReviews(extendedSampleReviews);
        }
      } catch (error) {
        // ถ้าไม่มี API หรือเรียก API ไม่สำเร็จ ให้ใช้ sample data แทน
        console.log('Using sample review data');
        setReviews(extendedSampleReviews);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      setError('เกิดข้อผิดพลาดในการโหลดรีวิว');
    } finally {
      setIsLoading(false);
    }
  };
  
  // ส่งรีวิวไปยัง API
  const handleSubmitReview = async (rating: number, text: string) => {
    // ตรวจสอบการยืนยันตัวตนอีกครั้ง
    const isAuth = await checkAuthentication();
    
    if (!isAuth) {
      toast.error('Please login before reviewing.');
      setIsModalOpen(false);
      setIsLoginModalOpen(true);
      return;
    }
    
    try {
      // ส่งรีวิวไปยัง API
      const response = await fetch(`${API_URL}/api/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ rating, text })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success) {
          // เพิ่มรีวิวใหม่ไว้ที่จุดเริ่มต้นของอาร์เรย์
          const newReview = data.review;
          const updatedReviews = [newReview, ...reviews];
          setReviews(updatedReviews);
          
          setIsModalOpen(false);
        } else {
          toast.error(data.message || 'There was an error submitting the review.');
        }
      } else {
        console.log('API error, using mock review instead');
        // ในกรณีที่ API ไม่พร้อมหรือยังไม่มี API จริง
        // สร้างรีวิวแบบจำลอง
        const userName = user ? `${user.name || ''} ${user.surname ? user.surname.charAt(0) + '.' : ''}`.trim() : 'Guest';
        
        const mockReview = {
          id: Date.now().toString(),
          rating,
          text,
          userName
        };
        
        const updatedReviews = [mockReview, ...reviews];
        setReviews(updatedReviews);
        
        setIsModalOpen(false);
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      
      const userName = user ? `${user.name || ''} ${user.surname ? user.surname.charAt(0) + '.' : ''}`.trim() : 'Guest';
      
      const mockReview = {
        id: Date.now().toString(),
        rating,
        text,
        userName
      };
      
      const updatedReviews = [mockReview, ...reviews];
      setReviews(updatedReviews);
      
      setIsModalOpen(false);
    }
  };
  
  // จัดการคลิกปุ่มรีวิว
  const handleReviewClick = async () => {
    const isAuth = await checkAuthentication();
    
    if (isAuth) {
      setIsModalOpen(true);
    } else {
      setIsLoginModalOpen(true);
    }
  };
  
  return (
    <div className="min-h-[400px] py-16 bg-[#0A0A0A] relative overflow-hidden">
      {/* Noise texture overlay */}
      <div 
        className="fixed inset-0 opacity-10 mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundSize: '150px',
          backgroundRepeat: 'repeat',
          zIndex: -1
        }}
      />
      
      <AnimatedSection animation="fadeIn" className="w-full">
        <div className="text-center mb-10">
          <h2 className="text-4xl md:text-5xl font-editorial-ultralight mb-4 text-white">
            Don't just take <br/>
            our word for it.
          </h2>
          
          {/* Decorative line */}
          <div className="flex items-center justify-center mt-3">
            <div className="h-px w-16 bg-gradient-to-r from-transparent via-white/50 to-transparent"></div>
          </div>
          <p className="text-white/70 font-suisse-intl-mono text-sm tracking-wide mt-2 opacity-70 max-w-2xl mx-auto">
            Take theirs.
          </p>
        </div>
        
        {/* ส่วนแสดงการโหลดหรือข้อผิดพลาด */}
        {isLoading ? (
          <div className="flex justify-center items-center py-16">
            <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <div className="text-center py-10">
            <p className="text-white mb-4">{error}</p>
            <button
              onClick={fetchReviews}
              className="px-6 py-2 rounded-full bg-white text-[#0A0A0A] hover:bg-gray-200 transition-all duration-300 font-suisse-intl-mono text-sm tracking-wide"
            >
              Try Again
            </button>
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-white mb-6">There are no reviews yet. Be the first to share your experience.</p>
            <button
              onClick={handleReviewClick}
              className="px-8 py-3 rounded-full bg-white text-[#0A0A0A] hover:bg-gray-200 transition-all duration-300 font-suisse-intl-mono text-sm tracking-wide shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Write your review
            </button>
          </div>
        ) : (
          /* Marquee style review slider ที่ปรับปรุงใหม่ */
          <div 
            ref={containerRef}
            className="relative mb-12 overflow-hidden"
          >
            {/* เพิ่มไล่เฉดที่ขอบซ้ายและขวาเพื่อให้ดูกลมกลืนกับการเลื่อน */}
            <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-[#0A0A0A] to-transparent z-10 pointer-events-none"></div>
            <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[#0A0A0A] to-transparent z-10 pointer-events-none"></div>
            
            <div className="marquee">
              <div 
                ref={trackRef} 
                className="flex gap-6 py-4"
                style={{ 
                  paddingLeft: '2rem',
                  paddingRight: '2rem'
                }}
              >
                {/* แสดงรีวิวที่ทำซ้ำให้มีจำนวนมากพอเพื่อเต็มหน้าจอ */}
                {repeatedReviews.map((review, index) => (
                  <ReviewCard key={`review-${review.id}-${index}`} review={review} />
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* ปุ่มเขียนรีวิว */}
        <div className="flex justify-center mt-8">
          <button
            onClick={handleReviewClick}
            className="px-8 py-4 rounded-full bg-[#0A0A0A] border border-white/30 text-white hover:bg-white/10 transition-all duration-300 font-suisse-intl-mono text-sm tracking-wide shadow-xl transform hover:-translate-y-1"
          >
            Write your review
          </button>
        </div>
      </AnimatedSection>
      
      {/* Review Modal */}
      {isModalOpen && (
        <ReviewModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onSubmit={handleSubmitReview}
        />
      )}
      
      {/* Login Modal */}
      <LoginModal 
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        redirectUrl="/" // หลังจากล็อกอินให้กลับมาที่หน้าหลัก
      />
      
      {/* CSS for marquee */}
      <style jsx>{`
        .marquee {
          width: 100%;
          overflow: hidden;
          position: relative;
        }
        
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(calc(-100% - 2rem)); }
        }
        
        @media (prefers-reduced-motion: reduce) {
          .track {
            animation-play-state: paused;
          }
        }
      `}</style>
    </div>
  );
}