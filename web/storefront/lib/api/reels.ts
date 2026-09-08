import { apiGet } from "./client";
import type { Reel } from "./discovery";

export type { Reel };

export function getReels(params: Record<string, string | undefined> = {}, init?: RequestInit) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  const qs = query.toString();
  return apiGet<Reel[]>(`/reels${qs ? `?${qs}` : ""}`, init);
}

export function getReel(id: string, init?: RequestInit) {
  return apiGet<Reel>(`/reels/${id}`, init);
}
