//src/app/admin/cards/[id]/page.tsx
'use client';

import { useEffect, useState, FormEvent, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AnimatedSection } from '@/components/AnimatedSection';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { useRouter, useParams } from 'next/navigation';
import React from 'react';

// ประกาศ interface สำหรับ Card และ Music
interface Music {
  _id: string;
  title: string;
  filePath: string;
  duration: number;
}

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

export default function CardFormPage() {
  const { isAuthenticated, isAuthLoading, isAdmin } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isEditMode = id !== 'new';
  
  const [card, setCard] = useState<Partial<Card>>({
    isActive: true,
    order: 0,
    music: []
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [musicFiles, setMusicFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);
  
  // โหลดข้อมูลการ์ด (ถ้าเป็นโหมดแก้ไข)
  useEffect(() => {
    if (isEditMode) {
      const fetchCard = async () => {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/cards/${id}`);
          const data = await res.json();
          
          if (data.success) {
            setCard(data.card);
            if (data.card.imagePath) {
              setImagePreview(`${process.env.NEXT_PUBLIC_API_URL}${data.card.imagePath}`);
            }
          } else {
            toast.error('ไม่สามารถโหลดข้อมูลการ์ดได้');
            router.push('/admin/cards');
          }
        } catch (error) {
          console.error('Error fetching card:', error);
          toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูลการ์ด');
          router.push('/admin/cards');
        } finally {
          setLoading(false);
        }
      };
      
      fetchCard();
    }
    
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
  }, [id, isEditMode, router]);
  
  // จัดการเมื่อเลือกรูปภาพ
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // ตรวจสอบประเภทไฟล์
    if (!file.type.startsWith('image/')) {
      toast.error('Please select image files only');
      return;
    }
    
    // ตรวจสอบขนาดไฟล์ (ไม่เกิน 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image file size must not exceed 5MB');
      return;
    }
    
    setImageFile(file);
    
    // แสดงตัวอย่างรูปภาพ
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };
  
  // จัดการเมื่อเลือกไฟล์เพลง
  const handleMusicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const newFiles: File[] = [];
    
    // ตรวจสอบไฟล์ทั้งหมด
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // ตรวจสอบประเภทไฟล์
      if (!file.type.startsWith('audio/')) {
        toast.error(`"${file.name}" is not an audio file`);
        continue;
      }
      
      // ตรวจสอบขนาดไฟล์ (ไม่เกิน 50MB)
      if (file.size > 50 * 1024 * 1024) {
        toast.error(`"${file.name}" exceeds the maximum size of 50MB`);
        continue;
      }
      
      newFiles.push(file);
    }
    
    setMusicFiles(prev => [...prev, ...newFiles]);
  };
  
  // ลบไฟล์เพลงออกจากรายการที่จะอัปโหลด
  const removeMusicFile = (index: number) => {
    setMusicFiles(prev => prev.filter((_, i) => i !== index));
  };
  
  // ลบเพลงออกจากการ์ด (ในโหมดแก้ไข)
  const handleRemoveMusic = async (musicId: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/cards/${id}/music/${musicId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await res.json();
      
      if (data.success) {
        setCard(data.card);
        toast.success('Removed music from card');
      } else {
        toast.error('Failed to remove music');
      }
    } catch (error) {
      console.error('Error removing music:', error);
      toast.error('Error removing music');
    }
  };
  
  // จัดการเมื่อส่งฟอร์ม
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!imageFile && !isEditMode) {
      toast.error('Please upload a card image');
      return;
    }
    
    setSaving(true);
    
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      
      // เพิ่มข้อมูลพื้นฐานของการ์ด (now with default values since fields were removed)
      formData.append('title', 'Music Card'); // ใช้ค่าเริ่มต้น
      formData.append('description', ''); // ใช้ค่าว่าง
      formData.append('order', String(card.order || 0));
      formData.append('isActive', String(card.isActive));
      
      // เพิ่มรูปภาพถ้ามี
      if (imageFile) {
        formData.append('image', imageFile);
      }
      
      // เพิ่มไฟล์เพลงทั้งหมด
      musicFiles.forEach(file => {
        formData.append('music', file);
      });
      
      const url = isEditMode 
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/cards/${id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/cards`;
      
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
        toast.success(isEditMode ? 'Card updated' : 'Card created');
        router.push('/admin/cards');
      } else {
        toast.error(data.message || 'Failed to save card');
      }
    } catch (error) {
      console.error('Error saving card:', error);
      toast.error('Error saving card');
    } finally {
      setSaving(false);
    }
  };
  
  // แปลงวินาทีเป็นรูปแบบ mm:ss
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
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
      
      <div className="max-w-6xl mx-auto px-4 relative">
        <AnimatedSection animation="fadeIn" className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h1 className="text-4xl md:text-5xl font-editorial-ultralight text-[#F5F1E6]">
              {isEditMode ? 'Edit' : 'Add'} <span className="text-[#D4AF37]">Music Card</span>
            </h1>
            
            <Link 
              href="/admin/cards" 
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
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h2 className="text-[#F5F1E6] text-xl font-suisse-intl mb-1">Music Card Details</h2>
                    <p className="text-[#e3dcd4] text-sm">Upload an image and add your music tracks</p>
                  </div>
                  
                  {/* Timestamp for edit mode */}
                  {isEditMode && card.createdAt && (
                    <div className="text-right">
                      <div className="text-[#e3dcd4] text-xs font-suisse-intl-mono">
                        Created: {new Date(card.createdAt).toLocaleDateString()}
                      </div>
                      {card.updatedAt && (
                        <div className="text-[#e3dcd4] text-xs font-suisse-intl-mono mt-1">
                          Last updated: {new Date(card.updatedAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="p-6 space-y-8">
                {/* Card Details Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Card Status */}
                  <div className="space-y-6">
                    {/* Card Status */}
                    <div>
                      <label className="block text-[#D4AF37] mb-2 font-suisse-intl-mono text-sm uppercase tracking-wider">
                        Card Status
                      </label>
                      <div className="flex items-center space-x-6">
                        <label className="inline-flex items-center">
                          <input
                            type="radio"
                            name="status"
                            value="true"
                            checked={card.isActive === true}
                            onChange={() => setCard({ ...card, isActive: true })}
                            className="w-4 h-4 text-[#D4AF37] focus:ring-[#D4AF37]"
                          />
                          <span className="ml-2 text-[#e3dcd4]">Active</span>
                        </label>
                        <label className="inline-flex items-center">
                          <input
                            type="radio"
                            name="status"
                            value="false"
                            checked={card.isActive === false}
                            onChange={() => setCard({ ...card, isActive: false })}
                            className="w-4 h-4 text-[#D4AF37] focus:ring-[#D4AF37]"
                          />
                          <span className="ml-2 text-[#e3dcd4]">Inactive</span>
                        </label>
                      </div>
                    </div>
                  </div>
                  
                  {/* Card Image Section */}
                  <div>
                    <label className="block text-[#D4AF37] mb-4 font-suisse-intl-mono text-sm uppercase tracking-wider">
                      Card Image
                    </label>
                    
                    <div className="flex flex-col items-center">
                      {imagePreview ? (
                        <div className="w-full max-w-xs h-64 rounded-2xl overflow-hidden mb-4 relative group border border-[#7c4d33]/30">
                          <img 
                            src={imagePreview} 
                            alt="Card preview" 
                            className="w-full h-full object-cover"
                          />
                          {/* Noise texture overlay */}
                          <div 
                            className="absolute inset-0 opacity-10 mix-blend-overlay pointer-events-none"
                            style={{
                              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                              backgroundSize: '150px',
                              backgroundRepeat: 'repeat'
                            }}
                          />
                        </div>
                      ) : (
                        <div className="w-full max-w-xs h-64 rounded-2xl bg-[#7c4d33]/10 border border-dashed border-[#7c4d33]/50 flex items-center justify-center mb-4">
                          <div className="text-center p-4">
                            <div className="text-[#e3dcd4] mb-2">No image selected</div>
                            <div className="text-[#7c4d33] text-sm">
                              Click button below to upload
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex flex-wrap gap-3 justify-center">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          ref={fileInputRef}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-4 py-2 rounded-full bg-[#7c4d33]/70 text-[#F5F1E6] hover:bg-[#7c4d33] transition-colors duration-300 text-sm font-suisse-intl-mono uppercase tracking-wider"
                        >
                          {imagePreview ? 'Change Image' : 'Upload Image'}
                        </button>
                        {imagePreview && (
                          <button
                            type="button"
                            onClick={() => {
                              setImagePreview(null);
                              setImageFile(null);
                              if (fileInputRef.current) {
                                fileInputRef.current.value = '';
                              }
                            }}
                            className="px-4 py-2 rounded-full bg-[#E67373]/20 text-[#E67373] hover:bg-[#E67373]/30 transition-colors duration-300 text-sm font-suisse-intl-mono uppercase tracking-wider"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <div className="mt-2 text-sm text-[#e3dcd4] text-center">
                        JPG, PNG, GIF (max 5MB)
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Music Files Section */}
                <div className="pt-6 border-t border-[#7c4d33]/30">
                  <h2 className="text-[#F5F1E6] text-xl font-suisse-intl mb-6">Music Files</h2>
                  
                  {/* Current Music (Edit Mode) */}
                  {isEditMode && card.music && card.music.length > 0 && (
                    <div className="mb-8">
                      <h3 className="text-[#D4AF37] text-lg font-suisse-intl-mono uppercase tracking-wider mb-4">Current Music</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {(card.music as Music[]).map((music) => (
                          <div key={music._id} className="flex justify-between items-center p-4 bg-[#7c4d33]/10 rounded-xl border border-[#7c4d33]/30 hover:border-[#7c4d33]/50 transition-colors duration-300">
                            <div className="flex-1 min-w-0">
                              <div className="text-[#F5F1E6] font-suisse-intl truncate pr-4">{music.title}</div>
                              <div className="text-xs text-[#e3dcd4] flex items-center mt-1">
                                <span className="mr-2 font-suisse-intl-mono">{formatDuration(music.duration)}</span>
                                <audio 
                                  controls 
                                  className="h-6 w-24 opacity-70 hover:opacity-100 transition-opacity"
                                >
                                  <source src={`${process.env.NEXT_PUBLIC_API_URL}${music.filePath}`} type="audio/mpeg" />
                                  Your browser does not support audio playback
                                </audio>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveMusic(music._id)}
                              className="text-[#E67373] hover:text-[#b35151] transition-colors ml-2 p-1"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* New Music Files */}
                  <div>
                    <h3 className="text-[#D4AF37] text-lg font-suisse-intl-mono uppercase tracking-wider mb-4">
                      {isEditMode ? 'Add More Music' : 'Add Music'}
                    </h3>
                    
                    {/* Music File Input */}
                    <div className="mb-6">
                      <input
                        type="file"
                        accept="audio/*"
                        onChange={handleMusicChange}
                        ref={musicInputRef}
                        className="hidden"
                        multiple
                      />
                      <div className="flex flex-wrap gap-4 items-center">
                        <button
                          type="button"
                          onClick={() => musicInputRef.current?.click()}
                          className="px-5 py-2.5 rounded-full bg-[#D4AF37] text-[#0A0A0A] hover:bg-[#b88c41] transition-colors duration-300 shadow-lg shadow-[#D4AF37]/20 text-sm font-suisse-intl-mono uppercase tracking-wider"
                        >
                          Select Music Files
                        </button>
                        <span className="text-sm text-[#e3dcd4]">
                          MP3, WAV, OGG (max 50MB each)
                        </span>
                      </div>
                    </div>
                    
                    {/* Music Files List */}
                    {musicFiles.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                        {musicFiles.map((file, index) => (
                          <div 
                            key={index} 
                            className="flex justify-between items-center p-4 bg-[#D4AF37]/10 rounded-xl border border-[#D4AF37]/30 hover:border-[#D4AF37]/50 transition-colors duration-300"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="text-[#F5F1E6] font-suisse-intl truncate pr-4">{file.name}</div>
                              <div className="text-xs text-[#D4AF37] font-suisse-intl-mono mt-1">
                                {(file.size / (1024 * 1024)).toFixed(2)} MB
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeMusicFile(index)}
                              className="text-[#E67373] hover:text-[#b35151] transition-colors ml-2 p-1"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
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
                      isEditMode ? 'Update Card' : 'Create Card'
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </AnimatedSection>
      </div>
    </div>
  );
}