import * as SecureStore from "expo-secure-store";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { loginRequest, logoutRequest, registerRequest, type AuthUser } from "../api/auth";
import { REFRESH_TOKEN_KEY, refreshAccessToken, setAccessToken, setAuthCallbacks } from "../api/client";

type AuthContextValue = {
  user: AuthUser | null;
  accessToken: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: AuthUser) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setAuthCallbacks({
      onTokenRefreshed: (newToken) => setToken(newToken),
      onAuthExpired: () => {
        setToken(null);
        setUser(null);
        setAccessToken(null);
        SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY).catch(() => {});
      },
    });

    refreshAccessToken()
      .then(({ accessToken: newAccessToken, user: restoredUser }) => {
        setToken(newAccessToken);
        setUser(restoredUser as AuthUser);
      })
      .catch(() => {
        // no stored/valid refresh token — fine, user needs to log in
      })
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken: token,
      loading,
      async login(email, password) {
        const res = await loginRequest(email, password);
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, res.refreshToken);
        setAccessToken(res.accessToken);
        setToken(res.accessToken);
        setUser(res.user);
      },
      async register(email, password, name) {
        const res = await registerRequest(email, password, name);
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, res.refreshToken);
        setAccessToken(res.accessToken);
        setToken(res.accessToken);
        setUser(res.user);
      },
      async logout() {
        const storedToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
        await logoutRequest(storedToken ?? undefined).catch(() => {});
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
        setAccessToken(null);
        setToken(null);
        setUser(null);
      },
      setUser,
    }),
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
