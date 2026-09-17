import axios from "axios";
import * as SecureStore from "expo-secure-store";

// Native apps have no browser cookie jar, so unlike the old web app there's no httpOnly
// refresh cookie — the refresh token travels in the request/response body instead and is
// persisted here via SecureStore. EXPO_PUBLIC_API_URL must point at the backend's LAN IP (or a
// tunnel) since there's no same-origin nginx proxy to fall back to on a physical device.
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "";
export const REFRESH_TOKEN_KEY = "auth.refreshToken";

export const apiClient = axios.create({
  baseURL: `${API_URL}/api`,
});

let accessToken: string | null = null;
let onTokenRefreshed: ((token: string) => void) | null = null;
let onAuthExpired: (() => void) | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function setAuthCallbacks(callbacks: {
  onTokenRefreshed: (token: string) => void;
  onAuthExpired: () => void;
}) {
  onTokenRefreshed = callbacks.onTokenRefreshed;
  onAuthExpired = callbacks.onAuthExpired;
}

apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let refreshInFlight: Promise<string> | null = null;

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        refreshInFlight ??= refreshAccessToken().then((r) => r.accessToken);
        const newToken = await refreshInFlight;
        refreshInFlight = null;
        original.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(original);
      } catch (refreshError) {
        refreshInFlight = null;
        onAuthExpired?.();
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export async function refreshAccessToken(): Promise<{ accessToken: string; user: unknown }> {
  const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  if (!refreshToken) throw new Error("No refresh token stored");

  const res = await axios.post(`${API_URL}/api/auth/refresh`, { refreshToken });

  // The backend's refreshSession() revokes the old refresh token and issues a new one on every
  // single call — the rotated token MUST be re-persisted here, or the very next refresh attempt
  // fails outright (old token already revoked, new one never saved).
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, res.data.refreshToken);
  setAccessToken(res.data.accessToken);
  onTokenRefreshed?.(res.data.accessToken);
  return { accessToken: res.data.accessToken, user: res.data.user };
}
