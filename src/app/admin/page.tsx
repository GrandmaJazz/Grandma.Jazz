//src/app/admin/page.tsx (Updated with Blog Stats)
'use client';

import { useEffect, useState } from 'react';
import { ProductAPI, OrderAPI } from '@/lib/api';
import { AnimatedSection } from '@/components/AnimatedSection';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    products: 0,
    orders: 0,
    revenue: 0,
    pendingOrders: 0,
    totalBlogs: 0,
    publishedBlogs: 0,
    draftBlogs: 0,
    totalViews: 0
  });
  
  const [recentOrders, setRecentOrders] = useState([]);
  const [recentBlogs, setRecentBlogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Fetch dashboard data
  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const token = localStorage.getItem('token');
        
        // Fetch products
        const productsData = await ProductAPI.getAll();
        
        // Fetch orders
        const ordersData = await OrderAPI.getAll();
        
        // Fetch blog stats
        let blogStats = { total: 0, published: 0, draft: 0, totalViews: 0, recentBlogs: [] };
        try {
          const blogRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/blogs/admin/stats`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          const blogData = await blogRes.json();
          if (blogData.success) {
            blogStats = blogData.stats;
          }
        } catch (blogError) {
          console.error('Error fetching blog stats:', blogError);
        }
        
        // Calculate stats
        const totalProducts = productsData.products.length;
        const totalOrders = ordersData.orders.length;
        const pendingOrders = ordersData.orders.filter(
          (order: any) => order.status === 'pending' || order.status === 'paid'
        ).length;
        
        // Calculate total revenue (only from paid orders)
        const totalRevenue = ordersData.orders
          .filter((order: any) => order.isPaid)
          .reduce((sum: number, order: any) => sum + order.totalAmount, 0);
        
        setStats({
          products: totalProducts,
          orders: totalOrders,
          revenue: totalRevenue,
          pendingOrders,
          totalBlogs: blogStats.total,
          publishedBlogs: blogStats.published,
          draftBlogs: blogStats.draft,
          totalViews: blogStats.totalViews
        });
        
        // Get recent orders
        setRecentOrders(
          ordersData.orders
            .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 5)
        );
        
        // Get recent blogs
        setRecentBlogs(blogStats.recentBlogs || []);
        
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchDashboardData();
  }, []);
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
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
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  return (
    <div>
      <h1 className="text-4xl font-editorial-ultralight text-[#F5F1E6] mb-8">
        Dashboard <span className="text-[#D4AF37]">Overview</span>
      </h1>
      
      {/* Stats Cards */}
      <AnimatedSection animation="fadeIn" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {/* Products Card */}
        <div className="bg-[#31372b] p-6 rounded-3xl shadow-md relative">
          <div className="flex justify-between items-center mb-4 relative">
            <h2 className="text-[#e3dcd4] font-suisse-intl-mono text-sm uppercase tracking-wider">Products</h2>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#D4AF37]">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
          </div>
          <div className="text-4xl font-suisse-intl text-[#F5F1E6]">{stats.products}</div>
          <Link href="/admin/products" className="text-[#D4AF37] text-sm hover:underline mt-3 inline-block">
            Manage Products
          </Link>
        </div>
        
        {/* Orders Card */}
        <div className="bg-[#7c4d33] p-6 rounded-3xl shadow-md relative">
          <div className="flex justify-between items-center mb-4 relative">
            <h2 className="text-[#e3dcd4] font-suisse-intl-mono text-sm uppercase tracking-wider">Total Orders</h2>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#D4AF37]">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <path d="M16 10a4 4 0 0 1-8 0"></path>
            </svg>
          </div>
          <div className="text-4xl font-suisse-intl text-[#F5F1E6]">{stats.orders}</div>
          <Link href="/admin/orders" className="text-[#D4AF37] text-sm hover:underline mt-3 inline-block">
            View All Orders
          </Link>
        </div>
        
        {/* Revenue Card */}
        <div className="bg-[#b88c41] p-6 rounded-3xl shadow-md relative">
          <div className="flex justify-between items-center mb-4 relative">
            <h2 className="text-[#0A0A0A] font-suisse-intl-mono text-sm uppercase tracking-wider">Revenue</h2>
            <span className="text-[#0A0A0A] text-[25px]">฿</span>
          </div>
          <div className="text-4xl font-suisse-intl text-[#0A0A0A]">฿{stats.revenue.toFixed(2)}</div>
          <div className="text-[#31372b] text-sm mt-3">
            From paid orders
          </div>
        </div>
        
        {/* Pending Orders Card */}
        <div className="bg-[#e3dcd4] p-6 rounded-3xl shadow-md relative">
          <div className="flex justify-between items-center mb-4 relative">
            <h2 className="text-[#0A0A0A] font-suisse-intl-mono text-sm uppercase tracking-wider">Pending Orders</h2>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#7c4d33]">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
          <div className="text-4xl font-suisse-intl text-[#0A0A0A]">{stats.pendingOrders}</div>
          <Link href="/admin/orders?status=pending" className="text-[#7c4d33] text-sm hover:underline mt-3 inline-block">
            View Pending Orders
          </Link>
        </div>
      </AnimatedSection>

      {/* Blog Stats Cards */}
      <AnimatedSection animation="fadeIn" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {/* Total Blogs */}
        <div className="bg-[#0A0A0A] border border-[#7c4d33]/30 p-6 rounded-3xl shadow-md relative">
          <div className="flex justify-between items-center mb-4 relative">
            <h2 className="text-[#e3dcd4] font-suisse-intl-mono text-sm uppercase tracking-wider">Total Blogs</h2>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#D4AF37]">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </div>
          <div className="text-4xl font-suisse-intl text-[#F5F1E6]">{stats.totalBlogs}</div>
          <Link href="/admin/blogs" className="text-[#D4AF37] text-sm hover:underline mt-3 inline-block">
            Manage Blogs
          </Link>
        </div>

        {/* Published Blogs */}
        <div className="bg-[#7EB47E]/10 border border-[#7EB47E]/30 p-6 rounded-3xl shadow-md relative">
          <div className="flex justify-between items-center mb-4 relative">
            <h2 className="text-[#e3dcd4] font-suisse-intl-mono text-sm uppercase tracking-wider">Published</h2>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#7EB47E]">
              <polyline points="9 11 12 14 22 4"></polyline>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
            </svg>
          </div>
          <div className="text-4xl font-suisse-intl text-[#F5F1E6]">{stats.publishedBlogs}</div>
          <Link href="/admin/blogs?status=published" className="text-[#7EB47E] text-sm hover:underline mt-3 inline-block">
            View Published
          </Link>
        </div>

        {/* Draft Blogs */}
        <div className="bg-[#E6B05E]/10 border border-[#E6B05E]/30 p-6 rounded-3xl shadow-md relative">
          <div className="flex justify-between items-center mb-4 relative">
            <h2 className="text-[#e3dcd4] font-suisse-intl-mono text-sm uppercase tracking-wider">Drafts</h2>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#E6B05E]">
              <path d="M12 3a9 9 0 0 1 9 9 9 9 0 0 1-9 9 9 9 0 0 1-9-9 9 9 0 0 1 9-9z"></path>
              <path d="M12 7v5l3 3"></path>
            </svg>
          </div>
          <div className="text-4xl font-suisse-intl text-[#F5F1E6]">{stats.draftBlogs}</div>
          <Link href="/admin/blogs?status=draft" className="text-[#E6B05E] text-sm hover:underline mt-3 inline-block">
            View Drafts
          </Link>
        </div>

        {/* Total Views */}
        <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/30 p-6 rounded-3xl shadow-md relative">
          <div className="flex justify-between items-center mb-4 relative">
            <h2 className="text-[#e3dcd4] font-suisse-intl-mono text-sm uppercase tracking-wider">Total Views</h2>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#D4AF37]">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </div>
          <div className="text-4xl font-suisse-intl text-[#F5F1E6]">{stats.totalViews.toLocaleString()}</div>
          <div className="text-[#D4AF37] text-sm mt-3">
            Blog views
          </div>
        </div>
      </AnimatedSection>
      
      {/* Recent Orders and Blogs */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-10">
        {/* Recent Orders */}
        <AnimatedSection animation="fadeIn">
          <div className="bg-[#0A0A0A] rounded-lg border border-[#31372b] overflow-hidden shadow-lg">
            <div className="p-6 border-b border-[#31372b]">
              <h2 className="text-[#F5F1E6] text-xl font-suisse-intl">Recent Orders</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs font-suisse-intl-mono uppercase text-[#e3dcd4] bg-[#31372b]">
                  <tr>
                    <th className="px-6 py-3">Order ID</th>
                    <th className="px-6 py-3">Customer</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.length === 0 ? (
                    <tr className="border-b border-[#31372b]">
                      <td colSpan={4} className="px-6 py-4 text-center text-[#e3dcd4]">
                        No orders found
                      </td>
                    </tr>
                  ) : (
                    recentOrders.slice(0, 3).map((order: any) => (
                      <tr key={order._id} className="border-b border-[#31372b] hover:bg-[#31372b]/20 transition-colors">
                        <td className="px-6 py-4 font-suisse-intl-mono text-[#e3dcd4]">
                          #{order._id.substring(order._id.length - 8).toUpperCase()}
                        </td>
                        <td className="px-6 py-4 text-[#F5F1E6] truncate max-w-[120px]">
                          {order.user.name || order.user.email}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-suisse-intl-mono uppercase ${getStatusColor(order.status)}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-[#D4AF37] font-suisse-intl-mono">
                          ฿{order.totalAmount.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="p-4 border-t border-[#31372b] text-center">
              <Link href="/admin/orders" className="text-[#D4AF37] hover:text-[#b88c41] transition-colors text-sm">
                View All Orders
              </Link>
            </div>
          </div>
        </AnimatedSection>

        {/* Recent Blogs */}
        <AnimatedSection animation="fadeIn">
          <div className="bg-[#0A0A0A] rounded-lg border border-[#31372b] overflow-hidden shadow-lg">
            <div className="p-6 border-b border-[#31372b]">
              <h2 className="text-[#F5F1E6] text-xl font-suisse-intl">Recent Blogs</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs font-suisse-intl-mono uppercase text-[#e3dcd4] bg-[#31372b]">
                  <tr>
                    <th className="px-6 py-3">Title</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Views</th>
                    <th className="px-6 py-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentBlogs.length === 0 ? (
                    <tr className="border-b border-[#31372b]">
                      <td colSpan={4} className="px-6 py-4 text-center text-[#e3dcd4]">
                        No blogs found
                      </td>
                    </tr>
                  ) : (
                    recentBlogs.map((blog: any) => (
                      <tr key={blog._id} className="border-b border-[#31372b] hover:bg-[#31372b]/20 transition-colors">
                        <td className="px-6 py-4 text-[#F5F1E6] truncate max-w-[150px]">
                          {blog.title}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-suisse-intl-mono uppercase ${
                            blog.isPublished 
                              ? 'bg-[#7EB47E]/20 text-[#7EB47E]' 
                              : 'bg-[#E6B05E]/20 text-[#E6B05E]'
                          }`}>
                            {blog.isPublished ? 'Published' : 'Draft'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-[#D4AF37] font-suisse-intl-mono">
                          {blog.views}
                        </td>
                        <td className="px-6 py-4 text-[#e3dcd4] font-suisse-intl-mono text-xs">
                          {formatDate(blog.createdAt)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="p-4 border-t border-[#31372b] text-center">
              <Link href="/admin/blogs" className="text-[#D4AF37] hover:text-[#b88c41] transition-colors text-sm">
                View All Blogs
              </Link>
            </div>
          </div>
        </AnimatedSection>
      </div>
      
      {/* Quick Actions */}
      <AnimatedSection animation="fadeIn">
        <div className="bg-[#0A0A0A] rounded-lg border border-[#31372b] p-6 shadow-lg">
          <h2 className="text-[#F5F1E6] text-xl font-suisse-intl mb-4">Quick Actions</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link 
              href="/admin/products/new"
              className="bg-[#31372b] hover:bg-[#7c4d33] transition-all duration-300 p-4 rounded-lg flex items-center text-[#F5F1E6]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3 text-[#D4AF37]">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Add New Product
            </Link>
            
            <Link 
              href="/admin/blogs/new"
              className="bg-[#31372b] hover:bg-[#7c4d33] transition-all duration-300 p-4 rounded-lg flex items-center text-[#F5F1E6]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3 text-[#D4AF37]">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              Write New Blog
            </Link>
            
            <Link 
              href="/admin/cards/new"
              className="bg-[#31372b] hover:bg-[#7c4d33] transition-all duration-300 p-4 rounded-lg flex items-center text-[#F5F1E6]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3 text-[#D4AF37]">
                <circle cx="12" cy="12" r="10"></circle>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              Add Music Card
            </Link>
            
            <Link 
              href="/admin/orders?status=pending"
              className="bg-[#31372b] hover:bg-[#7c4d33] transition-all duration-300 p-4 rounded-lg flex items-center text-[#F5F1E6]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3 text-[#D4AF37]">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              Check Pending Orders
            </Link>
          </div>
        </div>
      </AnimatedSection>
    </div>
  );
}