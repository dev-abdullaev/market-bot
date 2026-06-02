// Shared helpers for the operator panel.

/** Normalise a list response: backend sends bare arrays, but tolerate {results}. */
export function asList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

// Order status metadata: stable order + per-status tinted styling.
export const ORDER_STATUSES = [
  "new",
  "preparing",
  "delivering",
  "delivered",
  "cancelled",
];

// Tailwind class sets for status pills (kept as full literals so the JIT keeps them).
export const STATUS_STYLES = {
  new: "bg-primary/10 text-primary",
  preparing: "bg-amber-500/10 text-amber-600",
  delivering: "bg-secondary/10 text-secondary",
  delivered: "bg-accent/10 text-accent",
  cancelled: "bg-destructive/10 text-destructive",
};

export const STATUS_DOT = {
  new: "bg-primary",
  preparing: "bg-amber-500",
  delivering: "bg-secondary",
  delivered: "bg-accent",
  cancelled: "bg-destructive",
};

/** i18n key for a given status. */
export function statusKey(status) {
  return `status_${status}`;
}
