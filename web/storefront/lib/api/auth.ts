import { apiGet, apiPatch, apiPost } from "./client";

export type User = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: "buyer" | "seller" | "admin";
  address?: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  avatarUrl?: string;
};

export type AuthPayload = {
  token: string;
  user: User;
  isNewUser?: boolean;
};

export function login(identifier: string, password: string) {
  return apiPost<AuthPayload>("/auth/login", { identifier, password });
}

export function signupBuyerStart(input: { name: string; email: string; password: string; phone: string; address: string }) {
  return apiPost<{ verificationId: string; email: string; expiresAt: string; resendAvailableAt: string }>(
    "/auth/signup/buyer/start",
    input,
  );
}

export function signupVerifyEmail(verificationId: string, otp: string) {
  return apiPost<AuthPayload>("/auth/signup/verify-email", { verificationId, otp });
}

export function signupResendCode(verificationId: string) {
  return apiPost<{ verificationId: string; expiresAt: string; resendAvailableAt: string }>(
    "/auth/signup/resend-code",
    { verificationId },
  );
}

export function getMe(token: string) {
  return apiGet<{ user: User }>("/auth/me", undefined, token);
}

export function updateMe(token: string, input: Partial<Pick<User, "name" | "phone" | "address">>) {
  return apiPatch<{ user: User }>("/auth/me", input, token);
}

export function logout(token: string) {
  return apiPost<null>("/auth/logout", undefined, token);
}
