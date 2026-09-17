import { apiClient } from "./client";

export type AuthUser = { id: string; email: string; role: string; favoriteProvinceId: string | null };
export type AuthResponse = { accessToken: string; refreshToken: string; user: AuthUser };

export async function registerRequest(email: string, password: string, name: string) {
  const res = await apiClient.post<AuthResponse>("/auth/register", { email, password, name });
  return res.data;
}

export async function loginRequest(email: string, password: string) {
  const res = await apiClient.post<AuthResponse>("/auth/login", { email, password });
  return res.data;
}

export async function logoutRequest(refreshToken?: string) {
  await apiClient.post("/auth/logout", { refreshToken });
}
