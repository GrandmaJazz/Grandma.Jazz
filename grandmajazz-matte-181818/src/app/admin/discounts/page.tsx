//src/app/admin/discounts/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { DiscountAPI } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AnimatedSection } from '@/components/AnimatedSection';
import { toast } from 'react-hot-toast';
import { formatPrice } from '@/utils/helpers';

interface Discount {
  _id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  value: number;
  isActive: boolean;
  usedBy: Array<{ _id: string; name: string; email: string }>;
  validFrom: string;
  validUntil?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export default function AdminDiscountsPage() {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    discountType: 'percentage' as 'percentage' | 'fixed',
    value: 0,
    isActive: true,
    validFrom: new Date().toISOString().split('T')[0],
    validUntil: '',
    description: ''
  });

  // Fetch discounts
  useEffect(() => {
    async function fetchDiscounts() {
      setIsLoading(true);
      try {
        const data = await DiscountAPI.getAll();
        setDiscounts(data.discounts);
      } catch (error: any) {
        console.error('Error fetching discounts:', error);
        toast.error(error.message || 'Failed to load discounts');
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchDiscounts();
  }, []);

  // Reset form
  const resetForm = () => {
    setFormData({
      code: '',
      discountType: 'percentage',
      value: 0,
      isActive: true,
      validFrom: new Date().toISOString().split('T')[0],
      validUntil: '',
      description: ''
    });
    setEditingDiscount(null);
  };

  // Open modal for creating new discount
  const handleCreate = () => {
    resetForm();
    setShowModal(true);
  };

  // Open modal for editing discount
  const handleEdit = (discount: Discount) => {
    setEditingDiscount(discount);
    setFormData({
      code: discount.code,
      discountType: discount.discountType,
      value: discount.value,
      isActive: discount.isActive,
      validFrom: new Date(discount.validFrom).toISOString().split('T')[0],
      validUntil: discount.validUntil ? new Date(discount.validUntil).toISOString().split('T')[0] : '',
      description: discount.description || ''
    });
    setShowModal(true);
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const submitData = {
        ...formData,
        value: Number(formData.value),
        validFrom: formData.validFrom ? new Date(formData.validFrom).toISOString() : undefined,
        validUntil: formData.validUntil ? new Date(formData.validUntil).toISOString() : undefined
      };

      if (editingDiscount) {
        await DiscountAPI.update(editingDiscount._id, submitData);
        toast.success('Discount updated successfully');
      } else {
        await DiscountAPI.create(submitData);
        toast.success('Discount created successfully');
      }

      // Refresh discounts
      const data = await DiscountAPI.getAll();
      setDiscounts(data.discounts);
      
      setShowModal(false);
      resetForm();
    } catch (error: any) {
      console.error('Error saving discount:', error);
      toast.error(error.message || 'Failed to save discount');
    }
  };

  // Handle delete
  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`Are you sure you want to delete discount code "${code}"?`)) {
      return;
    }
    
    try {
      await DiscountAPI.delete(id);
      setDiscounts(discounts.filter(d => d._id !== id));
      toast.success('Discount deleted successfully');
    } catch (error: any) {
      console.error('Error deleting discount:', error);
      toast.error(error.message || 'Failed to delete discount');
    }
  };

  // Handle toggle active status
  const handleToggle = async (id: string) => {
    try {
      const data = await DiscountAPI.toggle(id);
      setDiscounts(
        discounts.map(d => (d._id === id ? { ...d, isActive: data.discount.isActive } : d))
      );
      toast.success(`Discount ${data.discount.isActive ? 'activated' : 'deactivated'} successfully`);
    } catch (error: any) {
      console.error('Error toggling discount:', error);
      toast.error(error.message || 'Failed to toggle discount');
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen pt-28 pb-16 bg-[#181818] flex justify-center items-center">
        <div className="w-12 h-12 border-4 border-[#B49B73] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-editorial-ultralight text-[#F5F1E6]">
          Discount <span className="text-[#B49B73]">Management</span>
        </h1>
        <Button
          onClick={handleCreate}
          className="bg-[#B49B73] hover:bg-[#B49B73]/90 text-[#0A0A0A] font-suisse-intl-mono"
        >
          + Create Discount
        </Button>
      </div>

      {/* Discounts List */}
      <AnimatedSection animation="fadeIn" className="space-y-4">
        {discounts.length === 0 ? (
          <div className="bg-[#1a1a1a]/70 backdrop-blur-sm p-8 rounded-3xl border border-[#7c4d33]/20 text-center">
            <p className="text-[#e3dcd4] font-suisse-intl">No discounts found. Create your first discount code!</p>
          </div>
        ) : (
          discounts.map((discount) => (
            <div
              key={discount._id}
              className="bg-[#1a1a1a]/70 backdrop-blur-sm p-6 rounded-3xl border border-[#7c4d33]/20"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-2xl font-suisse-intl-mono text-[#B49B73]">
                      {discount.code}
                    </h3>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-suisse-intl-mono ${
                        discount.isActive
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {discount.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-suisse-intl-mono bg-[#B49B73]/20 text-[#B49B73]">
                      {discount.discountType === 'percentage' ? `${discount.value}%` : `$${formatPrice(discount.value)}`}
                    </span>
                  </div>
                  
                  {discount.description && (
                    <p className="text-[#e3dcd4] font-suisse-intl mb-3">{discount.description}</p>
                  )}
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-[#e3dcd4]/80 font-suisse-intl">
                    <div>
                      <span className="text-[#B49B73]">Valid From:</span> {formatDate(discount.validFrom)}
                    </div>
                    {discount.validUntil && (
                      <div>
                        <span className="text-[#B49B73]">Valid Until:</span> {formatDate(discount.validUntil)}
                      </div>
                    )}
                    <div>
                      <span className="text-[#B49B73]">Used By:</span> {discount.usedBy.length} user(s)
                    </div>
                    <div>
                      <span className="text-[#B49B73]">Created:</span> {formatDate(discount.createdAt)}
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2 ml-4">
                  <Button
                    onClick={() => handleToggle(discount._id)}
                    variant="outline"
                    className={`border ${
                      discount.isActive
                        ? 'border-red-500/50 hover:bg-red-500/10 text-red-400'
                        : 'border-green-500/50 hover:bg-green-500/10 text-green-400'
                    }`}
                  >
                    {discount.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button
                    onClick={() => handleEdit(discount)}
                    variant="outline"
                    className="border-[#B49B73]/50 hover:bg-[#B49B73]/10"
                  >
                    Edit
                  </Button>
                  <Button
                    onClick={() => handleDelete(discount._id, discount.code)}
                    variant="outline"
                    className="border-red-500/50 hover:bg-red-500/10 text-red-400"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </AnimatedSection>

      {/* Create/Edit Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowModal(false);
            resetForm();
          }}
        >
          <div
            className="bg-[#1a1a1a] border border-[#B49B73]/30 rounded-3xl p-8 max-w-2xl w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-editorial-ultralight text-[#B49B73] mb-6">
              {editingDiscount ? 'Edit Discount' : 'Create New Discount'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[#B49B73] text-sm font-suisse-intl-mono mb-2 uppercase tracking-wider">
                  Discount Code
                </label>
                <Input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="DISCOUNT10"
                  required
                  className="bg-[#181818]/50 border-[#7c4d33]/50 text-[#F5F1E6]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#B49B73] text-sm font-suisse-intl-mono mb-2 uppercase tracking-wider">
                    Discount Type
                  </label>
                  <select
                    value={formData.discountType}
                    onChange={(e) => setFormData({ ...formData, discountType: e.target.value as 'percentage' | 'fixed' })}
                    className="bg-[#181818]/50 border border-[#7c4d33]/50 text-[#F5F1E6] rounded-xl px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-[#B49B73] font-suisse-intl"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount ($)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#B49B73] text-sm font-suisse-intl-mono mb-2 uppercase tracking-wider">
                    Value {formData.discountType === 'percentage' ? '(%)' : '($)'}
                  </label>
                  <Input
                    type="number"
                    value={formData.value}
                    onChange={(e) => {
                      const inputValue = e.target.value;
                      // ถ้าช่องว่าง ให้เป็น 0
                      if (inputValue === '') {
                        setFormData({ ...formData, value: 0 });
                      } else {
                        const numValue = Number(inputValue);
                        setFormData({ ...formData, value: isNaN(numValue) ? 0 : numValue });
                      }
                    }}
                    onKeyDown={(e) => {
                      // เมื่อผู้ใช้เริ่มพิมพ์ตัวเลขและค่าเป็น 0 ให้แทนที่ 0
                      if (formData.value === 0 && /[0-9]/.test(e.key)) {
                        e.preventDefault();
                        setFormData({ ...formData, value: Number(e.key) });
                      }
                    }}
                    onFocus={(e) => {
                      // เมื่อ focus และค่าเป็น 0 ให้เลือกข้อความทั้งหมดเพื่อแทนที่ได้ง่าย
                      if (formData.value === 0) {
                        e.target.select();
                      }
                    }}
                    min="0"
                    max={formData.discountType === 'percentage' ? '100' : undefined}
                    step={formData.discountType === 'percentage' ? '1' : '0.01'}
                    required
                    className="bg-[#181818]/50 border-[#7c4d33]/50 text-[#F5F1E6]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#B49B73] text-sm font-suisse-intl-mono mb-2 uppercase tracking-wider">
                    Valid From
                  </label>
                  <Input
                    type="date"
                    value={formData.validFrom}
                    onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                    required
                    className="bg-[#181818]/50 border-[#7c4d33]/50 text-[#F5F1E6]"
                  />
                </div>

                <div>
                  <label className="block text-[#B49B73] text-sm font-suisse-intl-mono mb-2 uppercase tracking-wider">
                    Valid Until (Optional)
                  </label>
                  <Input
                    type="date"
                    value={formData.validUntil}
                    onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                    className="bg-[#181818]/50 border-[#7c4d33]/50 text-[#F5F1E6]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#B49B73] text-sm font-suisse-intl-mono mb-2 uppercase tracking-wider">
                  Description (Optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="bg-[#181818]/50 border border-[#7c4d33]/50 text-[#F5F1E6] rounded-xl px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-[#B49B73] font-suisse-intl min-h-[100px]"
                  placeholder="Enter discount description..."
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-[#B49B73] bg-[#181818] border-[#7c4d33]/50 rounded focus:ring-[#B49B73]"
                />
                <label htmlFor="isActive" className="text-[#F5F1E6] font-suisse-intl">
                  Active
                </label>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  type="submit"
                  className="flex-1 bg-[#B49B73] hover:bg-[#B49B73]/90 text-[#0A0A0A] font-suisse-intl-mono"
                >
                  {editingDiscount ? 'Update Discount' : 'Create Discount'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="flex-1 border-[#7c4d33]/50 hover:bg-[#7c4d33]/10"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}



