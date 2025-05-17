'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { OrderAPI } from '@/lib/api';
import { AnimatedSection } from '@/components/AnimatedSection';
import { Button } from '@/components/ui/Button';
import Image from 'next/image';
import { toast } from 'react-hot-toast';

interface OrderItem {
  product: string;
  name: string;
  quantity: number;
  price: number;
  image: string;
}

interface Order {
  _id: string;
  orderItems: OrderItem[];
  shippingAddress: string;
  contactPhone: string;
  totalAmount: number;
  status: string;
  isPaid: boolean;
  paidAt: string;
  createdAt: string;
  user: {
    name: string;
    email: string;
    phone: string;
  };
}

export default function OrderDetailsPage() {
  const { isAuthenticated, isAuthLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // State สำหรับ popup แสดงข้อมูลเต็ม
  const [popupContent, setPopupContent] = useState<string | null>(null);
  const [popupTitle, setPopupTitle] = useState<string>('');
  
  // Add animation keyframes
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeInSlide {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes scaleIn {
        from { opacity: 0; transform: scale(0.95); }
        to { opacity: 1; transform: scale(1); }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  
  // ฟังก์ชั่นตัดข้อความให้สั้นลงและเพิ่ม ... เมื่อข้อความยาวเกิน
  const truncateText = (text: string, maxLength: number) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };
  
  // ฟังก์ชั่นแสดง popup ข้อมูลเต็ม
  const showPopup = (title: string, content: string) => {
    setPopupTitle(title);
    setPopupContent(content);
    // ล็อค scroll ของ body เมื่อแสดง popup
    document.body.style.overflow = 'hidden';
  };
  
  // ฟังก์ชั่นปิด popup
  const closePopup = () => {
    setPopupContent(null);
    // ปลดล็อค scroll ของ body เมื่อปิด popup
    document.body.style.overflow = 'auto';
  };
  
  // Fetch order details
  useEffect(() => {
    async function fetchOrderDetails() {
      try {
        const data = await OrderAPI.getById(params.id as string);
        setOrder(data.order);
      } catch (error) {
        console.error('Error fetching order details:', error);
        toast.error('Failed to load order details');
        router.push('/orders');
      } finally {
        setIsLoading(false);
      }
    }
    
    if (isAuthenticated && !isAuthLoading) {
      fetchOrderDetails();
    }
  }, [isAuthenticated, isAuthLoading, params.id, router]);
  
  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.push('/login?redirect=/orders');
    }
  }, [isAuthenticated, isAuthLoading, router]);
  
  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-[#E6B05E]/20 text-[#E6B05E]';
      case 'paid':
        return 'bg-[#7EB47E]/20 text-[#7EB47E]';
      case 'shipped':
        return 'bg-[#A37EB4]/20 text-[#A37EB4]';
      case 'delivered':
        return 'bg-[#5EA9E6]/20 text-[#5EA9E6]';
      case 'canceled':
        return 'bg-[#E67373]/20 text-[#E67373]';
      default:
        return 'bg-[#31372b]/20 text-[#e3dcd4]';
    }
  };
  
  if (isAuthLoading || (isLoading && isAuthenticated)) {
    return (
      <div className="min-h-screen pt-28 pb-16 bg-[#0A0A0A] flex justify-center items-center">
        <div className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  if (!order) {
    return (
      <div className="min-h-screen pt-28 pb-16 bg-[#0A0A0A]">
        <AnimatedSection animation="fadeIn" className="max-w-4xl mx-auto px-6">
          <div className="bg-[#1a1a1a]/70 backdrop-blur-sm border border-[#7c4d33]/20 p-10 rounded-3xl text-center shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="w-16 h-16 text-[#7c4d33] mx-auto mb-6">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            
            <h2 className="text-2xl text-[#F5F1E6] font-suisse-intl mb-6">
              Order Not Found
            </h2>
            
            <Button 
              onClick={() => router.push('/orders')}
              rounded="full"
              className="px-8 py-3"
            >
              Back to Orders
            </Button>
          </div>
        </AnimatedSection>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen pt-28 pb-16 bg-[#0A0A0A]">
      {/* Noise texture overlay */}
      <div 
        className="fixed inset-0 opacity-15 mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundSize: '150px',
          backgroundRepeat: 'repeat',
          zIndex: -1
        }}
      />
      
      {/* Popup component สำหรับแสดงข้อมูลเต็ม */}
      {popupContent && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
          style={{ animation: 'fadeIn 0.2s ease-out forwards' }}
          onClick={closePopup}
        >
          <div 
            className="bg-[#1a1a1a] border border-[#7c4d33]/30 rounded-3xl p-6 max-w-md w-full max-h-[80vh] overflow-auto"
            style={{ animation: 'scaleIn 0.3s ease-out forwards' }}
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside popup
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-suisse-intl-mono text-[#D4AF37]">{popupTitle}</h3>
              <button 
                onClick={closePopup} 
                className="text-[#e3dcd4] hover:text-[#D4AF37] w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#7c4d33]/20 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div 
              className="text-[#F5F1E6] font-suisse-intl bg-[#0A0A0A]/50 p-4 rounded-xl break-words"
              style={{ 
                wordBreak: 'break-word',
                whiteSpace: 'pre-wrap',
                overflowWrap: 'break-word'
              }}
            >
              {popupContent}
            </div>
          </div>
        </div>
      )}
      
      <AnimatedSection animation="fadeIn" className="max-w-4xl mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div className="flex items-center">
            <div className="h-0.5 w-6 bg-[#D4AF37]/30 mr-4"></div>
            <h1 
              className="text-4xl text-[#D4AF37] font-editorial-ultralight"
              style={{ 
                textShadow: '0 0 10px rgba(212, 175, 55, 0.3)'
              }}
            >
              Order Details
            </h1>
          </div>
          
          <Button 
            variant="outline" 
            rounded="full"
            onClick={() => router.push('/orders')}
            className="mt-4 md:mt-0 border-[#D4AF37]/50 hover:bg-[#D4AF37]/10 hover:border-[#D4AF37]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Back to Orders
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Order Summary */}
          <div className="md:col-span-2">
            <div 
              className="bg-[#1a1a1a]/70 backdrop-blur-sm p-8 rounded-3xl shadow-lg border border-[#7c4d33]/20 mb-8 overflow-hidden relative"
              style={{ animation: 'fadeInSlide 0.5s ease-out forwards' }}
            >
              {/* Subtle glow effect at top */}
              <div 
                className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl overflow-hidden"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.2), transparent)',
                  animation: 'pulse 3s infinite'
                }}
              ></div>
              
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-suisse-intl-mono text-[#F5F1E6] tracking-tight">
                  Order Summary
                </h2>
                
                <span className={`px-4 py-1 rounded-full text-xs font-suisse-intl-mono uppercase tracking-wider ${getStatusColor(order.status)}`}>
                  {order.status}
                </span>
              </div>
              
              <div className="text-[#e3dcd4]/80 text-sm font-suisse-intl mb-6 flex flex-col sm:flex-row sm:items-center">
                <div className="mb-2 sm:mb-0">Order #{order._id.substring(order._id.length - 8).toUpperCase()}</div>
                <div className="hidden sm:block mx-3 text-[#7c4d33]">•</div>
                <div>Placed on {formatDate(order.createdAt)}</div>
              </div>
              
              <div className="space-y-6 mb-8">
                {order.orderItems.map((item, index) => (
                  <div 
                    key={item.product} 
                    className="flex border-b border-[#7c4d33]/20 pb-6 last:border-0"
                    style={{ animation: `fadeInSlide ${0.5 + index * 0.1}s ease-out forwards` }}
                  >
                    <div className="w-24 h-24 relative flex-shrink-0">
                      <Image
                        src={item.image || '/images/placeholder-product.jpg'}
                        alt={item.name}
                        fill
                        className="object-cover rounded-xl"
                      />
                    </div>
                    
                    <div className="ml-6 flex-1">
                      <div className="flex justify-between mb-2">
                        <h3 className="font-suisse-intl text-lg text-[#F5F1E6]">{item.name}</h3>
                        <span className="text-[#D4AF37] font-suisse-intl-mono">
                          ${(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                      
                      <div className="text-[#e3dcd4]/80 font-suisse-intl">
                        ${item.price.toFixed(2)} × {item.quantity}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="border-t border-[#7c4d33]/30 pt-6 space-y-3">
                <div className="flex justify-between text-[#e3dcd4] font-suisse-intl">
                  <span>Subtotal</span>
                  <span>${order.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[#e3dcd4] font-suisse-intl">
                  <span>Shipping</span>
                  <span>Free</span>
                </div>
                <div className="flex justify-between text-[#F5F1E6] font-suisse-intl-mono text-lg pt-3 border-t border-[#7c4d33]/20">
                  <span>Total</span>
                  <span className="text-[#D4AF37]">${order.totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
            
            {/* Payment Information */}
            <div 
              className="bg-[#1a1a1a]/70 backdrop-blur-sm p-8 rounded-3xl shadow-lg border border-[#7c4d33]/20 relative overflow-hidden"
              style={{ animation: 'fadeInSlide 0.7s ease-out forwards' }}
            >
              <div 
                className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl overflow-hidden"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.2), transparent)',
                  animation: 'pulse 3s infinite'
                }}
              ></div>
              
              <h2 className="text-2xl font-suisse-intl-mono text-[#F5F1E6] tracking-tight mb-6">
                Payment Information
              </h2>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-[#0A0A0A]/50 rounded-2xl">
                  <span className="font-suisse-intl text-[#e3dcd4]">Payment Status</span>
                  <span className={order.isPaid ? 'text-[#7eb47e]' : 'text-[#b88c41]'}>
                    {order.isPaid ? 'Paid' : 'Pending'}
                  </span>
                </div>
                
                {order.isPaid && order.paidAt && (
                  <div className="flex justify-between items-center p-4 bg-[#0A0A0A]/50 rounded-2xl">
                    <span className="font-suisse-intl text-[#e3dcd4]">Payment Date</span>
                    <span className="text-[#F5F1E6]">{formatDate(order.paidAt)}</span>
                  </div>
                )}
                
                <div className="flex justify-between items-center p-4 bg-[#0A0A0A]/50 rounded-2xl">
                  <span className="font-suisse-intl text-[#e3dcd4]">Payment Method</span>
                  <span className="text-[#F5F1E6] flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-[#D4AF37]">
                      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                      <line x1="1" y1="10" x2="23" y2="10"></line>
                    </svg>
                    Credit Card (Stripe)
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Customer Information */}
          <div className="md:col-span-1 space-y-8">
            <div 
              className="bg-[#1a1a1a]/70 backdrop-blur-sm p-8 rounded-3xl shadow-lg border border-[#7c4d33]/20 relative overflow-hidden"
              style={{ animation: 'fadeInSlide 0.6s ease-out forwards' }}
            >
              <div 
                className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl overflow-hidden"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.2), transparent)',
                  animation: 'pulse 3s infinite'
                }}
              ></div>
              
              <h2 className="text-2xl font-suisse-intl-mono text-[#F5F1E6] tracking-tight mb-6">
                Customer Information
              </h2>
              
              <div className="space-y-5">
                <div>
                  <div className="text-[#D4AF37] text-sm font-suisse-intl-mono mb-2 uppercase tracking-wider">Name</div>
                    <div 
                      className="text-[#F5F1E6] font-suisse-intl bg-[#0A0A0A]/50 p-3 rounded-xl truncate cursor-pointer hover:bg-[#0A0A0A]/70 transition-colors"
                      onClick={() => showPopup('Name', order.user.name)}
                      title="Click to view full name"
                    >
                      <span className="truncate">{truncateText(order.user.name, 25)}</span>
                    </div>
                  </div>


                  <div>
                    <div className="text-[#D4AF37] text-sm font-suisse-intl-mono mb-2 uppercase tracking-wider">Email</div>
                    <div 
                      className="text-[#F5F1E6] font-suisse-intl bg-[#0A0A0A]/50 p-3 rounded-xl truncate cursor-pointer hover:bg-[#0A0A0A]/70 transition-colors"
                      onClick={() => showPopup('Email', order.user.email)}
                      title="Click to view full email"
                    >
                      <span className="truncate">{truncateText(order.user.email, 25)}</span>
                    </div>
                  </div>


                  <div>
                    <div className="text-[#D4AF37] text-sm font-suisse-intl-mono mb-2 uppercase tracking-wider">Phone</div>
                    <div 
                      className="text-[#F5F1E6] font-suisse-intl bg-[#0A0A0A]/50 p-3 rounded-xl truncate cursor-pointer hover:bg-[#0A0A0A]/70 transition-colors"
                      onClick={() => showPopup('Phone', order.contactPhone || order.user.phone)}
                      title="Click to view full phone"
                    >
                      <span className="truncate">{truncateText(order.contactPhone || order.user.phone, 25)}</span>
                    </div>
                  </div>
              </div>
            </div>
            
            {/* Shipping Information */}
            <div 
              className="bg-[#1a1a1a]/70 backdrop-blur-sm p-8 rounded-3xl shadow-lg border border-[#7c4d33]/20 relative overflow-hidden"
              style={{ animation: 'fadeInSlide 0.8s ease-out forwards' }}
            >
              <div 
                className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl overflow-hidden"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.2), transparent)',
                  animation: 'pulse 3s infinite'
                }}
              ></div>
              
              <h2 className="text-2xl font-suisse-intl-mono text-[#F5F1E6] tracking-tight mb-6">
                Shipping Information
              </h2>
              
              <div className="space-y-5">
                <div>
                  <div className="text-[#D4AF37] text-sm font-suisse-intl-mono mb-2 uppercase tracking-wider">Address</div>
                  <div 
                    className="text-[#F5F1E6] font-suisse-intl bg-[#0A0A0A]/50 p-4 rounded-xl cursor-pointer hover:bg-[#0A0A0A]/70 transition-colors"
                    onClick={() => showPopup('Shipping Address', order.shippingAddress)}
                    title="Click to view full address"
                  >
                    {/* ตัดข้อความและแสดงแค่ 3 บรรทัดแรก */}
                    <div className="line-clamp-3">
                      {order.shippingAddress}
                    </div>
                  </div>
                </div>
                
                <div>
                  <div className="text-[#D4AF37] text-sm font-suisse-intl-mono mb-2 uppercase tracking-wider">Status</div>
                  <div className={`text-[#F5F1E6] font-suisse-intl flex items-center bg-[#0A0A0A]/50 p-3 rounded-xl ${order.status === 'shipped' || order.status === 'delivered' ? order.status === 'shipped' ? 'text-[#A37EB4]' : 'text-[#5EA9E6]' : ''}`}>
                    {order.status === 'shipped' || order.status === 'delivered' ? (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`mr-2 ${order.status === 'shipped' ? 'text-[#A37EB4]' : 'text-[#5EA9E6]'}`}>
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        <span className="truncate">
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)} on {formatDate(order.createdAt)}
                        </span>
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-[#E6B05E]">
                          <circle cx="12" cy="12" r="10"></circle>
                          <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        Not yet shipped
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Need Help Section */}
            <div 
              className="bg-[#1a1a1a]/70 backdrop-blur-sm p-8 rounded-3xl shadow-lg border border-[#7c4d33]/20 relative overflow-hidden"
              style={{ animation: 'fadeInSlide 0.9s ease-out forwards' }}
            >
              <div 
                className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl overflow-hidden"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.2), transparent)',
                  animation: 'pulse 3s infinite'
                }}
              ></div>
              
              <h2 className="text-2xl font-suisse-intl-mono text-[#F5F1E6] tracking-tight mb-4">
                Need Help?
              </h2>
              
              <p className="text-[#e3dcd4]/80 font-suisse-intl mb-6">
                If you have any questions about your order, our team is here to assist you.
              </p>
              
              <Button 
                variant="outline" 
                fullWidth
                rounded="full"
                className="border-[#D4AF37]/50 hover:bg-[#D4AF37]/10 hover:border-[#D4AF37]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                </svg>
                Contact Support
              </Button>
            </div>
          </div>
        </div>
      </AnimatedSection>
    </div>
  );
}