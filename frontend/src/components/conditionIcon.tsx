import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSun, Sun, type LucideIcon } from "lucide-react-native";

export function conditionToIcon(condition?: string | null): LucideIcon {
  const c = (condition ?? "").toLowerCase();
  if (c.includes("storm") || c.includes("thunder")) return CloudLightning;
  if (c.includes("drizzl")) return CloudDrizzle;
  if (c.includes("rain") || c.includes("shower")) return CloudRain;
  if (c.includes("fog") || c.includes("mist") || c.includes("haze")) return CloudFog;
  if (c.includes("clear") || c.includes("sunny")) return Sun;
  if (c.includes("partly") || c.includes("few cloud")) return CloudSun;
  if (c.includes("cloud") || c.includes("overcast")) return Cloud;
  return CloudSun;
}
