// Showcase / storefront builder model.
//
// The operator panel "Menyu konstruktori" edits a free-form `showcase_config`
// JSON blob persisted on the store (GET/PATCH /api/stores/me). The public
// storefront reads the same blob from /api/shop/{slug}. This module owns the
// shape so it stays clean and is the single source of truth for block types,
// their slot counts, and their preview layout.

/**
 * Block-type registry. Each entry describes:
 *  - `label` : i18n key for the human label
 *  - `slots` : fixed slot count, or `null` for "N" blocks (variable, default 6)
 *  - `variable` : true when the block accepts any number of slots
 *  - `kind` : "grid" | "banner" | "slider" — drives the phone preview renderer
 *  - `rows` : grid template hint used by both the preview and the modal diagram,
 *             expressed as an array of column-counts per row (sums to `slots`).
 */
export const BLOCK_TYPES = {
  grid_3_2: { label: "blk_3_2", slots: 5, kind: "grid", rows: [3, 2] },
  grid_2_3: { label: "blk_2_3", slots: 5, kind: "grid", rows: [2, 3] },
  grid_3_3_3: { label: "blk_3_3_3", slots: 9, kind: "grid", rows: [3, 3, 3] },
  grid_1_2: { label: "blk_1_2", slots: 3, kind: "grid", rows: [1, 2] },
  grid_2_1: { label: "blk_2_1", slots: 3, kind: "grid", rows: [2, 1] },
  wide_square: { label: "blk_wide_square", slots: 2, kind: "grid", rows: [1, 1] },
  grid_3: { label: "blk_grid_3", slots: 3, kind: "grid", rows: [3] },
  grid_2: { label: "blk_grid_2", slots: 2, kind: "grid", rows: [2] },
  grid_3n: { label: "blk_grid_3n", slots: null, variable: true, kind: "grid", cols: 3 },
  grid_2n: { label: "blk_grid_2n", slots: null, variable: true, kind: "grid", cols: 2 },
  banner: { label: "blk_banner", slots: 1, kind: "banner", rows: [1] },
  slider: { label: "blk_slider", slots: null, variable: true, kind: "slider", cols: 3 },
};

export const DEFAULT_VARIABLE_SLOTS = 6;

/** How many slots a freshly-created block of `type` should start with. */
export function slotCountFor(type) {
  const def = BLOCK_TYPES[type];
  if (!def) return 0;
  return def.variable ? DEFAULT_VARIABLE_SLOTS : def.slots;
}

/** The four bottom-nav slots and their default emoji icons. */
export const MENU_ICON_KEYS = ["showcase", "catalog", "favorites", "cart"];

export const DEFAULT_MENU_ICONS = {
  showcase: "🛍️",
  catalog: "📋",
  favorites: "❤️",
  cart: "🛒",
};

/** A sensible non-empty starting config for stores with `{}`. */
export function defaultConfig() {
  return {
    blocks: [
      { id: makeBlockId(), type: "grid_2_3", title: "", slots: Array(5).fill(null) },
    ],
    showcase_visible: true,
    menu_visible: true,
    hide_bg: false,
    transparent_bg: false,
    outside_photo: false,
    menu_icons: { ...DEFAULT_MENU_ICONS },
  };
}

let _seq = 0;
/** Stable-enough unique id for a new block (config is client-authored). */
export function makeBlockId() {
  _seq += 1;
  return `b${Date.now().toString(36)}${_seq.toString(36)}`;
}

/**
 * Normalise a loaded config: fill missing top-level keys, coerce block slots to
 * the right length for their type, and drop unknown block types. Always returns
 * a fresh object safe to mutate via setState.
 */
export function normaliseConfig(raw) {
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.blocks) || raw.blocks.length === 0) {
    return defaultConfig();
  }
  const blocks = raw.blocks
    .filter((b) => b && BLOCK_TYPES[b.type])
    .map((b) => {
      const def = BLOCK_TYPES[b.type];
      let slots = Array.isArray(b.slots) ? b.slots.slice() : [];
      if (def.variable) {
        if (slots.length === 0) slots = Array(DEFAULT_VARIABLE_SLOTS).fill(null);
      } else {
        // Pad / trim to the exact fixed count.
        slots = slots.slice(0, def.slots);
        while (slots.length < def.slots) slots.push(null);
      }
      return {
        id: typeof b.id === "string" && b.id ? b.id : makeBlockId(),
        type: b.type,
        title: typeof b.title === "string" ? b.title : "",
        slots: slots.map((s) => (s == null ? null : s)),
      };
    });
  return {
    blocks: blocks.length ? blocks : defaultConfig().blocks,
    showcase_visible: raw.showcase_visible !== false,
    menu_visible: raw.menu_visible !== false,
    hide_bg: Boolean(raw.hide_bg),
    transparent_bg: Boolean(raw.transparent_bg),
    outside_photo: Boolean(raw.outside_photo),
    menu_icons: { ...DEFAULT_MENU_ICONS, ...(raw.menu_icons || {}) },
  };
}

/** Count of filled (non-null) slots in a block. */
export function filledCount(block) {
  return (block.slots || []).filter((s) => s != null).length;
}

/**
 * Resolve a block's slots into rows of `{ index, value }` for rendering both
 * the phone preview and the editor. Fixed blocks honour their `rows` template;
 * variable blocks wrap into `cols`-wide rows.
 */
export function blockRows(block) {
  const def = BLOCK_TYPES[block.type];
  const slots = block.slots || [];
  const cells = slots.map((value, index) => ({ index, value }));
  if (!def) return [cells];
  if (def.variable) {
    const cols = def.cols || 3;
    const rows = [];
    for (let i = 0; i < cells.length; i += cols) rows.push(cells.slice(i, i + cols));
    return rows.length ? rows : [[]];
  }
  // Fixed: slice by the row template (e.g. [3, 2]).
  const rows = [];
  let cursor = 0;
  for (const n of def.rows || [slots.length]) {
    rows.push(cells.slice(cursor, cursor + n));
    cursor += n;
  }
  return rows;
}

/** Top-bar toggle definitions: config key + i18n label key. */
export const TOGGLES = [
  { key: "showcase_visible", label: "mc_t_showcase" },
  { key: "menu_visible", label: "mc_t_menu" },
  { key: "hide_bg", label: "mc_t_hide_bg" },
  { key: "transparent_bg", label: "mc_t_transparent" },
  { key: "outside_photo", label: "mc_t_outside" },
];

// Modal groups: ready-made multi-row templates vs. single building blocks.
export const TEMPLATE_GROUPS = [
  {
    label: "mc_tpl_ready",
    types: ["grid_3_2", "grid_2_3", "grid_3_3_3", "grid_1_2", "grid_2_1", "wide_square"],
  },
  {
    label: "mc_tpl_single",
    types: ["grid_3", "grid_2", "grid_3n", "grid_2n", "banner", "slider"],
  },
];
