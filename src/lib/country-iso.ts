// Maps the app's country labels (used in Settings) to ISO 3166-1 alpha-2 codes.
// Used to bias Mapbox geocoding results to the merchant's primary country.
const MAP: Record<string, string> = {
  uk: "GB",
  "united kingdom": "GB",
  gb: "GB",
  nigeria: "NG",
  ng: "NG",
  usa: "US",
  "united states": "US",
  us: "US",
  canada: "CA",
  ca: "CA",
  ghana: "GH",
  gh: "GH",
  kenya: "KE",
  ke: "KE",
  "south africa": "ZA",
  za: "ZA",
  india: "IN",
  in: "IN",
  uae: "AE",
  "united arab emirates": "AE",
  ae: "AE",
  australia: "AU",
  au: "AU",
  eu: "DE", // EU isn't a country code; bias to a central anchor
};

export function countryToIso(label?: string | null): string | undefined {
  if (!label) return undefined;
  const key = label.trim().toLowerCase();
  return MAP[key];
}
