/**
 * Utility functions for currency and number formatting in KTM D-Printing POS
 */

export const money = (value: number): string =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

export const formatNumber = (value: number): string =>
  new Intl.NumberFormat("id-ID").format(value);

/**
 * Format user input string to Rupiah with dot thousand separator (e.g. 1000000 -> 1.000.000)
 */
export const formatRupiahInput = (value: string | number): string => {
  if (value === null || value === undefined || value === "") return "";
  const cleanDigits = String(value).replace(/\D/g, "");
  if (!cleanDigits) return "";
  return new Intl.NumberFormat("id-ID").format(Number(cleanDigits));
};

/**
 * Parse a Rupiah formatted string back to raw numeric value (e.g. "1.500.000" -> 1500000)
 */
export const parseRupiahInput = (value: string | number): number => {
  if (typeof value === "number") return isNaN(value) ? 0 : value;
  if (!value) return 0;
  const clean = String(value).replace(/\D/g, "");
  return clean ? Number(clean) : 0;
};
