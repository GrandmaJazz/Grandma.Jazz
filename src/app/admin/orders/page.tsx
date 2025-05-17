//src/app/admin/orders/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { OrderAPI } from '@/lib/api';
import { AnimatedSection } from '@/components/AnimatedSection';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

interface Order {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
  };
  orderItems: Array<any>;
  totalAmount: number;
  status: string;
  isPaid: boolean;
  paidAt: string;
  createdAt: string;
}

export default function AdminOrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState(
    searchParams.get('status') || 'all'
  );
  
  const statuses = [
    { id: 'all', name: 'All Orders' },
    { id: 'pending', name: 'Pending' },
    { id: 'paid', name: 'Paid' },
    { id: 'shipped', name: 'Shipped' },
    { id: 'delivered', name: 'Delivered' },
    { id: 'canceled', name: 'Canceled' }
  ];
  
  // Fetch orders
  useEffect(() => {
    async function fetchOrders() {
      setIsLoading(true);
      try {
        const data = await OrderAPI.getAll();
        
        // Filter by status if needed
        let filteredOrders = data.orders;
        if (selectedStatus !== 'all') {
          filteredOrders = filteredOrders.filter(
            (order: Order) => order.status === selectedStatus
          );
        }
        
        setOrders(filteredOrders);
      } catch (error) {
        console.error('Error fetching orders:', error);
        toast.error('Failed to load orders');
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchOrders();
  }, [selectedStatus]);
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
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
        return 'bg-[#e3dcd4]/20 text-[#e3dcd4]';
    }
  };
  
  return (
    <div>
      {/* Header Section - เพิ่ม responsive ในหน้าจอเล็ก */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-3xl font-editorial-ultralight text-[#F5F1E6]">
          Orders <span className="text-[#D4AF37]">Management</span>
        </h1>
      </div>
      
      {/* Status Filter */}
      <AnimatedSection animation="fadeIn" className="mb-6">
        <div className="bg-[#0A0A0A] p-4 sm:p-5 rounded-3xl border border-[#7c4d33]/30">
          <label className="block text-[#e3dcd4] text-sm font-suisse-intl-mono mb-2">
            Filter by Status
          </label>
          <div className="flex flex-wrap gap-2">
            {statuses.map((status) => (
              <button
                key={status.id}
                onClick={() => setSelectedStatus(status.id)}
                className={`px-3 py-1 text-xs font-suisse-intl-mono uppercase transition-colors rounded-full ${
                  selectedStatus === status.id
                    ? 'bg-[#D4AF37] text-[#0A0A0A]'
                    : 'bg-[#0A0A0A] border border-[#D4AF37]/30 text-[#F5F1E6] hover:bg-[#7c4d33]/30'
                }`}
              >
                {status.name}
              </button>
            ))}
          </div>
        </div>
      </AnimatedSection>
      
      {/* Orders Table */}
      <AnimatedSection animation="fadeIn">
        <div className="bg-[#0A0A0A] rounded-3xl overflow-hidden border border-[#7c4d33]/30">
          {isLoading ? (
            <div className="py-16 flex justify-center">
              <div className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : orders.length === 0 ? (
            <div className="py-16 text-center px-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-[#7c4d33] mb-4">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <path d="M16 10a4 4 0 0 1-8 0"></path>
              </svg>
              <p className="text-[#e3dcd4] font-suisse-intl mb-4">No orders found</p>
            </div>
          ) : (
            <div>
              {/* Table for medium screens and up */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs font-suisse-intl-mono uppercase text-[#e3dcd4] bg-[#0A0A0A]">
                    <tr>
                      <th className="px-6 py-3">Order ID</th>
                      <th className="px-6 py-3">Customer</th>
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3">Items</th>
                      <th className="px-6 py-3">Total</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order._id} className="border-b border-[#7c4d33]/30 hover:bg-[#7c4d33]/10 transition-colors">
                        <td className="px-6 py-4 font-suisse-intl-mono text-[#e3dcd4]">
                          #{order._id.substring(order._id.length - 8).toUpperCase()}
                        </td>
                        <td className="px-6 py-4 text-[#F5F1E6]">
                          <div>{order.user.name || 'N/A'}</div>
                          <div className="text-xs text-[#e3dcd4]">{order.user.email}</div>
                        </td>
                        <td className="px-6 py-4 text-[#e3dcd4]">
                          {formatDate(order.createdAt)}
                        </td>
                        <td className="px-6 py-4 text-[#e3dcd4]">
                          {order.orderItems.length}
                        </td>
                        <td className="px-6 py-4 text-[#D4AF37] font-suisse-intl-mono">
                          ฿{order.totalAmount.toFixed(2)}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-suisse-intl-mono uppercase ${getStatusColor(order.status)}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <Link 
                            href={`/admin/orders/${order._id}`}
                            className="text-[#D4AF37] hover:text-[#b88c41] transition-colors"
                          >
                            Manage
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Card view for small screens */}
              <div className="md:hidden">
                <div className="grid grid-cols-1 gap-4 p-4">
                  {orders.map((order) => (
                    <div key={order._id} className="bg-[#0A0A0A] p-4 rounded-2xl border border-[#7c4d33]/30">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="text-[#F5F1E6] font-suisse-intl font-medium truncate">
                            {order.user.name || 'N/A'}
                          </div>
                          <div className="text-[#e3dcd4] text-xs mt-1">{order.user.email}</div>
                        </div>
                        <div className="text-[#D4AF37] font-suisse-intl-mono font-medium">
                          ฿{order.totalAmount.toFixed(2)}
                        </div>
                      </div>

                      <div className="flex justify-between mb-3">
                        <div className="text-xs text-[#e3dcd4]">
                          <div className="mb-1">
                            <span className="font-bold">Order ID:</span> #{order._id.substring(order._id.length - 8).toUpperCase()}
                          </div>
                          <div className="mb-1">
                            <span className="font-bold">Date:</span> {formatDate(order.createdAt)}
                          </div>
                          <div>
                            <span className="font-bold">Items:</span> {order.orderItems.length}
                          </div>
                        </div>
                        <span className={`px-2 py-1 h-6 self-start rounded-full text-xs font-suisse-intl-mono uppercase ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                      
                      <div className="mt-3 pt-3 border-t border-[#7c4d33]/30 flex justify-end">
                        <Link 
                          href={`/admin/orders/${order._id}`}
                          className="text-[#D4AF37] hover:text-[#b88c41] transition-colors flex items-center"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                          Manage Order
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </AnimatedSection>
    </div>
  );
}