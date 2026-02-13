import React, { createContext, useContext, useState, useCallback } from "react";
import { Product } from "@/data/products";

export interface CartItem {
  product: Product;
  quantity: number;
  selectedColor: string;
  selectedSize: string;
}

interface CouponCode {
  code: string;
  discount: number; // percentage
}

interface StoreContextType {
  cart: CartItem[];
  addToCart: (product: Product, color: string, size: string) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  filterCategory: string;
  setFilterCategory: (cat: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  coupon: CouponCode | null;
  applyCoupon: (coupon: CouponCode) => void;
  removeCoupon: () => void;
  clerkSelectedIds: string[];
  setClerkSelectedIds: (ids: string[]) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [sortBy, setSortBy] = useState("featured");
  const [filterCategory, setFilterCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [coupon, setCoupon] = useState<CouponCode | null>(null);
  const [clerkSelectedIds, setClerkSelectedIds] = useState<string[]>([]);

  const addToCart = useCallback((product: Product, color: string, size: string) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1, selectedColor: color, selectedSize: size }];
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(prev => prev.filter(item => item.product.id !== productId));
      return;
    }
    setCart(prev =>
      prev.map(item =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const applyCoupon = useCallback((c: CouponCode) => setCoupon(c), []);
  const removeCoupon = useCallback(() => setCoupon(null), []);

  return (
    <StoreContext.Provider
      value={{
        cart, addToCart, removeFromCart, updateQuantity, clearCart,
        cartTotal, cartCount, isCartOpen, setIsCartOpen,
        sortBy, setSortBy, filterCategory, setFilterCategory,
        searchQuery, setSearchQuery, coupon, applyCoupon, removeCoupon,
        clerkSelectedIds, setClerkSelectedIds,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
};
