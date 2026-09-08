import { apiGet } from "./client";
import type { Product } from "./discovery";
import type { Reel } from "./discovery";

export type Store = {
  _id: string;
  storeName: string;
  category: string;
  city?: string;
  state?: string;
  region: string;
  profileImageUrl?: string;
};

export type GlobalSearchResult = {
  stores: Store[];
  products: Product[];
  reels: Reel[];
};

export function searchGlobal(query: string, init?: RequestInit) {
  return apiGet<GlobalSearchResult>(`/search/global?q=${encodeURIComponent(query)}`, init);
}
