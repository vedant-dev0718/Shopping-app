const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5001/api";

export type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
  meta?: Record<string, unknown>;
};

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit, token?: string): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(init.body ? { "Content-Type": "application/json" } : {}),
    ...(init.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });

  const body = (await res.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (!res.ok || !body) {
    throw new ApiError(body?.message || `Request to ${path} failed with status ${res.status}`, res.status);
  }

  return body.data;
}

export function apiGet<T>(path: string, init?: RequestInit, token?: string) {
  return request<T>(path, { ...init, method: "GET" }, token);
}

export function apiPost<T>(path: string, data?: unknown, token?: string) {
  return request<T>(path, { method: "POST", body: data !== undefined ? JSON.stringify(data) : undefined }, token);
}

export function apiPatch<T>(path: string, data?: unknown, token?: string) {
  return request<T>(path, { method: "PATCH", body: data !== undefined ? JSON.stringify(data) : undefined }, token);
}

export function apiDelete<T>(path: string, token?: string) {
  return request<T>(path, { method: "DELETE" }, token);
}
