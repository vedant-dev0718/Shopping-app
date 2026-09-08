"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { addCartItem, getCart, removeCartItem, updateCartItem, type Cart } from "@/lib/api/cart";

type CartContextValue = {
  cart: Cart | null;
  itemCount: number;
  isLoading: boolean;
  addItem: (productId: string, quantity?: number) => Promise<void>;
  updateItem: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!token) {
      setCart(null);
      return;
    }
    setIsLoading(true);
    try {
      setCart(await getCart(token));
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addItem = useCallback(
    async (productId: string, quantity = 1) => {
      if (!token) throw new Error("Must be logged in to add to cart");
      setCart(await addCartItem(token, productId, quantity));
    },
    [token],
  );

  const updateItem = useCallback(
    async (itemId: string, quantity: number) => {
      if (!token) return;
      setCart(await updateCartItem(token, itemId, quantity));
    },
    [token],
  );

  const removeItem = useCallback(
    async (itemId: string) => {
      if (!token) return;
      setCart(await removeCartItem(token, itemId));
    },
    [token],
  );

  const itemCount = cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  return (
    <CartContext.Provider value={{ cart, itemCount, isLoading, addItem, updateItem, removeItem, refresh }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
