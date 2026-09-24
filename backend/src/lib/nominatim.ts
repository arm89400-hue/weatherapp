// Only used for on-demand single-point lookups (one call per "use my location" click), never
// bulk — stays within Nominatim's public-usage policy.
export type NominatimAddress = Record<string, string>;

export async function reverseGeocode(lat: number, lng: number): Promise<NominatimAddress | null> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("zoom", "14");
  url.searchParams.set("accept-language", "en");

  const res = await fetch(url, {
    headers: { "User-Agent": "thai-weather-app/1.0 (device-location district lookup)" },
  });
  if (!res.ok) return null;

  const data = (await res.json()) as { address?: NominatimAddress };
  return data.address ?? null;
}
