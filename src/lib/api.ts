//src/lib/api.ts

import { toast } from 'react-hot-toast';
import { safeStorage } from '@/lib/safeStorage';
import { roundProductPrice } from '@/lib/productPrice';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export class SessionExpiredError extends Error {
  constructor() {
    super('Session expired. Sign in in a new tab, then retry. Your form is still here.');
    this.name = 'SessionExpiredError';
  }
}

export interface ProductMutation {
  name: string;
  price: number;
  weight: number;
  description: string;
  category: string;
  isFeatured: boolean;
  isOutOfStock: boolean;
  images: string[];
  shippingPackagingGrams?: number | null;
  internationalShippingCountries?: string[];
}

// Generic fetch function with authentication
async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  // Get token from localStorage
  const token = safeStorage.get('token');
  
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
      if (token) {
        // Keep the current page and its unsaved form/files mounted. Admins can
        // sign in in another tab, then retry without recreating their work.
        safeStorage.remove('token');
      }
      toast.error('Sign in in a new tab, then retry.', { id: 'session-expired' });
      throw new SessionExpiredError();
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
async function fetchProducts(endpoint: string) {
  // These catalogue reads are public. Authentication/JSON headers caused an
  // unnecessary cross-origin preflight before every catalogue request.
  const response = await fetch(`${API_URL}${endpoint}`, { signal: AbortSignal.timeout(15_000) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Unable to load products. Please try again.');
  if (data.product) data.product.price = roundProductPrice(data.product.price);
  if (data.products) data.products = data.products.map((product: { price: number }) => ({ ...product, price: roundProductPrice(product.price) }));
  return data;
}

export const ProductAPI = {
  // Get all products
  getAll: async (category?: string, featured?: boolean) => {
    let query = '';
    if (category) query += `category=${encodeURIComponent(category)}&`;
    if (featured !== undefined) query += `featured=${featured}&`;
    
    // Remove trailing '&' if present
    query = query.replace(/&$/, '');
    
    return fetchProducts(`/api/products${query ? `?${query}` : ''}`);
  },
  
  // Get featured products
  getFeatured: async () => {
    return fetchProducts('/api/products/featured');
  },
  
  // Get product by ID
  getById: async (id: string) => {
    return fetchProducts(`/api/products/${id}`);
  },
  
  // Create a new product
  create: async (productData: ProductMutation) => {
    return fetchWithAuth('/api/products', {
      method: 'POST',
      body: JSON.stringify(productData),
      signal: AbortSignal.timeout(30_000),
    });
  },
  
  // Update a product
  update: async (id: string, productData: ProductMutation) => {
    return fetchWithAuth(`/api/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(productData),
      signal: AbortSignal.timeout(30_000),
    });
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
  getShippingCountries: async () => {
    const response = await fetch(`${API_URL}/api/orders/shipping-countries`, { signal: AbortSignal.timeout(15_000) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Unable to load shipping destinations.');
    return data as { countries: string[] };
  },

  getShippingQuote: async (orderItems: { product: string; quantity: number }[], destinationCountry: string, signal: AbortSignal) => {
    return fetchWithAuth('/api/orders/shipping-quote', {
      method: 'POST',
      body: JSON.stringify({ orderItems, destinationCountry }),
      signal,
    });
  },

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
  
  // Retry payment for unpaid order
  retryPayment: async (id: string) => {
    return fetchWithAuth(`/api/orders/${id}/retry-payment`, {
      method: 'POST',
    });
  },
  
  // Cancel order (only for unpaid orders)
  cancel: async (id: string) => {
    return fetchWithAuth(`/api/orders/${id}/cancel`, {
      method: 'PUT',
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
      signal: AbortSignal.timeout(60_000),
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

// Tickets API
export const TicketAPI = {
  // Create a new ticket booking
  create: async (ticketData: any) => {
    return fetchWithAuth('/api/tickets', {
      method: 'POST',
      body: JSON.stringify(ticketData),
    });
  },
  
  // Get user's tickets
  getMyTickets: async () => {
    return fetchWithAuth('/api/tickets/my-tickets');
  },
  
  // Get a ticket by ID
  getById: async (id: string) => {
    return fetchWithAuth(`/api/tickets/${id}`);
  },
  
  // Update ticket status (for payment completion)
  updateStatus: async (id: string, status: string, paymentId?: string) => {
    const data = paymentId ? { status, paymentId } : { status };
    
    return fetchWithAuth(`/api/tickets/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  
  // Cancel ticket
  cancel: async (id: string) => {
    return fetchWithAuth(`/api/tickets/${id}`, {
      method: 'DELETE',
    });
  },
  
  // Create ticket checkout session
  createCheckoutSession: async (ticketId: string) => {
    return fetchWithAuth('/api/tickets/checkout-session', {
      method: 'POST',
      body: JSON.stringify({ ticketId }),
    });
  },
  
  // Verify ticket payment
  verifyPayment: async (sessionId: string) => {
    return fetchWithAuth(`/api/tickets/verify-payment/${sessionId}`);
  },
  
  // Admin only: Get all tickets
  getAll: async () => {
    return fetchWithAuth('/api/tickets/admin/all');
  },
};

// Discounts API
export const DiscountAPI = {
  // Validate discount code
  validate: async (code: string, totalAmount: number) => {
    return fetchWithAuth('/api/discounts/validate', {
      method: 'POST',
      body: JSON.stringify({ code, totalAmount }),
    });
  },
  
  // Admin only: Get all discounts
  getAll: async () => {
    return fetchWithAuth('/api/discounts');
  },
  
  // Admin only: Get discount by ID
  getById: async (id: string) => {
    return fetchWithAuth(`/api/discounts/${id}`);
  },
  
  // Admin only: Create discount
  create: async (discountData: any) => {
    return fetchWithAuth('/api/discounts', {
      method: 'POST',
      body: JSON.stringify(discountData),
    });
  },
  
  // Admin only: Update discount
  update: async (id: string, discountData: any) => {
    return fetchWithAuth(`/api/discounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(discountData),
    });
  },
  
  // Admin only: Delete discount
  delete: async (id: string) => {
    return fetchWithAuth(`/api/discounts/${id}`, {
      method: 'DELETE',
    });
  },
  
  // Admin only: Toggle discount active status
  toggle: async (id: string) => {
    return fetchWithAuth(`/api/discounts/${id}/toggle`, {
      method: 'PUT',
    });
  },
};


export default {
  ProductAPI,
  OrderAPI,
  UploadAPI,
  AuthAPI,
  TicketAPI,
  DiscountAPI,
};
