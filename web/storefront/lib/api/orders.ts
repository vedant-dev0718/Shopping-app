import { apiGet, apiPost } from "./client";

export type OrderItem = {
  productId: string;
  titleSnapshot: string;
  imageSnapshot: string;
  quantity: number;
  priceSnapshot: number;
  itemTotal: number;
  itemStatus: string;
  returnEligible: boolean;
};

export type Order = {
  _id: string;
  orderNumber: string;
  items: OrderItem[];
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  trackingStatus: string;
  trackingNumber?: string;
  trackingUrl?: string;
  subtotal: number;
  shipping: number;
  finalTotal: number;
  createdAt: string;
};

export function getOrders(token: string) {
  return apiGet<Order[]>("/orders", undefined, token);
}

export function getOrder(token: string, id: string) {
  return apiGet<Order>(`/orders/${id}`, undefined, token);
}

export function cancelOrder(token: string, orderId: string, reason: string) {
  return apiPost<Order>(`/orders/${orderId}/cancel`, { reason }, token);
}

export function requestReturn(token: string, orderId: string, reason: string) {
  return apiPost<Order>(`/orders/${orderId}/returns`, { reason }, token);
}
