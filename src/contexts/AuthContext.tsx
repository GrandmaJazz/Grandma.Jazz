'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

// Define types
export interface User {
  _id: string;
  email: string;
  name: string;
  surname: string;
  age: number;
  birthYear: number;
  phone: string;
  address: string;
  isAdmin: boolean;
  profileComplete: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  isAdmin: boolean;
  birthYear: number | null;
  setBirthYear: (year: number) => void;
  loginWithGoogle: (token: string) => Promise<void>;
  logout: () => void;
  updateProfile: (profileData: Partial<User>) => Promise<boolean>;
  checkAuthentication: () => Promise<boolean>;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Create provider
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [birthYear, setBirthYear] = useState<number | null>(null);
  
  const router = useRouter();

  // Check if user is logged in on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
      fetchUserProfile(storedToken);
    } else {
      setIsAuthLoading(false);
    }
  }, []);

  // Fetch user profile from API
  const fetchUserProfile = async (authToken: string) => {
    try {
      setIsAuthLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        // If token is invalid, log out
        localStorage.removeItem('token');
        setToken(null);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Login with Google
  const loginWithGoogle = async (googleToken: string) => {
    try {
      setIsAuthLoading(true);
      
      // Validate birth year
      if (!birthYear) {
        toast.error('Please enter your birth year before logging in');
        setIsAuthLoading(false);
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: googleToken, birthYear }),
      });

      const data = await response.json();

      if (response.ok) {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('token', data.token);
        
        // If new user, redirect to profile page to complete profile
        if (data.isNewUser || !data.user.profileComplete) {
          router.push('/profile');
          toast.success('Please complete your profile information');
        } else {
          toast.success('Login successful!');
          router.push('/');
        }
      } else {
        toast.error(data.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('An error occurred during login');
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Logout
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    toast.success('Logged out successfully');
    router.push('/');
  };

  // Update user profile
  const updateProfile = async (profileData: Partial<User>) => {
    try {
      setIsAuthLoading(true);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(profileData),
      });

      const data = await response.json();

      if (response.ok) {
        setUser(data.user);
        toast.success('Profile updated successfully');
        return true;
      } else {
        toast.error(data.message || 'Failed to update profile');
        return false;
      }
    } catch (error) {
      console.error('Update profile error:', error);
      toast.error('An error occurred while updating your profile');
      return false;
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Check if user is authenticated
  const checkAuthentication = async (): Promise<boolean> => {
    if (token && user) return true;
    
    const storedToken = localStorage.getItem('token');
    if (!storedToken) return false;
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${storedToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setToken(storedToken);
        setUser(data.user);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Authentication check error:', error);
      return false;
    }
  };

  // Context value
  const value = {
    user,
    token,
    isAuthenticated: !!user,
    isAuthLoading,
    isAdmin: user?.isAdmin || false,
    birthYear,
    setBirthYear,
    loginWithGoogle,
    logout,
    updateProfile,
    checkAuthentication,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}