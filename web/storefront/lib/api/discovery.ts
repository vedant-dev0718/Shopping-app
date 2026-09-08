import { apiGet } from "./client";

export type Product = {
  _id: string;
  title: string;
  description: string;
  category: string;
  region: string;
  price: number;
  stock: number;
  tags: string[];
  imageUrls: string[];
  featured: boolean;
  status: string;
};

export type Reel = {
  _id: string;
  caption: string;
  hashtags: string[];
  videoUrl: string;
  thumbnailUrl: string;
  category: string;
  region: string;
  taggedProductIds: Product[];
};

export type FeedItem =
  | { type: "product"; createdAt: string; data: Product }
  | { type: "reel"; createdAt: string; data: Reel };

export function getDiscoveryFeed(init?: RequestInit) {
  return apiGet<FeedItem[]>("/discovery/feed", init);
}
