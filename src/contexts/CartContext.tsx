//src/contexts/CartContext.tsx
'use client';

import { createContext, useContext, useState, useEffect, type ReactNode, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { getCartProduct } from '@/lib/cartProducts';
import { cartItemKey, productColours } from '@/lib/productOptions';
import { safeStorage } from '@/lib/safeStorage';
import { trackAddToCart } from '@/lib/ecommerceAnalytics';

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
  colour?: string;
}

interface CartContextType {
  isCartReady: boolean;
  items: CartItemWithDetails[]; // เปลี่ยนเป็น CartItemWithDetails
  totalItems: number;
  totalPrice: number; // เพิ่ม totalPrice
  isCartOpen: boolean;
  setIsCartOpen: (isOpen: boolean) => void;
  addItem: (productId: string, quantity: number, details?: Pick<CartItemWithDetails, 'name' | 'price' | 'image' | 'colour'>) => void;
  removeItem: (productId: string, colour?: string) => void;
  updateQuantity: (productId: string, quantity: number, colour?: string) => void;
  setItemColour: (productId: string, colour: string) => void;
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
  const [isCartReady, setIsCartReady] = useState(false);
  const totalPrice = items.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0); // เพิ่ม state สำหรับราคารวม
  
  // สร้าง ref เพื่อป้องกันการโหลดข้อมูลสินค้าซ้ำ
  const loadedProductsRef = useRef<Record<string, boolean>>({});
  
  // Load cart from localStorage on mount
  useEffect(() => {
    const storedCart = safeStorage.get('cart');
    if (storedCart) {
      try {
        setItems(JSON.parse(storedCart));
      } catch (error) {
        console.error('Error parsing stored cart:', error);
      }
    }
    setIsCartReady(true);
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (isCartReady) safeStorage.set('cart', JSON.stringify(items));
  }, [items, isCartReady]);

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
            const result = await getCartProduct(item.productId);
            if (result && result.product) {
              // บันทึกว่าได้โหลดสินค้านี้แล้ว
              loadedProductsRef.current[item.productId] = true;
              
              return {
                productId: item.productId,
                colour: item.colour,
                quantity: item.quantity,
                name: result.product.name,
                price: result.product.price,
                weight: result.product.weight,
                image: result.product.images[Math.max(0, productColours[item.productId]?.indexOf(item.colour || '') ?? 0)] || '/images/placeholder-product.jpg'
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
          const loadedItem = validLoadedItems.find(loaded => cartItemKey(loaded) === cartItemKey(item));
          // ถ้ามีข้อมูลใหม่ให้ใช้ข้อมูลใหม่ ไม่งั้นใช้ข้อมูลเดิม
          return loadedItem ? { ...loadedItem, quantity: item.quantity } : item;
        });
      });
      
    } catch (error) {
      console.error('Error loading cart details:', error);
    }
  }, [items]); // มี items เป็น dependency เพราะต้องตรวจสอบว่ามีสินค้าใดที่ยังไม่มีรายละเอียด

  // Add item to cart - เปลี่ยนเป็นรับแค่ productId และ quantity
  const addItem = (productId: string, quantity: number, details?: Pick<CartItemWithDetails, 'name' | 'price' | 'image' | 'colour'>) => {
    if (!/^[a-f\d]{24}$/i.test(productId) || !Number.isSafeInteger(quantity) || quantity < 1) return;
    setItems(prevItems => {
      // Check if item already exists in cart
      const existingItemIndex = prevItems.findIndex(i => cartItemKey(i) === cartItemKey({ productId, colour: details?.colour }));
      
      if (existingItemIndex >= 0) {
        // Update quantity of existing item
        const updatedItems = [...prevItems];
        updatedItems[existingItemIndex] = { ...updatedItems[existingItemIndex], quantity: updatedItems[existingItemIndex].quantity + quantity };
        return updatedItems;
      } else {
        // Display details are provisional. The backend still prices each quote.
        return [...prevItems, { ...details, productId, quantity }];
      }
    });
    
    // Open cart drawer when adding items
    setIsCartOpen(true);
    // Report the increment, never the cart's accumulated quantity. A first add
    // may not have a cached price yet; omit value instead of inventing revenue.
    const existing = items.find(item => item.productId === productId);
    trackAddToCart({ productId, name: details?.name || existing?.name, price: details?.price ?? existing?.price }, quantity);
  };

  // Remove item from cart
  const removeItem = (productId: string, colour?: string) => {
    setItems(prevItems => {
      return prevItems.filter(item => cartItemKey(item) !== cartItemKey({ productId, colour }));
    });
  };

  // Update item quantity
  const updateQuantity = (productId: string, quantity: number, colour?: string) => {
    if (quantity <= 0) {
      removeItem(productId, colour);
      return;
    }
    
    setItems(prevItems =>
      prevItems.map(item =>
        cartItemKey(item) === cartItemKey({ productId, colour })
          ? { ...item, quantity }
          : item
      )
    );
  };

  const setItemColour = (productId: string, colour: string) => {
    if (!productColours[productId]?.includes(colour)) return;
    setItems(previous => {
      const legacy = previous.find(item => item.productId === productId && !item.colour);
      if (!legacy) return previous;
      const rest = previous.filter(item => item !== legacy);
      const existing = rest.find(item => item.productId === productId && item.colour === colour);
      return existing ? rest.map(item => item === existing ? { ...item, quantity: item.quantity + legacy.quantity } : item)
        : [...rest, { ...legacy, colour, image: undefined }];
    });
  };
  // Clear cart
  const clearCart = () => {
    setItems([]);
  };

  // Context value
  const value = {
    isCartReady,
    items,
    totalItems,
    totalPrice,
    isCartOpen,
    setIsCartOpen,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    setItemColour,
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
