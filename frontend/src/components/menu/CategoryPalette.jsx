import { useMemo, useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { GripVertical, ImageOff, Search, Tags } from "lucide-react";
import { cn } from "../../lib/cn";
import { catName } from "../../lib/products";
import { t, tf } from "../../lib/i18n";
import { MENU_ICON_KEYS } from "../../lib/showcase";
import { Input } from "../ui/Input";
import { EmptyState } from "../panel/common";

/** Visual content of a category chip — reused by the list and the DragOverlay. */
export function CategoryChipBody({ cat, count, dragging = false }) {
  const img = cat?.image_url;
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-xl border border-border bg-background p-2 shadow-soft transition-colors",
        dragging ? "ring-2 ring-primary shadow-lift" : "hover:border-primary/40"
      )}
    >
      <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
      <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
        {img ? (
          <img src={img} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <ImageOff className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-foreground">
          {catName(cat) || `#${cat?.id}`}
        </p>
        {typeof count === "number" ? (
          <p className="text-xs text-muted-foreground">{tf("mc_products_count", { n: count })}</p>
        ) : null}
      </div>
    </div>
  );
}

/** One draggable category row. */
function DraggableCategory({ cat, count }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `cat:${cat.id}`,
    data: { type: "category", catId: cat.id },
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "cursor-grab touch-none rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing",
        isDragging && "opacity-40"
      )}
    >
      <CategoryChipBody cat={cat} count={count} />
    </div>
  );
}

/** Emoji/text input row for one bottom-nav icon. */
function IconRow({ labelKey, value, onChange }) {
  return (
    <label className="flex items-center gap-3 rounded-xl border border-border bg-background p-2.5 shadow-soft">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, 4))}
        maxLength={4}
        aria-label={t(labelKey)}
        className="h-11 w-11 shrink-0 rounded-lg border border-border bg-muted text-center text-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <span className="text-sm font-bold text-foreground">{t(labelKey)}</span>
    </label>
  );
}

const ICON_LABELS = {
  showcase: "mc_icon_showcase",
  catalog: "mc_icon_catalog",
  favorites: "mc_icon_favorites",
  cart: "mc_icon_cart",
};

/**
 * Middle column: tabbed "Kategoriyalar" (draggable list + search) /
 * "Ikonka sozlamalari" (4 menu-icon inputs).
 */
export function CategoryPalette({ categories, counts, menuIcons, onIconChange }) {
  const reduce = useReducedMotion();
  const [tab, setTab] = useState("categories");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return categories;
    return categories.filter((c) => catName(c).toLowerCase().includes(needle));
  }, [categories, q]);

  const tabs = [
    { id: "categories", label: t("mc_tab_categories") },
    { id: "icons", label: t("mc_tab_icons") },
  ];

  return (
    <div className="rounded-2xl border border-border bg-background p-3 shadow-soft">
      {/* Tabs */}
      <div className="mb-3 flex rounded-xl bg-muted p-1">
        {tabs.map((tb) => (
          <button
            key={tb.id}
            type="button"
            onClick={() => setTab(tb.id)}
            className={cn(
              "relative flex-1 rounded-lg px-3 py-1.5 text-sm font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              tab === tb.id ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab === tb.id ? (
              <motion.span
                layoutId="mc-pal-tab"
                className="absolute inset-0 -z-0 rounded-lg bg-primary"
                transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 400, damping: 32 }}
              />
            ) : null}
            <span className="relative z-10">{tb.label}</span>
          </button>
        ))}
      </div>

      {tab === "categories" ? (
        <>
          <div className="mb-3">
            <Input
              icon={Search}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("mc_search_cat")}
            />
          </div>
          <p className="mb-2 px-1 text-xs font-semibold text-muted-foreground">
            {t("mc_drag_hint")}
          </p>
          {filtered.length === 0 ? (
            <EmptyState
              icon={Tags}
              title={categories.length === 0 ? t("mc_no_cats") : t("empty")}
              hint={categories.length === 0 ? t("mc_no_cats_hint") : undefined}
            />
          ) : (
            <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
              {filtered.map((c) => (
                <DraggableCategory key={c.id} cat={c} count={counts?.get(c.id)} />
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="space-y-2.5">
          <p className="px-1 text-xs text-muted-foreground">{t("mc_icons_hint")}</p>
          <AnimatePresence initial={false}>
            {MENU_ICON_KEYS.map((key) => (
              <motion.div
                key={key}
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <IconRow
                  labelKey={ICON_LABELS[key]}
                  value={menuIcons?.[key] || ""}
                  onChange={(v) => onIconChange(key, v)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
