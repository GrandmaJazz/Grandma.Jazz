//src/app/admin/products/[id]/edit/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ProductAPI, UploadAPI } from '@/lib/api';
import { AnimatedSection } from '@/components/AnimatedSection';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

interface ProductImage {
  url: string;
  isExisting: boolean;
}

export default function AdminEditProductPage() {
  const router = useRouter();
  const params = useParams();
  
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    description: '',
    category: '',
    isFeatured: false,
    isOutOfStock: false
  });
  
  const [images, setImages] = useState<ProductImage[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const categories = [
    { id: 'vinyl', name: 'Vinyl Records' },
    { id: 'cds', name: 'CDs' },
    { id: 'merchandise', name: 'Merchandise' },
    { id: 'instruments', name: 'Instruments' }
  ];
  
  // Fetch product details
  useEffect(() => {
    async function fetchProductDetails() {
      try {
        const data = await ProductAPI.getById(params.id as string);
        const product = data.product;
        
        setFormData({
          name: product.name,
          price: product.price.toString(),
          description: product.description,
          category: product.category,
          isFeatured: product.isFeatured,
          isOutOfStock: product.isOutOfStock
        });
        
        // Set existing images
        setImages(
          product.images.map((url: string) => ({
            url,
            isExisting: true
          }))
        );
      } catch (error) {
        console.error('Error fetching product details:', error);
        toast.error('Failed to load product details');
        router.push('/admin/products');
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchProductDetails();
  }, [params.id, router]);
  
  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    });
    
    // Clear error
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };
  
  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      return;
    }
    
    const selectedFiles = Array.from(e.target.files);
    setNewFiles(prev => [...prev, ...selectedFiles]);
    
    // Add to images array for preview
    const newImagePreviews = selectedFiles.map(file => ({
      url: URL.createObjectURL(file),
      isExisting: false
    }));
    
    setImages(prev => [...prev, ...newImagePreviews]);
    
    // Clear error
    if (errors.images) {
      setErrors({
        ...errors,
        images: ''
      });
    }
  };
  
  // Remove image
  const removeImage = (index: number) => {
    const image = images[index];
    
    // If it's a newly added image, revoke the URL
    if (!image.isExisting) {
      URL.revokeObjectURL(image.url);
      
      // Find the corresponding file and remove it
      const fileIndex = newFiles.findIndex(
        (_, i) => i === index - images.filter(img => img.isExisting).length
      );
      
      if (fileIndex !== -1) {
        const newFilesList = [...newFiles];
        newFilesList.splice(fileIndex, 1);
        setNewFiles(newFilesList);
      }
    }
    
    // Remove from images array
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
  };
  
  // Validate form
  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    }
    
    if (!formData.price.trim()) {
      newErrors.price = 'Price is required';
    } else if (isNaN(Number.parseFloat(formData.price)) || Number.parseFloat(formData.price) <= 0) {
      newErrors.price = 'Price must be a positive number';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    
    if (!formData.category) {
      newErrors.category = 'Category is required';
    }
    
    if (images.length === 0) {
      newErrors.images = 'At least one image is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    setUploadProgress(10);
    
    try {
      // 1. Upload new images (if any)
      const uploadedImageUrls = [];
      
      if (newFiles.length > 0) {
        for (let i = 0; i < newFiles.length; i++) {
          const file = newFiles[i];
          const result = await UploadAPI.uploadSingle(file);
          uploadedImageUrls.push(result.file.url);
          setUploadProgress(10 + Math.round((i + 1) / newFiles.length * 50));
        }
      } else {
        setUploadProgress(60); // Skip to 60% if no new images
      }
      
      // 2. Get existing image URLs
      const existingImageUrls = images
        .filter(img => img.isExisting)
        .map(img => img.url);
      
      // Combine all image URLs
      const allImageUrls = [...existingImageUrls, ...uploadedImageUrls];
      
      setUploadProgress(70);
      
      // 3. ส่งข้อมูลเป็น JSON แทน FormData
      const productData = {
        name: formData.name,
        price: formData.price,
        description: formData.description,
        category: formData.category,
        isFeatured: formData.isFeatured,
        isOutOfStock: formData.isOutOfStock,
        images: allImageUrls
      };
      
      console.log('Sending updated product data:', productData);
      
      setUploadProgress(80);
      
      // 4. Update product using fetch API directly
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(productData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update product');
      }
      
      setUploadProgress(100);
      
      // 5. Force fetch updated data
      await new Promise(resolve => setTimeout(resolve, 500)); // Add small delay
      
      // Redirect to products page
      router.push('/admin/products');
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update product');
      setUploadProgress(0);
    } finally {
      setIsSubmitting(false);
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-editorial-ultralight text-[#F5F1E6]">
          <span className="text-[#D4AF37]">Edit</span> Product
        </h1>
        
        <Link href="/admin/products">
          <Button variant="outline" size="sm">
            Back to Products
          </Button>
        </Link>
      </div>
      
      <AnimatedSection animation="fadeIn">
        <div className="bg-[#0A0A0A] rounded-3xl p-6 border border-[#7c4d33]/30">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column - Basic Info */}
              <div>
                <h2 className="text-xl font-suisse-intl text-[#F5F1E6] mb-4">
                  Product Information
                </h2>
                
                {/* Product Name */}
                <Input
                  label="Product Name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  error={errors.name}
                  fullWidth
                />
                
                {/* Price */}
                <Input
                  label="Price (THB)"
                  name="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={handleChange}
                  error={errors.price}
                  fullWidth
                />
                
                {/* Category */}
                <div className="mb-4">
                  <label className="block font-suisse-intl-mono text-xs uppercase tracking-wide mb-1 text-[#e3dcd4]">
                    Category
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className={`bg-[#0A0A0A] border text-[#F5F1E6] rounded-xl px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-[#D4AF37] transition duration-200 font-suisse-intl text-sm ${
                      errors.category ? 'border-[#E67373]' : 'border-[#7c4d33]/50'
                    }`}
                  >
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  {errors.category && (
                    <p className="mt-1 text-[#E67373] text-xs font-suisse-intl">
                      {errors.category}
                    </p>
                  )}
                </div>
                
                {/* Description */}
                <div className="mb-4">
                  <label className="block font-suisse-intl-mono text-xs uppercase tracking-wide mb-1 text-[#e3dcd4]">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={5}
                    className={`bg-[#0A0A0A] border text-[#F5F1E6] rounded-xl px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-[#D4AF37] transition duration-200 font-suisse-intl text-sm resize-none ${
                      errors.description ? 'border-[#E67373]' : 'border-[#7c4d33]/50'
                    }`}
                  ></textarea>
                  {errors.description && (
                    <p className="mt-1 text-[#E67373] text-xs font-suisse-intl">
                      {errors.description}
                    </p>
                  )}
                </div>
                
                {/* Status Checkboxes */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isFeatured"
                      name="isFeatured"
                      checked={formData.isFeatured}
                      onChange={handleChange}
                      className="w-4 h-4 bg-[#0A0A0A] border border-[#7c4d33]/50 rounded focus:ring-[#D4AF37] focus:ring-opacity-25"
                    />
                    <label htmlFor="isFeatured" className="ml-2 font-suisse-intl text-[#F5F1E6] text-sm">
                      Mark as Featured Product
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isOutOfStock"
                      name="isOutOfStock"
                      checked={formData.isOutOfStock}
                      onChange={handleChange}
                      className="w-4 h-4 bg-[#0A0A0A] border border-[#7c4d33]/50 rounded focus:ring-[#D4AF37] focus:ring-opacity-25"
                    />
                    <label htmlFor="isOutOfStock" className="ml-2 font-suisse-intl text-[#F5F1E6] text-sm">
                      Out of Stock
                    </label>
                  </div>
                </div>
              </div>
              
              {/* Right Column - Images */}
              <div>
                <h2 className="text-xl font-suisse-intl text-[#F5F1E6] mb-4">
                  Product Images
                </h2>
                
                {/* Image Upload */}
                <div className="mb-4">
                  <label className="block font-suisse-intl-mono text-xs uppercase tracking-wide mb-1 text-[#e3dcd4]">
                    Upload Additional Images
                  </label>
                  <div className={`border-2 border-dashed rounded-xl p-4 text-center ${
                    errors.images ? 'border-[#E67373]' : 'border-[#7c4d33]/50'
                  }`}>
                    <input
                      type="file"
                      id="images"
                      multiple
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <label
                      htmlFor="images"
                      className="flex flex-col items-center justify-center cursor-pointer"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-[#e3dcd4] mb-2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                      </svg>
                      <span className="text-[#F5F1E6] font-suisse-intl mb-1">
                        Click to upload more images
                      </span>
                      <span className="text-[#e3dcd4] text-xs">
                        PNG, JPG, WEBP (max 5MB each)
                      </span>
                    </label>
                  </div>
                  {errors.images && (
                    <p className="mt-1 text-[#E67373] text-xs font-suisse-intl">
                      {errors.images}
                    </p>
                  )}
                </div>
                
                {/* Image Previews */}
                {images.length > 0 && (
                  <div>
                    <p className="text-[#e3dcd4] text-sm font-suisse-intl-mono mb-2">
                      Current Images ({images.length})
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {images.map((image, index) => (
                        <div key={index} className="relative">
                          <div className="aspect-square rounded-xl overflow-hidden relative">
                            <img 
                              src={image.url} 
                              alt={`Product image ${index + 1}`} 
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-2 right-2 bg-[#0A0A0A] bg-opacity-50 rounded-full p-1 hover:bg-opacity-70 transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#F5F1E6]">
                              <line x1="18" y1="6" x2="6" y2="18"></line>
                              <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Featured product warning */}
                {formData.isFeatured && (
                  <div className="mt-4 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-xl p-4 text-sm text-[#D4AF37]">
                    <strong>Note:</strong> You can have a maximum of 4 featured products. If you already have 4 featured products, this product may not appear in the featured section until you un-feature one of them.
                  </div>
                )}
              </div>
            </div>
            
            {/* Submit Buttons */}
            <div className="mt-8 border-t border-[#7c4d33]/30 pt-6 flex justify-end space-x-4">
              <Link href="/admin/products">
                <Button variant="outline" type="button" disabled={isSubmitting}>
                  Cancel
                </Button>
              </Link>
              <Button type="submit" loading={isSubmitting}>
                {isSubmitting ? `Updating Product (${uploadProgress}%)` : 'Update Product'}
              </Button>
            </div>
            
            {/* Progress Bar */}
            {isSubmitting && uploadProgress > 0 && (
              <div className="mt-4">
                <div className="w-full bg-[#7c4d33]/30 rounded-full h-2">
                  <div
                    className="bg-[#D4AF37] h-2 rounded-full"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}
          </form>
        </div>
      </AnimatedSection>
    </div>
  );
}