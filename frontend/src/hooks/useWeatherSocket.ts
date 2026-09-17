import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { useNetworkType } from "./useNetworkType";

// Unlike the old web app (same-origin, proxied by nginx), a native client has no page origin to
// fall back to — EXPO_PUBLIC_API_URL must be set to the backend's reachable address.
const SOCKET_URL = process.env.EXPO_PUBLIC_API_URL;

type WeatherUpdatedEvent = { provinceId: string; stationId: string; kind: "reading" | "forecast" };

/** Joins the room for `provinceId` and invalidates the relevant queries on live updates. */
export function useWeatherSocket(provinceId: string | null) {
  const { accessToken } = useAuth();
  const { updateOnMobileData } = useSettings();
  const networkType = useNetworkType();
  const queryClient = useQueryClient();
  const [socket, setSocket] = useState<Socket | null>(null);

  // Network type is "unknown" until NetInfo resolves; we fail open (treat as "not cellular")
  // rather than briefly disabling live updates for everyone on every cold start.
  const liveUpdatesAllowed = updateOnMobileData || networkType !== "cellular";

  useEffect(() => {
    if (!liveUpdatesAllowed) return;

    // Weather updates are public — connect whether or not the visitor is signed in. Passing
    // the token when present lets it double as an authenticated connection once they log in.
    const s = io(SOCKET_URL, { auth: accessToken ? { token: accessToken } : {} });

    s.on("weather:updated", (event: WeatherUpdatedEvent) => {
      queryClient.invalidateQueries({ queryKey: ["weather", "current", event.provinceId] });
      queryClient.invalidateQueries({ queryKey: ["weather", "forecast", event.provinceId] });
    });

    s.on("connect", () => setSocket(s));

    return () => {
      s.disconnect();
      setSocket(null);
    };
  }, [accessToken, queryClient, liveUpdatesAllowed]);

  useEffect(() => {
    if (!socket || !provinceId) return;

    socket.emit("subscribe:province", provinceId);
    return () => {
      socket.emit("unsubscribe:province", provinceId);
    };
  }, [socket, provinceId]);
}
