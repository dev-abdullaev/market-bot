import { motion, useReducedMotion } from "framer-motion";
import { ImageOff } from "lucide-react";
import { cn } from "../../lib/cn";
import { catName } from "../../lib/products";
import { t } from "../../lib/i18n";
import { BLOCK_TYPES, blockRows, MENU_ICON_KEYS } from "../../lib/showcase";

/** A single category tile inside the preview (image + name overlay). */
function PreviewTile({ catId, byId, tall = false, wide = false }) {
  const cat = catId != null ? byId.get(catId) : null;
  const name = cat ? catName(cat) : "";
  const img = cat?.image_url;
  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-lg",
        tall ? "aspect-[2/1]" : wide ? "aspect-[2.4/1]" : "aspect-square",
        catId == null
          ? "border border-dashed border-primary/25 bg-primary/5"
          : "bg-muted"
      )}
    >
      {img ? (
        <img src={img} alt="" className="h-full w-full object-cover" loading="lazy" />
      ) : catId == null ? (
        <ImageOff className="h-4 w-4 text-primary/30" strokeWidth={2} />
      ) : (
        <span className="px-1 text-center text-[8px] font-bold leading-tight text-muted-foreground">
          {name || `#${catId}`}
        </span>
      )}
      {catId != null && img ? (
        <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-foreground/75 to-transparent px-1.5 pb-1 pt-3 text-[8px] font-bold text-background">
          {name || `#${catId}`}
        </span>
      ) : null}
    </div>
  );
}

/** Renders one block honouring its kind (grid / banner / slider). */
function PreviewBlock({ block, byId }) {
  const def = BLOCK_TYPES[block.type] || {};
  const title = block.title?.trim();

  if (def.kind === "banner") {
    return (
      <div className="space-y-1.5">
        {title ? <p className="text-[10px] font-extrabold text-foreground">{title}</p> : null}
        <PreviewTile catId={block.slots?.[0] ?? null} byId={byId} wide />
      </div>
    );
  }

  if (def.kind === "slider") {
    return (
      <div className="space-y-1.5">
        {title ? <p className="text-[10px] font-extrabold text-foreground">{title}</p> : null}
        <div className="flex gap-1.5 overflow-hidden">
          {(block.slots || []).map((catId, i) => (
            <div key={i} className="w-[30%] shrink-0">
              <PreviewTile catId={catId ?? null} byId={byId} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Grid: render the resolved rows.
  const rows = blockRows(block);
  return (
    <div className="space-y-1.5">
      {title ? <p className="text-[10px] font-extrabold text-foreground">{title}</p> : null}
      <div className="space-y-1.5">
        {rows.map((cells, r) => (
          <div
            key={r}
            className="grid gap-1.5"
            style={{ gridTemplateColumns: `repeat(${cells.length || 1}, minmax(0, 1fr))` }}
          >
            {cells.map((cell) => (
              <PreviewTile key={cell.index} catId={cell.value} byId={byId} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

const NAV_LABELS = ["mc_nav_showcase", "mc_nav_catalog", "mc_nav_favorites", "mc_nav_cart"];

/**
 * Live phone-frame preview of the storefront for the current config. Re-renders
 * as the config changes. `byId` is the category index (Map id -> category).
 */
export function PhonePreview({ config, storeName, byId }) {
  const reduce = useReducedMotion();
  const icons = config.menu_icons || {};
  const blocks = config.showcase_visible ? config.blocks || [] : [];

  return (
    <div className="sticky top-20">
      <p className="mb-3 font-display text-sm font-bold text-foreground">
        {t("mc_preview_title")}
      </p>
      <div className="mx-auto w-[260px] max-w-full">
        {/* Phone frame */}
        <div className="relative rounded-[2.2rem] border-[6px] border-foreground/90 bg-foreground/90 shadow-lift">
          {/* Notch */}
          <div className="absolute left-1/2 top-1 z-10 h-1.5 w-16 -translate-x-1/2 rounded-full bg-background/30" />
          <div className="relative flex h-[520px] flex-col overflow-hidden rounded-[1.7rem] bg-background">
            {/* Store header */}
            <div className="flex shrink-0 items-center gap-2 border-b border-border bg-gradient-to-r from-primary to-secondary px-3 py-2.5 text-primary-foreground">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-background/20 text-[11px] font-extrabold">
                {(storeName || "S").charAt(0).toUpperCase()}
              </span>
              <span className="truncate text-xs font-extrabold">
                {storeName || "MarketBot"}
              </span>
            </div>

            {/* Scrollable storefront body */}
            <div
              className={cn(
                "flex-1 space-y-3 overflow-y-auto px-3 py-3",
                config.hide_bg ? "bg-background" : "bg-muted/60",
                config.transparent_bg && "bg-transparent"
              )}
            >
              {blocks.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                  <span className="text-2xl">🛍️</span>
                  <p className="text-[10px] font-bold text-muted-foreground">
                    {config.showcase_visible ? t("mc_no_blocks") : t("mc_t_showcase")}
                  </p>
                </div>
              ) : (
                blocks.map((block) => (
                  <motion.div
                    key={block.id}
                    layout={!reduce}
                    initial={reduce ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 320, damping: 30 }}
                  >
                    <PreviewBlock block={block} byId={byId} />
                  </motion.div>
                ))
              )}
            </div>

            {/* Bottom nav */}
            {config.menu_visible ? (
              <div className="grid shrink-0 grid-cols-4 border-t border-border bg-background px-1 py-1.5">
                {MENU_ICON_KEYS.map((key, i) => (
                  <div
                    key={key}
                    className={cn(
                      "flex flex-col items-center gap-0.5 rounded-lg py-1",
                      i === 0 ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    <span className="text-base leading-none">
                      {icons[key] || "•"}
                    </span>
                    <span className="text-[7px] font-bold">{t(NAV_LABELS[i])}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
