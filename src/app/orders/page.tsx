//srcapp/orders/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { OrderAPI } from '@/lib/api';
import { AnimatedSection } from '@/components/AnimatedSection';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
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
  totalAmount: number;
  status: string;
  isPaid: boolean;
  paidAt: string;
  createdAt: string;
}

export default function OrdersPage() {
  const { isAuthenticated, isAuthLoading } = useAuth();
  const router = useRouter();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Add animation keyframes
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeInSlow {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  
  // Fetch orders
  useEffect(() => {
    async function fetchOrders() {
      try {
        const data = await OrderAPI.getMyOrders();
        setOrders(data.orders);
      } catch (error) {
        console.error('Error fetching orders:', error);
        toast.error('Failed to load your orders');
      } finally {
        setIsLoading(false);
      }
    }
    
    if (isAuthenticated && !isAuthLoading) {
      fetchOrders();
    }
  }, [isAuthenticated, isAuthLoading]);
  
  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.push('/login?redirect=/orders');
    }
  }, [isAuthenticated, isAuthLoading, router]);
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
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
      
      <AnimatedSection animation="fadeIn" className="max-w-4xl mx-auto px-6">
        <div className="flex items-center mb-8">
          <div className="h-0.5 w-12 bg-[#D4AF37]/30 mr-6"></div>
          <h1 
            className="text-4xl text-[#D4AF37] font-editorial-ultralight"
            style={{ 
              textShadow: '0 0 10px rgba(212, 175, 55, 0.3)'
            }}
          >
            My Orders
          </h1>
          <div className="h-0.5 flex-1 bg-[#D4AF37]/10 ml-6"></div>
        </div>
        
        {orders.length === 0 ? (
          <div className="bg-[#0A0A0A] border border-[#7c4d33]/30 p-10 rounded-3xl text-center shadow-lg backdrop-blur-sm">
            <div className="w-24 h-24 mx-auto mb-6 flex items-center justify-center rounded-full bg-[#0A0A0A] border border-[#D4AF37]/20">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 text-[#D4AF37]">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <path d="M16 10a4 4 0 0 1-8 0"></path>
              </svg>
            </div>
            
            <h2 className="text-2xl text-[#F5F1E6] font-suisse-intl mb-4">
              No Orders Yet
            </h2>
            
            <p className="text-[#e3dcd4] font-suisse-intl mb-8 max-w-md mx-auto">
              You haven't placed any orders yet. Explore our premium collection and find something that resonates with your taste.
            </p>
            
            <Button 
              onClick={() => router.push('/products')}
              rounded="full"
              className="px-8 py-3"
            >
              Browse Products
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {orders.map((order, index) => (
              <div 
                key={order._id} 
                className="bg-[#1a1a1a]/70 backdrop-blur-sm border border-[#7c4d33]/20 rounded-3xl overflow-hidden shadow-lg transition-all duration-300 hover:border-[#D4AF37]/30"
                style={{ 
                  animation: `fadeInSlow ${0.3 + index * 0.1}s ease-out forwards`
                }}
              >
                {/* Order header */}
                <div className="bg-[#0A0A0A]/50 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#7c4d33]/20">
                  <div>
                    <div className="text-[#D4AF37] text-xs font-suisse-intl-mono mb-1 uppercase tracking-wider">
                      ORDER #{order._id.substring(order._id.length - 8).toUpperCase()}
                    </div>
                    <div className="text-[#F5F1E6] text-sm font-suisse-intl">
                      {formatDate(order.createdAt)}
                    </div>
                  </div>
                  
                  <div className="flex mt-3 sm:mt-0">
                    <span className={`px-4 py-1 rounded-full text-xs font-suisse-intl-mono uppercase tracking-wider ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                </div>
                
                {/* Order items */}
                <div className="p-6">
                  <div className="space-y-6 mb-6">
                    {order.orderItems.slice(0, 2).map((item) => (
                      <div key={item.product} className="flex">
                        <div className="w-20 h-20 relative flex-shrink-0">
                          <Image
                            src={item.image || '/images/placeholder-product.jpg'}
                            alt={item.name}
                            fill
                            className="object-cover rounded-xl"
                          />
                        </div>
                        
                        <div className="ml-4 flex-1">
                          <div className="flex justify-between mb-2">
                            <h3 className="font-suisse-intl text-base text-[#F5F1E6]">{item.name}</h3>
                            <span className="text-[#D4AF37] text-base font-suisse-intl-mono">
                              ${(item.price * item.quantity).toFixed(2)}
                            </span>
                          </div>
                          
                          <div className="text-[#e3dcd4]/80 text-sm font-suisse-intl">
                            ${item.price.toFixed(2)} × {item.quantity}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {/* Show more items indicator */}
                    {order.orderItems.length > 2 && (
                      <div className="text-center py-2 border-t border-b border-[#7c4d33]/20 text-[#e3dcd4]/60 text-sm font-suisse-intl-mono tracking-wide">
                        +{order.orderItems.length - 2} more items
                      </div>
                    )}
                  </div>
                  
                  {/* Order footer */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-t border-[#7c4d33]/20 pt-5">
                    <div className="text-[#F5F1E6] font-suisse-intl-mono mb-4 sm:mb-0">
                      Total: <span className="text-[#D4AF37] text-lg">${order.totalAmount.toFixed(2)}</span>
                    </div>
                    
                    <Link href={`/orders/${order._id}`}>
                      <Button 
                        variant="outline" 
                        rounded="full"
                        className="px-6 border-[#D4AF37]/50 hover:bg-[#D4AF37]/10 hover:border-[#D4AF37]"
                      >
                        View Details
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </AnimatedSection>
    </div>
  );
}