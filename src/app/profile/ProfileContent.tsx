'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AnimatedSection } from '@/components/AnimatedSection';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { toast } from 'react-hot-toast';

interface ProfileFormData {
  name: string;
  surname: string;
  phone: string;
  address: string;
}

interface ProfileFormErrors {
  name: string;
  surname: string;
  phone: string;
  address: string;
}

export default function ProfileContent() {
  const { user, isAuthenticated, isAuthLoading, updateProfile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';
  
  const [formData, setFormData] = useState<ProfileFormData>({
    name: '',
    surname: '',
    phone: '',
    address: ''
  });
  
  const [errors, setErrors] = useState<ProfileFormErrors>({
    name: '',
    surname: '',
    phone: '',
    address: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(true);
  
  // Add animation keyframes
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
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
  
  // Redirect if not logged in
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.push('/login?redirect=/profile');
    }
  }, [isAuthenticated, isAuthLoading, router]);
  
  // Set initial form data when user data is loaded
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        surname: user.surname || '',
        phone: user.phone || '',
        address: user.address || ''
      });
      
      // If profile is complete, set editing mode to false
      if (user.profileComplete) {
        setIsEditing(false);
      }
    }
  }, [user]);
  
  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear errors when typing
    if (errors[name as keyof typeof errors]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };
  
  // Validate form
  const validateForm = () => {
    const newErrors = {
      name: '',
      surname: '',
      phone: '',
      address: ''
    };
    
    let isValid = true;
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
      isValid = false;
    }
    
    if (!formData.surname.trim()) {
      newErrors.surname = 'Surname is required';
      isValid = false;
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
      isValid = false;
    } else if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Please enter a valid 10-digit phone number';
      isValid = false;
    }
    
    // Address is optional, so no validation
    
    setErrors(newErrors);
    return isValid;
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const success = await updateProfile(formData);
      
      if (success) {
        setIsEditing(false);
        
        // If redirecting after profile completion
        if (redirect && redirect !== '/') {
          router.push(redirect);
        }
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isAuthLoading) {
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
      
      <AnimatedSection animation="fadeIn" className="max-w-2xl mx-auto px-6">
        <div className="bg-[#7c4d33]/40 border border-[#D4AF37]/20 backdrop-blur-md p-10 rounded-[40px] shadow-xl relative overflow-hidden">
          {/* Subtle radial gradient */}
          <div 
            className="absolute inset-0 opacity-30 pointer-events-none"
            style={{
              background: 'radial-gradient(circle at center, rgba(184, 140, 65, 0.4) 0%, rgba(10, 10, 10, 0.2) 70%)',
              animation: 'pulse 4s infinite ease-in-out'
            }}
          ></div>
          
          <div className="relative z-10">
            {/* Profile Title with golden glow */}
            <div className="text-center mb-10">
              <h1 
                className="text-5xl font-editorial-ultralight"
                style={{ 
                  background: 'linear-gradient(90deg, #D4AF37, #b88c41, #D4AF37)',
                  backgroundSize: '400% 100%',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  animation: 'shimmer 8s ease-in-out infinite',
                  textShadow: '0 0 20px rgba(212, 175, 55, 0.2)'
                }}
              >
                My Profile
              </h1>
              
              {/* Decorative line */}
              <div className="flex items-center justify-center mt-4">
                <div className="h-px w-16 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent"></div>
              </div>
              <p className="text-[#e3dcd4] font-suisse-intl-mono text-sm tracking-wide mt-3 opacity-70">
                PERSONAL INFORMATION
              </p>
            </div>
            
            {user && (
              <div>
                {/* Email (non-editable) */}
                <div className="mb-6">
                  <label className="block text-sm font-suisse-intl-mono uppercase mb-2 text-[#D4AF37]">
                    Email
                  </label>
                  <div className="bg-[#0A0A0A]/80 border border-[#D4AF37]/30 rounded-2xl px-5 py-4 text-[#F5F1E6] font-suisse-intl">
                    {user.email}
                  </div>
                </div>
                
                {/* Age (non-editable) */}
                <div className="mb-8">
                  <label className="block text-sm font-suisse-intl-mono uppercase mb-2 text-[#D4AF37]">
                    Age
                  </label>
                  <div className="bg-[#0A0A0A]/80 border border-[#D4AF37]/30 rounded-2xl px-5 py-4 text-[#F5F1E6] font-suisse-intl">
                    {user.age} years old
                  </div>
                </div>
                
                {/* Decorative separator */}
                <div className="h-px w-full bg-gradient-to-r from-transparent via-[#D4AF37]/30 to-transparent my-8"></div>
                
                <form onSubmit={handleSubmit}>
                  {/* Name - custom styled input */}
                  <div className="mb-5">
                    <label className="block text-sm font-suisse-intl-mono uppercase mb-2 text-[#D4AF37]">
                      Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className={`bg-[#0A0A0A]/80 border ${errors.name ? 'border-[#E67373]' : 'border-[#D4AF37]/30'} 
                      text-[#F5F1E6] rounded-2xl px-5 py-4 w-full focus:outline-none focus:ring-2 
                      focus:ring-[#D4AF37]/50 transition duration-300 font-suisse-intl 
                      ${!isEditing ? 'opacity-75' : ''}`}
                    />
                    {errors.name && (
                      <p className="mt-1 text-[#E67373] text-sm">{errors.name}</p>
                    )}
                  </div>
                  
                  {/* Surname */}
                  <div className="mb-5">
                    <label className="block text-sm font-suisse-intl-mono uppercase mb-2 text-[#D4AF37]">
                      Surname
                    </label>
                    <input
                      type="text"
                      name="surname"
                      value={formData.surname}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className={`bg-[#0A0A0A]/80 border ${errors.surname ? 'border-[#E67373]' : 'border-[#D4AF37]/30'} 
                      text-[#F5F1E6] rounded-2xl px-5 py-4 w-full focus:outline-none focus:ring-2 
                      focus:ring-[#D4AF37]/50 transition duration-300 font-suisse-intl
                      ${!isEditing ? 'opacity-75' : ''}`}
                    />
                    {errors.surname && (
                      <p className="mt-1 text-[#E67373] text-sm">{errors.surname}</p>
                    )}
                  </div>
                  
                  {/* Phone */}
                  <div className="mb-5">
                    <label className="block text-sm font-suisse-intl-mono uppercase mb-2 text-[#D4AF37]">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className={`bg-[#0A0A0A]/80 border ${errors.phone ? 'border-[#E67373]' : 'border-[#D4AF37]/30'} 
                      text-[#F5F1E6] rounded-2xl px-5 py-4 w-full focus:outline-none focus:ring-2 
                      focus:ring-[#D4AF37]/50 transition duration-300 font-suisse-intl
                      ${!isEditing ? 'opacity-75' : ''}`}
                    />
                    {errors.phone && (
                      <p className="mt-1 text-[#E67373] text-sm">{errors.phone}</p>
                    )}
                  </div>
                  
                  {/* Address */}
                  <div className="mb-6">
                    <label className="block text-sm font-suisse-intl-mono uppercase mb-2 text-[#D4AF37]">
                      Address <span className="text-[#e3dcd4]/50">(Optional)</span>
                    </label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      disabled={!isEditing}
                      className={`bg-[#0A0A0A]/80 border border-[#D4AF37]/30 text-[#F5F1E6] 
                      rounded-2xl px-5 py-4 w-full focus:outline-none focus:ring-2 
                      focus:ring-[#D4AF37]/50 transition duration-300 font-suisse-intl
                      min-h-[120px] ${!isEditing ? 'opacity-75' : ''}`}
                    />
                  </div>
                  
                  {/* Decorative separator */}
                  <div className="h-px w-full bg-gradient-to-r from-transparent via-[#D4AF37]/30 to-transparent my-8"></div>
                  
                  <div className="flex justify-end space-x-4 mt-6">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            // If user has never saved profile, don't allow canceling
                            if (user.profileComplete) {
                              setIsEditing(false);
                              // Reset form data
                              setFormData({
                                name: user.name || '',
                                surname: user.surname || '',
                                phone: user.phone || '',
                                address: user.address || ''
                              });
                            }
                          }}
                          disabled={!user.profileComplete}
                          className={`px-6 py-3 rounded-full text-[#e3dcd4] border border-[#D4AF37]/30 
                          hover:bg-[#0A0A0A]/30 transition-all duration-300 font-suisse-intl-mono text-sm tracking-wide
                          ${!user.profileComplete ? 'opacity-50 cursor-not-allowed' : 'hover:border-[#D4AF37]'}`}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-8 py-3 rounded-full bg-[#D4AF37] text-[#0A0A0A] 
                          hover:bg-[#b88c41] transition-all duration-300 font-suisse-intl-mono text-sm
                          tracking-wide flex items-center justify-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <>
                              <span className="mr-2 w-4 h-4 border-2 border-[#0A0A0A] border-t-transparent rounded-full animate-spin"></span>
                              Saving...
                            </>
                          ) : (
                            'Save Profile'
                          )}
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="px-8 py-3 rounded-full bg-[#D4AF37] text-[#0A0A0A] 
                        hover:bg-[#b88c41] transition-all duration-300 font-suisse-intl-mono text-sm tracking-wide
                        shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                      >
                        Edit Profile
                      </button>
                    )}
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </AnimatedSection>
    </div>
  );
}