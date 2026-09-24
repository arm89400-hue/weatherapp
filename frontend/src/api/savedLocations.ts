import { apiClient } from "./client";
import type { District, Province } from "./geo";

export type SavedLocation = {
  id: string;
  provinceId: string;
  districtId: string | null;
  province: Pick<Province, "id" | "nameEn" | "nameTh">;
  district: Pick<District, "id" | "nameEn" | "nameTh"> | null;
  /** Whether weather alerts cover this location's province — same value for every row in a province. */
  notify: boolean;
  createdAt: string;
};

export async function fetchSavedLocations() {
  const res = await apiClient.get<SavedLocation[]>("/saved-locations");
  return res.data;
}

export async function createSavedLocation(input: { provinceId: string; districtId?: string | null }) {
  const res = await apiClient.post<SavedLocation>("/saved-locations", input);
  return res.data;
}

// Alerts are per province, so this flips every saved location the user has in that province.
export async function setProvinceNotify(provinceId: string, notify: boolean) {
  await apiClient.patch("/saved-locations/notify", { provinceId, notify });
}

export async function deleteSavedLocation(id: string) {
  await apiClient.delete(`/saved-locations/${id}`);
}
