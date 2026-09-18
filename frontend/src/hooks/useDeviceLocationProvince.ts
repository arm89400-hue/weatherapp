import * as Location from "expo-location";
import { useState } from "react";
import { fetchNearestLocation, type District, type Province } from "../api/geo";

export type LocationStatus = "idle" | "locating" | "resolved" | "denied" | "error";
/** Carries the full province/district (not just ids) so callers can label a "current location"
 * card without a second lookup — fetchNearestLocation already has these names, previously
 * discarded down to bare ids here. */
export type ResolvedLocation = {
  provinceId: string;
  districtId: string | null;
  province: Province;
  district: District | null;
};

/** Resolves the device's location to the nearest seeded province, plus a district within it
 * when the reverse-geocoded address text matches one (see geo.service.ts on the backend —
 * districts have no coordinates of their own, so this is a best-effort match, not guaranteed).
 * Does nothing until `request()` is called — the caller should ask the visitor first (see
 * LocationPrompt) rather than firing a permission dialog unprompted. */
export function useDeviceLocationProvince(onResolved: (location: ResolvedLocation) => void) {
  const [status, setStatus] = useState<LocationStatus>("idle");

  async function resolveFromCoords(lat: number, lng: number) {
    try {
      const { province, district } = await fetchNearestLocation(lat, lng);
      onResolved({ provinceId: province.id, districtId: district?.id ?? null, province, district });
      setStatus("resolved");
    } catch {
      setStatus("error");
    }
  }

  async function request() {
    setStatus("locating");
    try {
      const { status: permission } = await Location.requestForegroundPermissionsAsync();
      if (permission !== "granted") {
        setStatus("denied");
        return;
      }

      // High accuracy asks the device to use GPS instead of falling back to coarse
      // WiFi/cell-tower positioning, which can be off by tens of km.
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      await resolveFromCoords(pos.coords.latitude, pos.coords.longitude);
    } catch {
      setStatus("error");
    }
  }

  return { status, request };
}
