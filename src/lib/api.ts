import { toast } from 'react-hot-toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Generic fetch function with authentication
async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  // Get token from localStorage
  const token = localStorage.getItem('token');
  
  // Prepare headers
  let headers: HeadersInit = {};
  
  // Check if the body is FormData
  const isFormData = options.body instanceof FormData;
  
  // Only set Content-Type if the body is not FormData
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  
  // Add other headers from options
  if (options.headers) {
    headers = { ...headers, ...options.headers };
  }
  
  // Add authorization if token exists
  if (token) {
    headers = {
      ...headers,
      'Authorization': `Bearer ${token}`
    } as HeadersInit;
  }
  
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });
    
    // Handle 401 Unauthorized
    if (response.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('token');
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
        toast.error('Session expired. Please log in again.');
      }
      throw new Error('Unauthorized');
    }
    
    // Try to parse response as JSON
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    
    if (!response.ok) {
      throw new Error(typeof data === 'object' && data.message ? data.message : 'Something went wrong');
    }
    
    return data;
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    throw error;
  }
}

// Products API
export const ProductAPI = {
  // Get all products
  getAll: async (category?: string, featured?: boolean) => {
    let query = '';
    if (category) query += `category=${encodeURIComponent(category)}&`;
    if (featured !== undefined) query += `featured=${featured}&`;
    
    // Remove trailing '&' if present
    query = query.replace(/&$/, '');
    
    return fetchWithAuth(`/api/products${query ? `?${query}` : ''}`);
  },
  
  // Get featured products
  getFeatured: async () => {
    return fetchWithAuth('/api/products/featured');
  },
  
  // Get product by ID
  getById: async (id: string) => {
    return fetchWithAuth(`/api/products/${id}`);
  },
  
  // Create a new product
  create: async (productData: FormData) => {
    try {
      // แสดงข้อมูลที่กำลังส่งไป (สำหรับ debug)
      if (process.env.NODE_ENV !== 'production') {
        console.log('FormData entries:');
        for (let [key, value] of productData.entries()) {
          console.log(`${key}: ${value}`);
        }
      }
      
      return fetchWithAuth('/api/products', {
        method: 'POST',
        body: productData,
      });
    } catch (error) {
      console.error('API error in create product:', error);
      throw error;
    }
  },
  
  // Update a product
  update: async (id: string, productData: FormData) => {
    try {
      // แสดงข้อมูลที่กำลังส่งไป (สำหรับ debug)
      if (process.env.NODE_ENV !== 'production') {
        console.log('FormData entries for update:');
        for (let [key, value] of productData.entries()) {
          console.log(`${key}: ${value}`);
        }
      }
      
      return fetchWithAuth(`/api/products/${id}`, {
        method: 'PUT',
        body: productData,
      });
    } catch (error) {
      console.error('API error in update product:', error);
      throw error;
    }
  },
  
  // Delete a product
  delete: async (id: string) => {
    return fetchWithAuth(`/api/products/${id}`, {
      method: 'DELETE',
    });
  },
};

// Orders API
export const OrderAPI = {
  // Create a new order
  create: async (orderData: any) => {
    return fetchWithAuth('/api/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  },
  
  // Get orders for the logged-in user
  getMyOrders: async () => {
    return fetchWithAuth('/api/orders/myorders');
  },
  
  // Get an order by ID
  getById: async (id: string) => {
    return fetchWithAuth(`/api/orders/${id}`);
  },
  
  // Verify payment for an order
  verifyPayment: async (sessionId: string) => {
    return fetchWithAuth(`/api/orders/verify-payment/${sessionId}`);
  },
  
  // Admin only: Get all orders
  getAll: async () => {
    return fetchWithAuth('/api/orders');
  },
  
  // Admin only: Update an order's status with optional tracking number
  updateStatus: async (id: string, status: string, trackingNumber?: string) => {
    const data = trackingNumber !== undefined 
      ? { status, trackingNumber } 
      : { status };
    
    return fetchWithAuth(`/api/orders/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  
  // Admin only: Update tracking number only
  updateTrackingNumber: async (id: string, trackingNumber: string) => {
    return fetchWithAuth(`/api/orders/${id}/tracking`, {
      method: 'PUT',
      body: JSON.stringify({ trackingNumber }),
    });
  },
};

// Upload API
export const UploadAPI = {
  // Upload a single file
  uploadSingle: async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    
    return fetchWithAuth('/api/upload', {
      method: 'POST',
      body: formData,
    });
  },
  
  // Upload multiple files
  uploadMultiple: async (files: File[]) => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('images', file);
    });
    
    return fetchWithAuth('/api/upload/multiple', {
      method: 'POST',
      body: formData,
    });
  },
};

// Auth API
export const AuthAPI = {
  // Google login
  googleLogin: async (token: string, birthYear: number) => {
    return fetchWithAuth('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ token, birthYear }),
    });
  },
  
  // Get current user profile
  getProfile: async () => {
    return fetchWithAuth('/api/auth/profile');
  },
  
  // Update user profile
  updateProfile: async (profileData: any) => {
    return fetchWithAuth('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  },
  
  // Prepare login (validate birth year)
  prepareLogin: async (birthYear: number) => {
    return fetchWithAuth('/api/auth/prepare', {
      method: 'POST',
      body: JSON.stringify({ birthYear }),
    });
  },
};

export default {
  ProductAPI,
  OrderAPI,
  UploadAPI,
  AuthAPI,
};