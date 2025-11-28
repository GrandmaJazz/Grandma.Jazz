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
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes scaleIn {
        from { transform: scale(0.95); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
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
      router.push('/');
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
        <div className="w-12 h-12 border-4 border-[#F5F1E6] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  return (
    <div 
      className="min-h-screen pt-28 pb-16 bg-[#0A0A0A] flex items-center justify-center p-4"
      style={{ animation: 'fadeIn 0.3s ease-out' }}
    >
      {/* Subtle texture overlay */}
      <div 
        className="absolute inset-0 opacity-5 mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundSize: '100px',
          backgroundRepeat: 'repeat'
        }}
      />
      
      {/* Profile Card */}
      <div 
        className="bg-[#F5F1E6] border border-[#0A0A0A]/10 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden relative"
        style={{ animation: 'scaleIn 0.3s ease-out' }}
      >
        <div className="relative z-10 p-10">
          {user && (
            <div>
              {/* Profile Title */}
              <div className="text-center mb-10">
                <h1 className="text-5xl font-editorial-ultralight text-[#0A0A0A]">
                  My Profile
                </h1>
                
                {/* Decorative line */}
                <div className="flex items-center justify-center mt-4">
                  <div className="h-px w-16 bg-[#0A0A0A]/30"></div>
                </div>
                <p className="text-[#0A0A0A]/70 font-suisse-intl-mono text-sm tracking-wide mt-3">
                  PERSONAL INFORMATION
                </p>
              </div>
              
              {/* Email (non-editable) */}
              <div className="mb-6">
                <label className="block text-sm font-suisse-intl-mono uppercase mb-2 text-[#0A0A0A]">
                  Email
                </label>
                <div className="bg-[#0A0A0A]/10 border border-[#0A0A0A]/20 rounded-2xl px-5 py-4 text-[#0A0A0A] font-suisse-intl">
                  {user.email}
                </div>
              </div>
              
              {/* Age (non-editable) - showing "Over 20" */}
              <div className="mb-8">
                <label className="block text-sm font-suisse-intl-mono uppercase mb-2 text-[#0A0A0A]">
                  Age
                </label>
                <div className="bg-[#0A0A0A]/10 border border-[#0A0A0A]/20 rounded-2xl px-5 py-4 text-[#0A0A0A] font-suisse-intl">
                  Over 20 Years
                </div>
              </div>
              
              {/* Decorative separator */}
              <div className="h-px w-full bg-[#0A0A0A]/20 my-8"></div>
              
              <form onSubmit={handleSubmit}>
                {/* Name */}
                <div className="mb-5">
                  <label className="block text-sm font-suisse-intl-mono uppercase mb-2 text-[#0A0A0A]">
                    Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className={`bg-[#0A0A0A]/10 border ${errors.name ? 'border-red-500' : 'border-[#0A0A0A]/20'} 
                    text-[#0A0A0A] rounded-2xl px-5 py-4 w-full focus:outline-none focus:ring-2 
                    focus:ring-[#0A0A0A]/30 focus:border-[#0A0A0A]/40 transition duration-300 font-suisse-intl 
                    ${!isEditing ? 'opacity-60' : ''} placeholder-[#0A0A0A]/40`}
                    placeholder="Enter your first name"
                  />
                  {errors.name && (
                    <p className="mt-1 text-red-500 text-sm">{errors.name}</p>
                  )}
                </div>
                
                {/* Surname */}
                <div className="mb-5">
                  <label className="block text-sm font-suisse-intl-mono uppercase mb-2 text-[#0A0A0A]">
                    Surname
                  </label>
                  <input
                    type="text"
                    name="surname"
                    value={formData.surname}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className={`bg-[#0A0A0A]/10 border ${errors.surname ? 'border-red-500' : 'border-[#0A0A0A]/20'} 
                    text-[#0A0A0A] rounded-2xl px-5 py-4 w-full focus:outline-none focus:ring-2 
                    focus:ring-[#0A0A0A]/30 focus:border-[#0A0A0A]/40 transition duration-300 font-suisse-intl
                    ${!isEditing ? 'opacity-60' : ''} placeholder-[#0A0A0A]/40`}
                    placeholder="Enter your last name"
                  />
                  {errors.surname && (
                    <p className="mt-1 text-red-500 text-sm">{errors.surname}</p>
                  )}
                </div>
                
                {/* Phone */}
                <div className="mb-5">
                  <label className="block text-sm font-suisse-intl-mono uppercase mb-2 text-[#0A0A0A]">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className={`bg-[#0A0A0A]/10 border ${errors.phone ? 'border-red-500' : 'border-[#0A0A0A]/20'} 
                    text-[#0A0A0A] rounded-2xl px-5 py-4 w-full focus:outline-none focus:ring-2 
                    focus:ring-[#0A0A0A]/30 focus:border-[#0A0A0A]/40 transition duration-300 font-suisse-intl
                    ${!isEditing ? 'opacity-60' : ''} placeholder-[#0A0A0A]/40`}
                    placeholder="Enter your phone number"
                  />
                  {errors.phone && (
                    <p className="mt-1 text-red-500 text-sm">{errors.phone}</p>
                  )}
                </div>
                
                {/* Address */}
                <div className="mb-6">
                  <label className="block text-sm font-suisse-intl-mono uppercase mb-2 text-[#0A0A0A]">
                    Address <span className="text-[#0A0A0A]/50">(Optional)</span>
                  </label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    disabled={!isEditing}
                    className={`bg-[#0A0A0A]/10 border border-[#0A0A0A]/20 text-[#0A0A0A] 
                    rounded-2xl px-5 py-4 w-full focus:outline-none focus:ring-2 
                    focus:ring-[#0A0A0A]/30 focus:border-[#0A0A0A]/40 transition duration-300 font-suisse-intl
                    min-h-[120px] ${!isEditing ? 'opacity-60' : ''} placeholder-[#0A0A0A]/40`}
                    placeholder="Enter your address"
                  />
                </div>
                
                {/* Decorative separator */}
                <div className="h-px w-full bg-[#0A0A0A]/20 my-8"></div>
                
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
                        className={`px-8 py-3 border-2 border-[#0A0A0A] text-[#0A0A0A] rounded-full 
                        hover:bg-[#0A0A0A] hover:text-[#F5F1E6] transition-all duration-300 
                        font-suisse-intl-mono text-sm uppercase tracking-widest
                        shadow-lg hover:shadow-xl transform hover:-translate-y-1 min-w-[120px]
                        ${!user.profileComplete ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-8 py-3 bg-[#0A0A0A] text-[#F5F1E6] rounded-full hover:bg-[#0A0A0A]/90 
                        transition-all duration-300 font-suisse-intl-mono text-sm uppercase tracking-widest
                        shadow-lg hover:shadow-xl transform hover:-translate-y-1 min-w-[120px]
                        flex items-center justify-center"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <span className="mr-2 w-4 h-4 border-2 border-[#F5F1E6] border-t-transparent rounded-full animate-spin"></span>
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
                      className="px-8 py-3 bg-[#0A0A0A] text-[#F5F1E6] rounded-full hover:bg-[#0A0A0A]/90 
                      transition-all duration-300 font-suisse-intl-mono text-sm uppercase tracking-widest
                      shadow-lg hover:shadow-xl transform hover:-translate-y-1 min-w-[120px]"
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
    </div>
  );
}