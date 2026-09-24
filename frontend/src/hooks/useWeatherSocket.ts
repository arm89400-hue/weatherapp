import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { useNetworkType } from "./useNetworkType";

// No page origin to fall back to on native — EXPO_PUBLIC_API_URL must point at a reachable address.
const SOCKET_URL = process.env.EXPO_PUBLIC_API_URL;

type WeatherUpdatedEvent = { provinceId: string; stationId: string; kind: "reading" | "forecast" };

/** Joins the room for `provinceId` and invalidates the relevant queries on live updates. */
export function useWeatherSocket(provinceId: string | null) {
  const { accessToken } = useAuth();
  const { updateOnMobileData } = useSettings();
  const networkType = useNetworkType();
  const queryClient = useQueryClient();
  const [socket, setSocket] = useState<Socket | null>(null);

  // Fail open (treat unresolved network type as "not cellular") rather than briefly disabling
  // live updates on every cold start.
  const liveUpdatesAllowed = updateOnMobileData || networkType !== "cellular";

  useEffect(() => {
    if (!liveUpdatesAllowed) return;

    // Public data — connect regardless of auth. Passing the token when present just lets this
    // double as an authenticated connection once signed in.
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
