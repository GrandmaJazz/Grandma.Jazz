//src/app/admin/layout.tsx (Updated)
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

// Admin sidebar links - เพิ่ม Blogs
const sidebarLinks = [
  { title: 'Dashboard', href: '/admin', icon: 'grid' },
  { title: 'Playlist', href: '/admin/cards', icon: 'disc' }, 
  { title: 'Blogs', href: '/admin/blogs', icon: 'edit' },
  { title: 'Products', href: '/admin/products', icon: 'package' },
  { title: 'Orders', href: '/admin/orders', icon: 'shopping-bag' },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isAuthLoading, isAdmin } = useAuth();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Protect admin routes
  useEffect(() => {
    if (!isAuthLoading) {
      if (!isAuthenticated) {
        router.push('/login?redirect=/admin');
        toast.error('Please login to access the admin area');
      } else if (!isAdmin) {
        router.push('/');
        toast.error('You do not have permission to access the admin area');
      }
    }
  }, [isAuthenticated, isAuthLoading, isAdmin, router]);
  
  if (isAuthLoading || !isAuthenticated || !isAdmin) {
    return (
      <div className="min-h-screen pt-28 pb-16 flex justify-center items-center bg-[#0A0A0A]">
        <div className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen pt-24 flex bg-[#0A0A0A]">
      {/* Sidebar Toggle for mobile */}
      <button
        className="md:hidden fixed left-4 top-20 z-20 bg-[#7c4d33] p-2 rounded-md"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#F5F1E6]">
          {isSidebarOpen ? (
            <>
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </>
          ) : (
            <>
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </>
          )}
        </svg>
      </button>
      
      {/* Sidebar */}
      <div 
        className={`fixed md:static h-screen z-10 bg-[#0A0A0A] w-64 transition-transform duration-300 ease-in-out transform ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 border-r border-[#7c4d33]/30 shadow-lg`}
      >
        <div className="h-full flex flex-col relative overflow-hidden">
          {/* Sidebar Header */}
          <div className="p-6 border-b border-[#7c4d33]/30">
            <h1 
              className="text-[#D4AF37] text-2xl font-editorial-ultralight"
            >
              Admin Portal
            </h1>
          </div>
          
          {/* Sidebar Links */}
          <nav className="flex-1 py-4 overflow-y-auto">
            <ul className="space-y-1 px-2">
              {sidebarLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="flex items-center px-4 py-3 text-[#F5F1E6] hover:bg-[#7c4d33]/30 rounded-lg transition-all duration-300"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3 text-[#D4AF37]">
                      {link.icon === 'grid' && (
                        <>
                          <rect x="3" y="3" width="7" height="7"></rect>
                          <rect x="14" y="3" width="7" height="7"></rect>
                          <rect x="14" y="14" width="7" height="7"></rect>
                          <rect x="3" y="14" width="7" height="7"></rect>
                        </>
                      )}
                      {link.icon === 'disc' && (
                        <>
                          <circle cx="12" cy="12" r="10"></circle>
                          <circle cx="12" cy="12" r="3"></circle>
                          <circle cx="12" cy="12" r="6" strokeDasharray="1,3" strokeWidth="1"></circle>
                          <circle cx="12" cy="12" r="8" strokeDasharray="1,6" strokeWidth="1"></circle>
                        </>
                      )}
                      {link.icon === 'edit' && (
                        <>
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </>
                      )}
                      {link.icon === 'package' && (
                        <>
                          <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line>
                          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                          <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                          <line x1="12" y1="22.08" x2="12" y2="12"></line>
                        </>
                      )}
                      {link.icon === 'shopping-bag' && (
                        <>
                          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                          <line x1="3" y1="6" x2="21" y2="6"></line>
                          <path d="M16 10a4 4 0 0 1-8 0"></path>
                        </>
                      )}
                    </svg>
                    <span className="font-suisse-intl text-sm">{link.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          
          {/* Sidebar Footer */}
          <div className="p-6 border-t border-[#7c4d33]/30">
            <Link
              href="/"
              className="flex items-center text-[#F5F1E6] hover:text-[#D4AF37] transition-colors text-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-[#D4AF37]">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
              Back to Website
            </Link>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 overflow-x-hidden overflow-y-auto">
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}