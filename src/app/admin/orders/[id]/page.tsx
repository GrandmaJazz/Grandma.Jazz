'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { AnimatedSection } from '@/components/AnimatedSection';
import Image from 'next/image';
import Link from 'next/link';
import { OrderAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';

interface OrderItem {
  _id: string;
  product: {
    _id: string;
    name: string;
    price: number;
    images: string[];
  };
  quantity: number;
  price: number;
  image: string;
}

interface Order {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
  };
  orderItems: Array<OrderItem>;
  totalAmount: number;
  status: string;
  isPaid: boolean;
  paidAt?: string;
  createdAt: string;
  shippingAddress: string;
  contactPhone: string;
  paymentId?: string;
  trackingNumber?: string;
}

export default function AdminOrderDetailPage() {
  const params = useParams();
  const orderId = params.id as string;
  
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updatedStatus, setUpdatedStatus] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  
  // Fetch order details
  useEffect(() => {
    async function fetchOrderDetails() {
      setIsLoading(true);
      try {
        const data = await OrderAPI.getById(orderId);
        console.log('Order data:', data.order); // ตรวจสอบข้อมูลที่ได้รับจาก API
        setOrder(data.order);
        setUpdatedStatus(data.order.status);
        
        // ตั้งค่า tracking number จากข้อมูลที่ได้จาก API
        if (data.order.trackingNumber) {
          setTrackingNumber(data.order.trackingNumber);
        }
      } catch (error) {
        console.error('Error fetching order details:', error);
        toast.error('Failed to load order details');
      } finally {
        setIsLoading(false);
      }
    }
    
    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId]);
  
  // Format date
  const formatDate = (dateString?: string) => {
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
        return 'bg-[#e3dcd4]/20 text-[#e3dcd4]';
    }
  };
  
  // Handle status update
  const handleUpdateOrder = async () => {
    if (!order) return;
    
    setIsUpdating(true);
    try {
      // อัพเดทสถานะพร้อม tracking number
      await OrderAPI.updateStatus(orderId, updatedStatus, trackingNumber);
      
      // Update local state
      setOrder({
        ...order,
        status: updatedStatus,
        trackingNumber: trackingNumber
      });
      
      toast.success('Order updated successfully');
      
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Failed to update order');
    } finally {
      setIsUpdating(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  if (!order) {
    return (
      <div className="bg-[#0A0A0A] rounded-3xl p-6 border border-[#7c4d33]/30 text-center">
        <h2 className="text-[#F5F1E6] text-2xl mb-4">Order Not Found</h2>
        <p className="text-[#e3dcd4] mb-6">The order you're looking for doesn't exist or has been removed.</p>
        <Link href="/admin/orders">
          <Button>Back to Orders</Button>
        </Link>
      </div>
    );
  }
  
  return (
    <div>
      {/* Header with Back Link */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-3xl font-editorial-ultralight text-[#F5F1E6]">
          Order <span className="text-[#D4AF37]">Details</span>
        </h1>
        
        <Link href="/admin/orders">
          <Button variant="outline" size="sm" rounded="full">
            Back to Orders
          </Button>
        </Link>
      </div>
      
      {/* Order Summary Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <AnimatedSection animation="fadeIn">
            <div className="bg-[#0A0A0A] rounded-3xl border border-[#7c4d33]/30 overflow-hidden">
              <div className="p-6 border-b border-[#7c4d33]/30">
                <div className="flex flex-col sm:flex-row justify-between mb-4">
                  <div>
                    <div className="text-xs text-[#e3dcd4] uppercase font-suisse-intl-mono mb-1">Order ID</div>
                    <div className="text-[#F5F1E6] font-suisse-intl-mono">#{order._id}</div>
                  </div>
                  <div className="mt-4 sm:mt-0">
                    <div className="text-xs text-[#e3dcd4] uppercase font-suisse-intl-mono mb-1">Date Placed</div>
                    <div className="text-[#F5F1E6]">{formatDate(order.createdAt)}</div>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row justify-between">
                  <div>
                    <div className="text-xs text-[#e3dcd4] uppercase font-suisse-intl-mono mb-1">Customer</div>
                    <div className="text-[#F5F1E6]">{order.user.name || 'N/A'}</div>
                    <div className="text-[#e3dcd4] text-sm">{order.user.email}</div>
                    {order.user.phone && <div className="text-[#e3dcd4] text-sm">{order.user.phone}</div>}
                  </div>
                  <div className="mt-4 sm:mt-0">
                    <div className="text-xs text-[#e3dcd4] uppercase font-suisse-intl-mono mb-1">Status</div>
                    <span className={`px-3 py-1 rounded-full text-xs font-suisse-intl-mono uppercase ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Order Items */}
              <div className="p-6 border-b border-[#7c4d33]/30">
                <h2 className="text-[#F5F1E6] text-lg font-suisse-intl mb-4">Order Items</h2>
                <div className="space-y-4">
                  {order.orderItems.map((item, index) => (
                    <div key={item._id || index} className="flex flex-col sm:flex-row items-start sm:items-center py-3 border-b border-[#7c4d33]/20 last:border-b-0">
                      <div className="w-16 h-16 rounded-xl overflow-hidden mr-4 mb-3 sm:mb-0 bg-[#7c4d33]/10 flex-shrink-0">
                        {item.image ? (
                          <Image
                            src={item.image}
                            alt={item.product.name || `Product ${index + 1}`}
                            width={64}
                            height={64}
                            className="w-full h-full object-cover"
                          />
                        ) : item.product.images && item.product.images.length > 0 ? (
                          <Image
                            src={item.product.images[0]}
                            alt={item.product.name || `Product ${index + 1}`}
                            width={64}
                            height={64}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#e3dcd4]">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                              <circle cx="8.5" cy="8.5" r="1.5"></circle>
                              <polyline points="21 15 16 10 5 21"></polyline>
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link href={`/admin/products/${item.product._id}`} className="text-[#F5F1E6] hover:text-[#D4AF37] transition-colors font-medium">
                          {item.product.name}
                        </Link>
                        <div className="text-[#e3dcd4] text-sm">
                          Quantity: {item.quantity}
                        </div>
                      </div>
                      <div className="text-[#D4AF37] font-suisse-intl-mono mt-2 sm:mt-0">
                        ฿{item.price.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Order Total */}
                <div className="mt-6 border-t border-[#7c4d33]/30 pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[#e3dcd4]">Subtotal</span>
                    <span className="text-[#F5F1E6]">฿{order.totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-[#e3dcd4]">Shipping</span>
                    <span className="text-[#F5F1E6]">฿0.00</span>
                  </div>
                  <div className="flex justify-between items-center mt-4 pt-4 border-t border-[#7c4d33]/30">
                    <span className="text-[#F5F1E6] font-medium">Total</span>
                    <span className="text-[#D4AF37] font-suisse-intl-mono text-xl">฿{order.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              
              {/* Payment & Shipping Info */}
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-[#F5F1E6] text-md font-suisse-intl mb-3">Payment Information</h3>
                  <div className="text-sm space-y-2">
                    <div className="flex flex-col">
                      <span className="text-[#e3dcd4] text-xs uppercase font-suisse-intl-mono">Payment Status</span>
                      <span className={`mt-1 ${order.isPaid ? 'text-[#7EB47E]' : 'text-[#E6B05E]'}`}>
                        {order.isPaid ? 'Paid' : 'Not Paid'}
                      </span>
                    </div>
                    {order.isPaid && order.paidAt && (
                      <div className="flex flex-col">
                        <span className="text-[#e3dcd4] text-xs uppercase font-suisse-intl-mono">Payment Date</span>
                        <span className="text-[#F5F1E6] mt-1">{formatDate(order.paidAt)}</span>
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="text-[#e3dcd4] text-xs uppercase font-suisse-intl-mono">Payment Method</span>
                      <span className="text-[#F5F1E6] mt-1">Credit Card (Stripe)</span>
                    </div>
                    {order.paymentId && (
                      <div className="flex flex-col">
                        <span className="text-[#e3dcd4] text-xs uppercase font-suisse-intl-mono">Payment ID</span>
                        <span className="text-[#F5F1E6] mt-1">{order.paymentId}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-[#F5F1E6] text-md font-suisse-intl mb-3">Shipping Information</h3>
                  <div className="text-sm space-y-2">
                    {/* Customer Info */}
                    <div>
                      <span className="text-[#e3dcd4] text-xs uppercase font-suisse-intl-mono">Name</span>
                      <p className="text-[#F5F1E6] mt-1">{order.user.name || 'N/A'}</p>
                    </div>
                    {/* Shipping Address */}
                    <div>
                      <span className="text-[#e3dcd4] text-xs uppercase font-suisse-intl-mono">Address</span>
                      <p className="text-[#F5F1E6] mt-1 whitespace-pre-line">
                        {order.shippingAddress}
                      </p>
                    </div>
                    {/* Contact Phone */}
                    <div>
                      <span className="text-[#e3dcd4] text-xs uppercase font-suisse-intl-mono">Phone</span>
                      <p className="text-[#F5F1E6] mt-1">{order.contactPhone || order.user.phone || 'N/A'}</p>
                    </div>
                    
                    {/* Tracking Number */}
                    {order.trackingNumber && (
                      <div>
                        <span className="text-[#e3dcd4] text-xs uppercase font-suisse-intl-mono">Tracking Number</span>
                        <p className="text-[#F5F1E6] mt-1">{order.trackingNumber}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
        
        {/* Order Management Card */}
        <div>
          <AnimatedSection animation="fadeIn" delay={0.1}>
            <div className="bg-[#0A0A0A] rounded-3xl p-6 border border-[#7c4d33]/30 sticky top-24">
              <h2 className="text-[#F5F1E6] text-lg font-suisse-intl mb-4">Manage Order</h2>
              
              <div className="space-y-4">
                {/* Status Update */}
                <div>
                  <label className="block text-xs text-[#e3dcd4] uppercase font-suisse-intl-mono mb-2">
                    Update Status
                  </label>
                  <select
                    value={updatedStatus}
                    onChange={(e) => setUpdatedStatus(e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-[#7c4d33]/50 rounded-xl p-3 text-[#F5F1E6] focus:border-[#D4AF37] focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
                    aria-label="Order status"
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="canceled">Canceled</option>
                  </select>
                </div>
                
                {/* Tracking Number */}
                <div>
                  <label className="block text-xs text-[#e3dcd4] uppercase font-suisse-intl-mono mb-2">
                    Tracking Number
                  </label>
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="Enter tracking number"
                    className="w-full bg-[#0A0A0A] border border-[#7c4d33]/50 rounded-xl p-3 text-[#F5F1E6] focus:border-[#D4AF37] focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
                    aria-label="Tracking number input"
                  />
                </div>
                
                <Button 
                  onClick={handleUpdateOrder} 
                  loading={isUpdating} 
                  disabled={order.status === updatedStatus && order.trackingNumber === trackingNumber}
                  fullWidth
                  rounded="full"
                  className="mt-4"
                >
                  Update Order
                </Button>
                
                {/* Additional Actions */}
                <div className="pt-4 border-t border-[#7c4d33]/30 space-y-3">
                  <Button 
                    variant="outline" 
                    fullWidth
                    rounded="full"
                    onClick={() => window.print()}
                  >
                    Print Order
                  </Button>
                  
                  <Link href={`mailto:${order.user.email}?subject=Your Order ${order._id}`}>
                    <Button 
                      variant="ghost" 
                      fullWidth
                      rounded="full"
                      style={{marginTop: '15px'}}
                    >
                      Email Customer
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </div>
  );
}