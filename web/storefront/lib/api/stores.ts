import { apiGet } from "./client";
import type { Product } from "./discovery";
import type { Reel } from "./discovery";

export type Store = {
  _id: string;
  sellerId: string;
  storeName: string;
  category: string;
  city?: string;
  state?: string;
  region: string;
  description?: string;
  story?: string;
  profileImageUrl?: string;
  bannerImageUrl?: string;
  verified: boolean;
};

export function getStore(id: string, init?: RequestInit) {
  return apiGet<Store>(`/stores/${id}`, init);
}

export function getStoreProducts(id: string, init?: RequestInit) {
  return apiGet<Product[]>(`/stores/${id}/products`, init);
}

export function getStoreReels(id: string, init?: RequestInit) {
  return apiGet<Reel[]>(`/stores/${id}/reels`, init);
}
