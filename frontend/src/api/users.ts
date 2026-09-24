import { apiClient } from "./client";
import type { AuthUser } from "./auth";

export async function fetchMe() {
  const res = await apiClient.get<AuthUser>("/users/me");
  return res.data;
}
