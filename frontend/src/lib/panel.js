// Shared helpers for the operator panel.

/** Normalise a list response: backend sends bare arrays, but tolerate {results}. */
export function asList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

// Order status metadata: stable order + per-status tinted styling.
// ORDER_STATUSES drives the Kanban columns + status controls (5 mutable stages).
export const ORDER_STATUSES = [
  "new",
  "preparing",
  "delivering",
  "delivered",
  "cancelled",
];

// ANALYTICS_STATUSES is the full set surfaced in the dashboard status row.
// `accepted` is a read-only analytics bucket (not a Kanban column).
export const ANALYTICS_STATUSES = [
  "new",
  "accepted",
  "preparing",
  "delivering",
  "delivered",
  "cancelled",
];

// Tailwind class sets for status pills (kept as full literals so the JIT keeps them).
export const STATUS_STYLES = {
  new: "bg-primary/10 text-primary",
  accepted: "bg-sky-500/10 text-sky-600",
  preparing: "bg-amber-500/10 text-amber-600",
  delivering: "bg-secondary/10 text-secondary",
  delivered: "bg-accent/10 text-accent",
  cancelled: "bg-destructive/10 text-destructive",
};

export const STATUS_DOT = {
  new: "bg-primary",
  accepted: "bg-sky-500",
  preparing: "bg-amber-500",
  delivering: "bg-secondary",
  delivered: "bg-accent",
  cancelled: "bg-destructive",
};

// Hex equivalents for use in charts / inline styles (JIT can't see dynamic classes).
export const STATUS_HEX = {
  new: "#2563EB",
  accepted: "#0EA5E9",
  preparing: "#F59E0B",
  delivering: "#6366F1",
  delivered: "#059669",
  cancelled: "#DC2626",
};

/** i18n key for a given status. */
export function statusKey(status) {
  return `status_${status}`;
}
