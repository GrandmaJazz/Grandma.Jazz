//src/app/admin/products/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ProductAPI } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { AnimatedSection } from '@/components/AnimatedSection';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

interface Product {
  _id: string;
  name: string;
  price: number;
  description: string;
  category: string;
  images: string[];
  isOutOfStock: boolean;
  isFeatured: boolean;
}

export default function AdminProductsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showOutOfStock, setShowOutOfStock] = useState(
    searchParams.get('outOfStock') === 'true'
  );
  const [showFeatured, setShowFeatured] = useState(
    searchParams.get('featured') === 'true'
  );
  
  const categories = [
    { id: 'all', name: 'All Products' },
    { id: 'vinyl', name: 'Vinyl Records' },
    { id: 'cds', name: 'CDs' },
    { id: 'merchandise', name: 'Merchandise' },
    { id: 'instruments', name: 'Instruments' }
  ];
  
  // Fetch products
  useEffect(() => {
    async function fetchProducts() {
      setIsLoading(true);
      try {
        // Build query parameters
        const category = selectedCategory === 'all' ? undefined : selectedCategory;
        const featured = showFeatured ? true : undefined;
        
        const data = await ProductAPI.getAll(category, featured);
        
        // Filter by out of stock if needed
        const filteredProducts = showOutOfStock
          ? data.products.filter((p: Product) => p.isOutOfStock)
          : data.products;
        
        setProducts(filteredProducts);
      } catch (error) {
        console.error('Error fetching products:', error);
        toast.error('Failed to load products');
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchProducts();
  }, [selectedCategory, showOutOfStock, showFeatured]);
  
  
  // Handle product delete
  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) {
      return;
    }
    
    try {
      await ProductAPI.delete(id);
      setProducts(products.filter(p => p._id !== id));
      toast.success('Product deleted successfully');
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product');
    }
  };
  
// Toggle product featured status
const handleToggleFeatured = async (product: Product) => {
  try {
    // Check if we're trying to add a new featured product
    if (!product.isFeatured) {
      // Count current featured products
      const featuredCount = products.filter(p => p.isFeatured).length;
      
      if (featuredCount >= 4) {
        toast.error('You can only have up to 4 featured products');
        return;
      }
    }
    
    // ข้อมูลที่จะอัพเดต
    const updatedProduct = {
      ...product,
      isFeatured: !product.isFeatured
    };
    
    // ส่งข้อมูลเป็น JSON แทน FormData
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products/${product._id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(updatedProduct)
    });
    
    if (!response.ok) {
      throw new Error('Failed to update product');
    }
    
    // Update local state
    setProducts(
      products.map(p => (p._id === product._id ? { ...p, isFeatured: !p.isFeatured } : p))
    );
    
  } catch (error) {
    console.error('Error updating product:', error);
    toast.error('Failed to update product');
  }
};
  
