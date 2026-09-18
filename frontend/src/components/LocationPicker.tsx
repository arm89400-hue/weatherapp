import { useQuery } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { fetchDistricts, fetchProvinces } from "../api/geo";
import { useSettings } from "../context/SettingsContext";
import { useTranslation } from "../i18n/useTranslation";
import { localizedName } from "../lib/localizedName";
import { SelectSheet } from "./SelectSheet";

type Props = {
  onSubmit: (provinceId: string, districtId: string | null) => void;
  onBack: () => void;
};

/** The "add a new saved location" sub-flow — a province+district picker that stages a
 * selection and only commits it via onSubmit, rather than changing the active dashboard
 * location directly (tapping a card in SavedLocationsList does that instead). */
export function LocationPicker({ onSubmit, onBack }: Props) {
  const { language } = useSettings();
  const { t } = useTranslation();
  const [provinceId, setProvinceId] = useState<string | null>(null);
  const [districtId, setDistrictId] = useState<string | null>(null);
  const [provinceSheetOpen, setProvinceSheetOpen] = useState(false);
  const [districtSheetOpen, setDistrictSheetOpen] = useState(false);

  const { data: provinces = [] } = useQuery({ queryKey: ["geo", "provinces"], queryFn: fetchProvinces });
  const { data: districts = [] } = useQuery({
    queryKey: ["geo", "districts", provinceId],
    queryFn: () => fetchDistricts(provinceId as string),
    enabled: !!provinceId,
  });

  const selectedProvince = provinces.find((p) => p.id === provinceId);
  const selectedDistrict = districts.find((d) => d.id === districtId);

  return (
    <View className="gap-4">
      <Pressable onPress={onBack} className="flex-row items-center gap-1 self-start">
        <ChevronLeft size={16} color="rgba(255,255,255,0.7)" />
        <Text className="text-sm text-white/70">{t("common.back")}</Text>
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

      <Pressable
        onPress={() => provinceId && onSubmit(provinceId, districtId)}
        disabled={!provinceId}
        className="rounded-xl bg-sky-400/80 py-2.5 disabled:opacity-50"
      >
        <Text className="text-center text-sm font-medium text-slate-900">{t("locationPicker.addLocation")}</Text>
      </Pressable>

      <SelectSheet
        open={provinceSheetOpen}
        onClose={() => setProvinceSheetOpen(false)}
        title={t("locationPicker.selectProvince")}
        options={provinces.map((p) => ({ value: p.id, label: localizedName(p, language) }))}
        value={provinceId}
        onChange={(id) => {
          if (id) {
            setProvinceId(id);
            setDistrictId(null);
          }
        }}
      />

      <SelectSheet
        open={districtSheetOpen}
        onClose={() => setDistrictSheetOpen(false)}
        title={t("locationPicker.district")}
        options={districts.map((d) => ({ value: d.id, label: localizedName(d, language) }))}
        value={districtId}
        onChange={setDistrictId}
        nullable
        nullLabel={t("locationPicker.allDistricts")}
      />
    </View>
  );
}
