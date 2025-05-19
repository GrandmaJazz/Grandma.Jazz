// UPDATED CardsPage.tsx (removed Card Title references)
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AnimatedSection } from '@/components/AnimatedSection';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

// ประกาศ interface สำหรับ Card
interface Card {
  _id: string;
  title: string; // Left in interface since it's part of the API contract
  description: string; // Left in interface since it's part of the API contract
  imagePath: string;
  order: number;
  isActive: boolean;
  music: Music[];
  createdAt: string;
  updatedAt: string;
}

// ประกาศ interface สำหรับ Music
interface Music {
  _id: string;
  title: string;
  filePath: string;
  duration: number;
}

export default function CardsPage() {
  const { isAuthenticated, isAuthLoading, isAdmin } = useAuth();
  const router = useRouter();
  
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // โหลดข้อมูลการ์ดทั้งหมด
  useEffect(() => {
    const fetchCards = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/cards`);
        const data = await res.json();
        
        if (data.success) {
          setCards(data.cards);
        } else {
          setError(data.message || 'ไม่สามารถโหลดข้อมูลการ์ดได้');
          toast.error(data.message || 'ไม่สามารถโหลดข้อมูลการ์ดได้');
        }
      } catch (error) {
        console.error('Error fetching cards:', error);
        setError('เกิดข้อผิดพลาดในการโหลดข้อมูลการ์ด');
        toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูลการ์ด');
      } finally {
        setLoading(false);
      }
    };
    
    fetchCards();
    
    // Add animation keyframes
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeInSlow {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes moveUp {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  
  // ฟังก์ชันสำหรับลบการ์ด
  const handleDeleteCard = async (id: string) => {
    if (!confirm('Are you sure you want to delete this card?')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/cards/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success('Card deleted successfully');
        // อัพเดตรายการการ์ด
        setCards(cards.filter(card => card._id !== id));
      } else {
        toast.error(data.message || 'Failed to delete card');
      }
    } catch (error) {
      console.error('Error deleting card:', error);
      toast.error('Error deleting card');
    }
  };
  
  // ฟังก์ชันสำหรับเปลี่ยนสถานะการ์ด (เปิด/ปิด)
  const handleToggleCardStatus = async (id: string, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/cards/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: !currentStatus })
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success(`Card ${!currentStatus ? 'activated' : 'deactivated'}`);
        // อัพเดตสถานะในรายการการ์ด
        setCards(cards.map(card => 
          card._id === id ? { ...card, isActive: !currentStatus } : card
        ));
      } else {
        toast.error(data.message || 'Failed to update card status');
      }
    } catch (error) {
      console.error('Error updating card status:', error);
      toast.error('Error updating card status');
    }
  };
  
  // ฟังก์ชันสำหรับแปลงเวลา
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // แสดง loading spinner
  if (loading) {
    return (
      <div className="min-h-screen pt-28 pb-16 bg-[#0A0A0A] flex justify-center items-center relative overflow-hidden">
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
        
        <div className="w-14 h-14 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
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
        <AnimatedSection animation="fadeIn">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <h1 className="text-4xl md:text-5xl font-editorial-ultralight text-[#F5F1E6]">
              Manage <span className="text-[#D4AF37]">Music Cards</span>
            </h1>
            
            <Link 
              href="/admin/cards/new" 
              className="bg-[#D4AF37] hover:bg-[#b88c41] text-[#0A0A0A] py-2.5 px-5 rounded-full transition-colors duration-300 font-suisse-intl-mono text-sm uppercase tracking-wider"
            >
              Add New Card
            </Link>
          </div>
          
          <div className="h-0.5 bg-gradient-to-r from-transparent via-[#7c4d33] to-transparent w-48 mb-8"></div>
        </AnimatedSection>
        
        <AnimatedSection animation="fadeIn">
          <div className="bg-[#0A0A0A] rounded-xl border border-[#7c4d33]/40 overflow-hidden shadow-lg">
            <div className="p-6 border-b border-[#7c4d33]/30">
              <h2 className="text-[#F5F1E6] text-xl font-suisse-intl">All Cards</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs font-suisse-intl-mono uppercase text-[#e3dcd4] bg-[#0A0A0A]">
                  <tr>
                    <th className="px-6 py-3 border-b border-[#7c4d33]/30">Image</th>
                    <th className="px-6 py-3 border-b border-[#7c4d33]/30">Music Count</th>
                    <th className="px-6 py-3 border-b border-[#7c4d33]/30">Status</th>
                    <th className="px-6 py-3 border-b border-[#7c4d33]/30">Created</th>
                    <th className="px-6 py-3 border-b border-[#7c4d33]/30">Actions</th>
                  </tr>
                </thead>
                <tbody>
                {cards.length === 0 ? (
                    <tr className="border-b border-[#7c4d33]/30">
                    <td colSpan={5} className="px-6 py-4 text-center text-[#e3dcd4]">
                        No cards found
                    </td>
                    </tr>
                ) : (
                    cards.map((card) => (
                    <tr key={card._id} className="border-b border-[#7c4d33]/30 hover:bg-[#7c4d33]/10 transition-colors duration-300">
                        <td className="px-6 py-4">
                        <div className="w-16 h-16 rounded-lg overflow-hidden border border-[#7c4d33]/30">
                            <img 
                            src={`${process.env.NEXT_PUBLIC_API_URL}${card.imagePath}`} 
                            alt="Card image"
                            className="w-full h-full object-cover"
                            />
                        </div>
                        </td>
                        <td className="px-6 py-4 text-[#e3dcd4]">{card.music.length}</td>
                        <td className="px-6 py-4">
                        <button
                            onClick={() => handleToggleCardStatus(card._id, card.isActive)}
                            className={`px-3 py-1 rounded-full text-xs font-suisse-intl-mono uppercase ${
                            card.isActive 
                                ? 'bg-[#7EB47E]/20 text-[#7EB47E]' 
                                : 'bg-[#E67373]/20 text-[#E67373]'
                            }`}
                        >
                            {card.isActive ? 'Active' : 'Inactive'}
                        </button>
                        </td>
                        <td className="px-6 py-4 text-[#e3dcd4] font-suisse-intl">
                        {formatDate(card.createdAt)}
                        </td>
                        <td className="px-6 py-4">
                        <div className="flex space-x-3">
                            <Link 
                            href={`/admin/cards/${card._id}`}
                            className="px-3 py-1 text-xs font-suisse-intl-mono uppercase text-[#D4AF37] hover:text-[#b88c41] border border-[#D4AF37] hover:border-[#b88c41] rounded-full transition-colors duration-300"
                            >
                            Edit
                            </Link>
                            <button
                            onClick={() => handleDeleteCard(card._id)}
                            className="px-3 py-1 text-xs font-suisse-intl-mono uppercase text-[#E67373] hover:text-[#b35151] border border-[#E67373] hover:border-[#b35151] rounded-full transition-colors duration-300"
                            >
                            Delete
                            </button>
                        </div>
                        </td>
                    </tr>
                    ))
                )}
                </tbody>
              </table>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </div>
  );
}