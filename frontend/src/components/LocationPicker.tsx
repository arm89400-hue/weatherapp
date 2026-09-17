import { useQuery } from "@tanstack/react-query";
import { LocateFixed } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { fetchDistricts, fetchProvinces } from "../api/geo";
import { useSettings } from "../context/SettingsContext";
import type { LocationStatus } from "../hooks/useDeviceLocationProvince";
import { useTranslation } from "../i18n/useTranslation";
import { localizedName } from "../lib/localizedName";
import { SelectSheet } from "./SelectSheet";

type Props = {
  provinceId: string | null;
  districtId: string | null;
  onChangeProvince: (id: string) => void;
  onChangeDistrict: (id: string | null) => void;
  locationStatus: LocationStatus;
  onUseMyLocation: () => void;
};

/** Full-width picker rendered inside a bottom sheet (see Sheet.tsx) — stacked, not squeezed
 * into the header, so it never overflows on narrow screens. Both selects from the old web
 * `<select>` become taps that open a SelectSheet. */
export function LocationPicker({
  provinceId,
  districtId,
  onChangeProvince,
  onChangeDistrict,
  locationStatus,
  onUseMyLocation,
}: Props) {
  const { language } = useSettings();
  const { t } = useTranslation();
  const { data: provinces = [] } = useQuery({ queryKey: ["geo", "provinces"], queryFn: fetchProvinces });
  const { data: districts = [] } = useQuery({
    queryKey: ["geo", "districts", provinceId],
    queryFn: () => fetchDistricts(provinceId as string),
    enabled: !!provinceId,
  });
  const [provinceSheetOpen, setProvinceSheetOpen] = useState(false);
  const [districtSheetOpen, setDistrictSheetOpen] = useState(false);

  const selectedProvince = provinces.find((p) => p.id === provinceId);
  const selectedDistrict = districts.find((d) => d.id === districtId);

  return (
    <View className="gap-4">
      <Pressable
        onPress={onUseMyLocation}
        disabled={locationStatus === "locating"}
        className="flex-row items-center justify-center gap-2 rounded-xl bg-sky-400/80 py-2.5 disabled:opacity-60"
      >
        <LocateFixed size={16} color="#0f172a" />
        <Text className="text-sm font-medium text-slate-900">
          {locationStatus === "locating" ? t("locationPicker.locating") : t("locationPicker.useCurrentLocation")}
        </Text>
      </Pressable>

      <View>
        <Text className="mb-1 text-xs text-white/60">{t("locationPicker.province")}</Text>
        <Pressable onPress={() => setProvinceSheetOpen(true)} className="rounded-xl bg-white/10 px-3 py-2.5">
          <Text className="text-sm text-white">
            {selectedProvince ? localizedName(selectedProvince, language) : t("locationPicker.selectProvince")}
          </Text>
        </Pressable>
      </View>

      {provinceId && districts.length > 0 && (
        <View>
          <Text className="mb-1 text-xs text-white/60">{t("locationPicker.district")}</Text>
          <Pressable onPress={() => setDistrictSheetOpen(true)} className="rounded-xl bg-white/10 px-3 py-2.5">
            <Text className="text-sm text-white">
              {selectedDistrict ? localizedName(selectedDistrict, language) : t("locationPicker.allDistricts")}
            </Text>
          </Pressable>
        </View>
      )}

      <SelectSheet
        open={provinceSheetOpen}
        onClose={() => setProvinceSheetOpen(false)}
        title={t("locationPicker.selectProvince")}
        options={provinces.map((p) => ({ value: p.id, label: localizedName(p, language) }))}
        value={provinceId}
        onChange={(id) => {
          if (id) {
            onChangeProvince(id);
            onChangeDistrict(null);
          }
        }}
      />

      <SelectSheet
        open={districtSheetOpen}
        onClose={() => setDistrictSheetOpen(false)}
        title={t("locationPicker.district")}
        options={districts.map((d) => ({ value: d.id, label: localizedName(d, language) }))}
        value={districtId}
        onChange={onChangeDistrict}
        nullable
        nullLabel={t("locationPicker.allDistricts")}
      />
    </View>
  );
}
