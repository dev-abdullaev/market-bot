/** Localised product name: prefer Uzbek, fall back to Russian. */
export function localName(item) {
  if (!item) return "";
  return item.name_uz?.trim() || item.name_ru?.trim() || "";
}

/** Localised description: prefer Uzbek, fall back to Russian. */
export function localDesc(item) {
  if (!item) return "";
  return item.description_uz?.trim() || item.description_ru?.trim() || "";
}

/**
 * Format a price with grouped thousands and the store currency.
 * The backend sends DecimalField strings like "12000.00".
 */
export function formatPrice(value, currency = "UZS") {
  const n = Number(value);
  if (!Number.isFinite(n)) return `${value} ${currency}`;
  const grouped = new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 0,
  }).format(n);
  return `${grouped} ${currency}`;
}
