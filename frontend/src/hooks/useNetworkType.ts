import NetInfo from "@react-native-community/netinfo";
import { useEffect, useState } from "react";

type NetworkType = "wifi" | "cellular" | "unknown";

function mapType(type: string | null | undefined): NetworkType {
  if (type === "wifi" || type === "ethernet") return "wifi";
  if (type === "cellular") return "cellular";
  return "unknown";
}

export function useNetworkType(): NetworkType {
  const [type, setType] = useState<NetworkType>("unknown");

  useEffect(() => {
    NetInfo.fetch().then((state) => setType(mapType(state.type)));
    return NetInfo.addEventListener((state) => setType(mapType(state.type)));
  }, []);

  return type;
}
