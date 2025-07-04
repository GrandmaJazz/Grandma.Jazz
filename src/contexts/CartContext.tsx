//src/contexts/CartContext.tsx
'use client';

import { createContext, useContext, useState, useEffect, type ReactNode, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { ProductAPI } from '@/lib/api';

// เพิ่ม interface สำหรับข้อมูลที่เพิ่มเติมในหน้า checkout
export interface CartItemWithDetails extends CartItem {
  name?: string;
  price?: number;
  image?: string;
}

// Define types - เก็บเฉพาะ ID และจำนวนเท่านั้น
export interface CartItem {
  productId: string;
  quantity: number;
}

interface CartContextType {
  items: CartItemWithDetails[]; // เปลี่ยนเป็น CartItemWithDetails
  totalItems: number;
  totalPrice: number; // เพิ่ม totalPrice
  isCartOpen: boolean;
  setIsCartOpen: (isOpen: boolean) => void;
  addItem: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  loadCartDetails: () => Promise<void>; // เพิ่มฟังก์ชันสำหรับโหลดรายละเอียดสินค้า
}

// สำหรับเก็บข้อมูลสำหรับ toast
interface ToastMessage {
  type: 'success' | 'error';
  message: string;
}

// Create context
const CartContext = createContext<CartContextType | undefined>(undefined);

// Create provider
export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItemWithDetails[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<ToastMessage | null>(null);
  const [totalPrice, setTotalPrice] = useState(0); // เพิ่ม state สำหรับราคารวม
  
  // สร้าง ref เพื่อป้องกันการโหลดข้อมูลสินค้าซ้ำ
  const loadedProductsRef = useRef<Record<string, boolean>>({});
  
  // Load cart from localStorage on mount
  useEffect(() => {
    const storedCart = localStorage.getItem('cart');
    if (storedCart) {
      try {
        setItems(JSON.parse(storedCart));
      } catch (error) {
        console.error('Error parsing stored cart:', error);
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items));
    
    // คำนวณราคารวมเมื่อ items เปลี่ยนแปลง
    const newTotalPrice = items.reduce((sum, item) => {
      return sum + (item.price || 0) * item.quantity;
    }, 0);
    setTotalPrice(newTotalPrice);
  }, [items]);

  // แสดง toast เมื่อมีข้อความใหม่
  useEffect(() => {
    if (toastMessage) {
      if (toastMessage.type === 'success') {
        toast.success(toastMessage.message);
      } else {
        toast.error(toastMessage.message);
      }
      // เคลียร์ข้อความหลังจากแสดงแล้ว
      setToastMessage(null);
    }
  }, [toastMessage]);

  // Calculate total items
  const totalItems = items.reduce((total, item) => total + item.quantity, 0);

  // เพิ่มฟังก์ชันโหลดรายละเอียดสินค้า - ปรับปรุงใหม่เพื่อป้องกัน maximum update depth
  const loadCartDetails = useCallback(async () => {
    if (items.length === 0) {
      setTotalPrice(0);
      return;
    }

    try {
      // กรองเฉพาะสินค้าที่ยังไม่มีข้อมูลหรือยังไม่เคยโหลด
      const itemsToLoad = items.filter(item => 
        (!item.name || !item.price) && !loadedProductsRef.current[item.productId]
      );
      
      // ถ้าไม่มีสินค้าที่ต้องโหลดข้อมูลเพิ่ม ให้ข้ามไป
      if (itemsToLoad.length === 0) {
        return;
      }
      
      // โหลดข้อมูลเฉพาะสินค้าที่ยังไม่มีรายละเอียด
      const loadedItems = await Promise.all(
        itemsToLoad.map(async (item) => {
          try {
            const result = await ProductAPI.getById(item.productId);
            if (result && result.product) {
              // บันทึกว่าได้โหลดสินค้านี้แล้ว
              loadedProductsRef.current[item.productId] = true;
              
              return {
                productId: item.productId,
                quantity: item.quantity,
                name: result.product.name,
                price: result.product.price,
                image: result.product.images[0] || '/images/placeholder-product.jpg'
              };
            }
          } catch (error) {
            console.error(`Error fetching product ${item.productId}:`, error);
          }
          return null;
        })
      );
      
      // กรองเอาเฉพาะรายการที่โหลดสำเร็จ
      const validLoadedItems = loadedItems.filter(Boolean) as CartItemWithDetails[];
      
      if (validLoadedItems.length === 0) {
        return;
      }
      
      // อัปเดต items โดยแทนที่เฉพาะรายการที่โหลดมาใหม่
      setItems(prevItems => {
        return prevItems.map(item => {
          // หารายการที่โหลดมาใหม่
          const loadedItem = validLoadedItems.find(loaded => loaded?.productId === item.productId);
          // ถ้ามีข้อมูลใหม่ให้ใช้ข้อมูลใหม่ ไม่งั้นใช้ข้อมูลเดิม
          return loadedItem || item;
        });
      });
      
    } catch (error) {
      console.error('Error loading cart details:', error);
    }
  }, [items]); // มี items เป็น dependency เพราะต้องตรวจสอบว่ามีสินค้าใดที่ยังไม่มีรายละเอียด

  // Add item to cart - เปลี่ยนเป็นรับแค่ productId และ quantity
  const addItem = (productId: string, quantity: number) => {
    setItems(prevItems => {
      // Check if item already exists in cart
      const existingItemIndex = prevItems.findIndex(i => i.productId === productId);
      
      if (existingItemIndex >= 0) {
        // Update quantity of existing item
        const updatedItems = [...prevItems];
        updatedItems[existingItemIndex].quantity += quantity;
        return updatedItems;
      } else {
        return [...prevItems, { productId, quantity }];
      }
    });
    
    // Open cart drawer when adding items
    setIsCartOpen(true);
  };

  // Remove item from cart
  const removeItem = (productId: string) => {
    setItems(prevItems => {
      return prevItems.filter(item => item.productId !== productId);
    });
  };

  // Update item quantity
  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    
    setItems(prevItems =>
      prevItems.map(item =>
        item.productId === productId
          ? { ...item, quantity }
          : item
      )
    );
  };

  // Clear cart
  const clearCart = () => {
    setItems([]);
    setTotalPrice(0);
  };

  // Context value
  const value = {
    items,
    totalItems,
    totalPrice,
    isCartOpen,
    setIsCartOpen,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    loadCartDetails,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// Custom hook to use cart context
export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}