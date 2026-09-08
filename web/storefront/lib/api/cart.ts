import { apiDelete, apiGet, apiPatch, apiPost } from "./client";
import type { Product } from "./discovery";

export type CartItem = {
  _id: string;
  productId: Product;
  quantity: number;
  priceSnapshot: number;
};

export type Cart = {
  _id: string;
  items: CartItem[];
  subtotal: number;
  shipping: number;
  finalTotal: number;
};

export function getCart(token: string) {
  return apiGet<Cart>("/cart", undefined, token);
}

export function addCartItem(token: string, productId: string, quantity = 1) {
  return apiPost<Cart>("/cart/items", { productId, quantity }, token);
}

export function updateCartItem(token: string, itemId: string, quantity: number) {
  return apiPatch<Cart>(`/cart/items/${itemId}`, { quantity }, token);
}

export function removeCartItem(token: string, itemId: string) {
  return apiDelete<Cart>(`/cart/items/${itemId}`, token);
}
