import type { Language } from "../context/SettingsContext";

type Named = { nameEn: string; nameTh: string };

export function localizedName(entity: Named | null | undefined, language: Language): string {
  if (!entity) return "";
  return language === "th" ? entity.nameTh : entity.nameEn;
}
