// Shared constants + helpers for the operator-panel Products feature.
import { getLang } from "./i18n";

export const UNITS = ["dona", "kg", "litr", "portsiya"];

// Packaging options. Values are stored verbatim on `product.packaging`.
export const PACKAGING = [
  { value: "Idishsiz", key: "pack_none" },
  { value: "Paket", key: "pack_paket" },
  { value: "Quti", key: "pack_quti" },
  { value: "Idish", key: "pack_idish" },
];

export const SEASONS = [
  { value: "all_season", key: "season_all" },
  { value: "winter", key: "season_winter" },
  { value: "summer", key: "season_summer" },
  { value: "spring", key: "season_spring" },
  { value: "autumn", key: "season_autumn" },
];

export const MAX_IMAGES = 5;

/** Localised category name honouring the chosen language. */
export function catName(c) {
  if (!c) return "";
  return getLang() === "ru"
    ? c.name_ru || c.name_uz || ""
    : c.name_uz || c.name_ru || "";
}

/**
 * Build a parent->children index and roots list from a flat category array.
 * Categories are hierarchical via `parent` (id or null for roots).
 */
export function indexCategories(cats = []) {
  const byId = new Map();
  const children = new Map();
  for (const c of cats) byId.set(c.id, c);
  for (const c of cats) {
    const p = c.parent ?? null;
    if (!children.has(p)) children.set(p, []);
    children.get(p).push(c);
  }
  const sortFn = (a, b) =>
    (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
    catName(a).localeCompare(catName(b));
  for (const arr of children.values()) arr.sort(sortFn);
  const roots = children.get(null) || [];
  return { byId, children, roots };
}

/** Direct children of `parentId` (null = roots). */
export function childrenOf(index, parentId) {
  return index?.children?.get(parentId ?? null) || [];
}

/**
 * Roots for category PICKERS: the first root is a structural store container
 * (e.g. "Mağoza") that should never be a selectable category, so it is hidden
 * and its direct children are promoted to the top level. Any additional roots
 * are kept as-is. Used wherever a user assigns/filters by a real category.
 */
export function visibleRoots(index) {
  const roots = childrenOf(index, null);
  if (roots.length === 0) return [];
  const [first, ...rest] = roots;
  const promoted = childrenOf(index, first.id);
  if (rest.length === 0) return promoted; // single container root → its children
  const sortFn = (a, b) =>
    (a.sort_order ?? 0) - (b.sort_order ?? 0) || catName(a).localeCompare(catName(b));
  return [...promoted, ...rest].sort(sortFn);
}

/**
 * Flatten the category tree into options with an indentation depth so a plain
 * <select> can still convey hierarchy (e.g. "— Sub" / "—— Third").
 *
 * `hideFirstRoot` (opt-in, default false → backwards-compatible): start the walk
 * from {@link visibleRoots} so the structural first root is omitted and its
 * children appear at the top level. Display/management callers omit the flag.
 */
export function flattenCategories(index, { hideFirstRoot = false } = {}) {
  const out = [];
  const walk = (parentId, depth) => {
    for (const c of childrenOf(index, parentId)) {
      out.push({ id: c.id, name: catName(c), depth });
      walk(c.id, depth + 1);
    }
  };
  if (hideFirstRoot) {
    for (const r of visibleRoots(index)) {
      out.push({ id: r.id, name: catName(r), depth: 0 });
      walk(r.id, 1);
    }
  } else {
    walk(null, 0);
  }
  return out;
}

/**
 * Resolve the ancestry chain [root, sub, third...] for a category id.
 * Returns an array of category objects from root to the given node.
 */
export function ancestryOf(index, id) {
  const chain = [];
  if (!index?.byId) return chain;
  let cur = index.byId.get(id);
  let guard = 0;
  while (cur && guard < 12) {
    chain.unshift(cur);
    cur = cur.parent != null ? index.byId.get(cur.parent) : null;
    guard += 1;
  }
  return chain;
}

/** A product's display status: out-of-stock > hidden > active. */
export function productStatus(p) {
  if (p.in_stock === false) return "out";
  if (p.is_hidden) return "hidden";
  return "active";
}

/** First usable image URL for a product (cover). */
export function coverImage(p) {
  if (!p) return null;
  if (p.photo_url) return p.photo_url;
  if (Array.isArray(p.images) && p.images.length) return p.images[0];
  return p.image_url || null;
}

export const PRODUCT_STATUS_STYLES = {
  active: "bg-accent/10 text-accent",
  hidden: "bg-amber-500/10 text-amber-600",
  out: "bg-destructive/10 text-destructive",
};

export const PRODUCT_STATUS_DOT = {
  active: "bg-accent",
  hidden: "bg-amber-500",
  out: "bg-destructive",
};