// Toggle product stock status
const handleToggleStock = async (product: Product) => {
  try {
    // ข้อมูลที่จะอัพเดต
    const updatedProduct = {
      ...product,
      isOutOfStock: !product.isOutOfStock
    };
    
    // ส่งข้อมูลเป็น JSON แทน FormData
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products/${product._id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(updatedProduct)
    });
    
    if (!response.ok) {
      throw new Error('Failed to update product');
    }
    
    // Update local state
    setProducts(
      products.map(p => (p._id === product._id ? { ...p, isOutOfStock: !p.isOutOfStock } : p))
    );
    
  } catch (error) {
    console.error('Error updating product:', error);
    toast.error('Failed to update product');
  }
};
  
  return (
    <div>
      {/* Header Section - เพิ่ม flex-col ในหน้าจอเล็ก */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-3xl font-editorial-ultralight text-[#F5F1E6]">
          Products <span className="text-[#D4AF37]">Management</span>
        </h1>
        
        <Link href="/admin/products/new">
          <Button size="sm" className="w-full sm:w-auto">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Add New Product
          </Button>
        </Link>
      </div>
      
      {/* Filters */}
      <AnimatedSection animation="fadeIn" className="mb-6">
        <div className="bg-[#0A0A0A] p-4 sm:p-5 rounded-3xl border border-[#7c4d33]/30">
          <div className="flex flex-col space-y-4">
            {/* Category Filter */}
            <div>
              <label className="block text-[#e3dcd4] text-sm font-suisse-intl-mono mb-2">
                Filter by Category
              </label>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`px-3 py-1 text-xs font-suisse-intl-mono uppercase transition-colors rounded-full ${
                      selectedCategory === category.id
                        ? 'bg-[#D4AF37] text-[#0A0A0A]'
                        : 'bg-[#0A0A0A] border border-[#D4AF37]/30 text-[#F5F1E6] hover:bg-[#7c4d33]/30'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Status Filters - เปลี่ยนเป็น grid รองรับหน้าจอเล็ก */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:flex gap-2 sm:gap-4">
              <button
                onClick={() => setShowOutOfStock(!showOutOfStock)}
                className={`px-3 py-1 text-xs font-suisse-intl-mono uppercase transition-colors rounded-full ${
                  showOutOfStock
                    ? 'bg-[#E67373]/20 text-[#E67373] border border-[#E67373]/30'
                    : 'bg-[#0A0A0A] border border-[#D4AF37]/30 text-[#F5F1E6] hover:bg-[#7c4d33]/30'
                }`}
              >
                {showOutOfStock ? 'Showing Out of Stock' : 'Show Out of Stock'}
              </button>
              
              <button
                onClick={() => setShowFeatured(!showFeatured)}
                className={`px-3 py-1 text-xs font-suisse-intl-mono uppercase transition-colors rounded-full ${
                  showFeatured
                    ? 'bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30'
                    : 'bg-[#0A0A0A] border border-[#D4AF37]/30 text-[#F5F1E6] hover:bg-[#7c4d33]/30'
                }`}
              >
                {showFeatured ? 'Showing Featured' : 'Show Featured'}
              </button>
            </div>
          </div>
        </div>
      </AnimatedSection>
      
      {/* Products Table */}
      <AnimatedSection animation="fadeIn">
        <div className="bg-[#0A0A0A] rounded-3xl overflow-hidden border border-[#7c4d33]/30">
          {isLoading ? (
            <div className="py-16 flex justify-center">
              <div className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : products.length === 0 ? (
            <div className="py-16 text-center px-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-[#7c4d33] mb-4">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                <line x1="12" y1="22.08" x2="12" y2="12"></line>
              </svg>
              <p className="text-[#e3dcd4] font-suisse-intl mb-4">No products found</p>
              <Link href="/admin/products/new">
                <Button className="w-full sm:w-auto">Add New Product</Button>
              </Link>
            </div>
          ) : (
            <div>
              {/* Table for medium screens and up */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs font-suisse-intl-mono uppercase text-[#e3dcd4] bg-[#0A0A0A]">
                    <tr>
                      <th className="px-6 py-3">Image</th>
                      <th className="px-6 py-3">Product</th>
                      <th className="px-6 py-3">Category</th>
                      <th className="px-6 py-3">Price</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Featured</th>
                      <th className="px-6 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr key={product._id} className="border-b border-[#7c4d33]/30 hover:bg-[#7c4d33]/10 transition-colors">
                        <td className="px-6 py-4">
                          <div className="relative w-16 h-16 rounded-2xl overflow-hidden">
                            <Image
                              src={product.images[0] || '/images/placeholder-product.jpg'}
                              alt={product.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                        </td>
                        <td className="px-6 py-4 text-[#F5F1E6] font-suisse-intl">
                          {product.name}
                        </td>
                        <td className="px-6 py-4 text-[#e3dcd4]">
                          {product.category}
                        </td>
                        <td className="px-6 py-4 text-[#D4AF37] font-suisse-intl-mono">
                          ฿{product.price.toFixed(2)}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleToggleStock(product)}
                            className={`px-2 py-1 rounded-full text-xs font-suisse-intl-mono ${
                              product.isOutOfStock
                                ? 'bg-[#E67373]/20 text-[#E67373]'
                                : 'bg-[#7EB47E]/20 text-[#7EB47E]'
                            }`}
                          >
                            {product.isOutOfStock ? 'Out of Stock' : 'In Stock'}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleToggleFeatured(product)}
                            className={`px-2 py-1 rounded-full text-xs font-suisse-intl-mono ${
                              product.isFeatured
                                ? 'bg-[#D4AF37]/20 text-[#D4AF37]'
                                : 'bg-[#0A0A0A] border border-[#7c4d33]/30 text-[#e3dcd4]'
                            }`}
                          >
                            {product.isFeatured ? 'Featured' : 'Regular'}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex space-x-2">
                            <Link 
                              href={`/admin/products/${product._id}/edit`}
                              className="text-[#e3dcd4] hover:text-[#D4AF37] transition-colors"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                              </svg>
                            </Link>
                            <button
                              onClick={() => handleDeleteProduct(product._id)}
                              className="text-[#E67373] hover:text-[#E67373]/80 transition-colors"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                <line x1="10" y1="11" x2="10" y2="17"></line>
                                <line x1="14" y1="11" x2="14" y2="17"></line>
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Card view for small screens */}
              <div className="md:hidden">
                <div className="grid grid-cols-1 gap-4 p-4">
                  {products.map((product) => (
                    <div key={product._id} className="bg-[#0A0A0A] p-4 rounded-2xl border border-[#7c4d33]/30">
                      <div className="flex items-center mb-3">
                        <div className="relative w-16 h-16 rounded-xl overflow-hidden mr-3">
                          <Image
                            src={product.images[0] || '/images/placeholder-product.jpg'}
                            alt={product.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-[#F5F1E6] font-suisse-intl font-medium truncate">{product.name}</h3>
                          <p className="text-[#D4AF37] font-suisse-intl-mono">฿{product.price.toFixed(2)}</p>
                          <p className="text-[#e3dcd4] text-xs">{product.category}</p>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 my-3">
                        <button
                          onClick={() => handleToggleStock(product)}
                          className={`px-2 py-1 rounded-full text-xs font-suisse-intl-mono ${
                            product.isOutOfStock
                              ? 'bg-[#E67373]/20 text-[#E67373]'
                              : 'bg-[#7EB47E]/20 text-[#7EB47E]'
                          }`}
                        >
                          {product.isOutOfStock ? 'Out of Stock' : 'In Stock'}
                        </button>
                        
                        <button
                          onClick={() => handleToggleFeatured(product)}
                          className={`px-2 py-1 rounded-full text-xs font-suisse-intl-mono ${
                            product.isFeatured
                              ? 'bg-[#D4AF37]/20 text-[#D4AF37]'
                              : 'bg-[#0A0A0A] border border-[#7c4d33]/30 text-[#e3dcd4]'
                          }`}
                        >
                          {product.isFeatured ? 'Featured' : 'Regular'}
                        </button>
                      </div>
                      
                      <div className="flex justify-between mt-3 pt-3 border-t border-[#7c4d33]/30">
                        <Link 
                          href={`/admin/products/${product._id}/edit`}
                          className="text-[#e3dcd4] hover:text-[#D4AF37] transition-colors flex items-center"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDeleteProduct(product._id)}
                          className="text-[#E67373] hover:text-[#E67373]/80 transition-colors flex items-center"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </AnimatedSection>
      
      {/* Featured Products Warning */}
      {products.filter(p => p.isFeatured).length >= 4 && (
        <div className="mt-4 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-3xl p-4 text-sm text-[#D4AF37]">
          <strong>Note:</strong> You have reached the maximum of 4 featured products. To feature a new product, you need to remove one from featured first.
        </div>
      )}
    </div>
  );
}