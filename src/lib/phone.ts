// Default country dialing codes by ISO country / country name used in companies.country
const COUNTRY_DIAL_CODES: Record<string, string> = {
  UK: "44", GB: "44", "UNITED KINGDOM": "44",
  US: "1", USA: "1", "UNITED STATES": "1",
  CA: "1", CANADA: "1",
  NG: "234", NIGERIA: "234",
  GH: "233", GHANA: "233",
  KE: "254", KENYA: "254",
  ZA: "27", "SOUTH AFRICA": "27",
  IN: "91", INDIA: "91",
  AE: "971", UAE: "971", "UNITED ARAB EMIRATES": "971",
  AU: "61", AUSTRALIA: "61",
  IE: "353", IRELAND: "353",
  FR: "33", FRANCE: "33",
  DE: "49", GERMANY: "49",
  ES: "34", SPAIN: "34",
  IT: "39", ITALY: "39",
};

/**
 * Normalize a phone number to E.164-style digits-only (no + sign), suitable for wa.me links.
 * - Strips all non-digit characters.
 * - If number starts with "00", trims leading zeros (international prefix).
 * - If number starts with a single "0" (national trunk), replaces with the company's country code.
 * - If number has no country code (short), prefixes with the company's country code.
 *
 * @param raw The raw phone/whatsapp string from the database.
 * @param countryHint The company's country (e.g. "UK", "Nigeria", "US"). Used to infer dial code.
 * @returns Digits-only string ready for `https://wa.me/{number}`, or empty string if invalid.
 */
export function normalizePhoneForWhatsApp(raw: string | null | undefined, countryHint?: string | null): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  // Detect if user explicitly typed +country code
  const hasPlus = trimmed.startsWith("+");
  let digits = trimmed.replace(/[^0-9]/g, "");
  if (!digits) return "";

  // Handle "00" international prefix → drop it
  if (digits.startsWith("00")) {
    digits = digits.slice(2);
    return digits;
  }

  if (hasPlus) {
    // Already in international form
    return digits;
  }

  const dialCode = countryHint
    ? COUNTRY_DIAL_CODES[countryHint.trim().toUpperCase()] || ""
    : "";

  // Leading 0 = national trunk prefix → replace with dial code
  if (digits.startsWith("0")) {
    if (dialCode) return dialCode + digits.slice(1);
    return digits.slice(1); // best-effort: drop the leading 0
  }

  // No leading 0 and no +: if short, assume missing country code
  if (dialCode && digits.length <= 10) {
    // If it doesn't already start with the dial code, prefix it
    if (!digits.startsWith(dialCode)) return dialCode + digits;
  }

  return digits;
}

/** Build a wa.me URL with optional pre-filled text. Returns empty string if number invalid. */
export function buildWhatsAppUrl(raw: string | null | undefined, countryHint?: string | null, text?: string): string {
  const num = normalizePhoneForWhatsApp(raw, countryHint);
  if (!num) return "";
  const base = `https://wa.me/${num}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
