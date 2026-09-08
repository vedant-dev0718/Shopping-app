import { apiDelete, apiGet, apiPost } from "./client";
import type { Product } from "./discovery";

export type { Product };

export function getProducts(params: Record<string, string | undefined> = {}, init?: RequestInit) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  const qs = query.toString();
  return apiGet<Product[]>(`/products${qs ? `?${qs}` : ""}`, init);
}

export function getProduct(id: string, init?: RequestInit) {
  return apiGet<Product>(`/products/${id}`, init);
}

export function getRelatedProducts(id: string, init?: RequestInit) {
  return apiGet<Product[]>(`/products/${id}/related`, init);
}

export function saveProduct(id: string, token: string) {
  return apiPost<null>(`/products/${id}/save`, undefined, token);
}

export function unsaveProduct(id: string, token: string) {
  return apiDelete<null>(`/products/${id}/save`, token);
}
