import { apiGet } from "./client";

export type Category = {
  name: string;
  productCount: number;
  reelCount: number;
};

export function getDiscoveryCategories(init?: RequestInit) {
  return apiGet<Category[]>("/discovery/categories", init);
}
