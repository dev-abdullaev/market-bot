import { motion, useReducedMotion } from "framer-motion";
import { Plus } from "lucide-react";
import { cn } from "../../lib/cn";
import { t, tf } from "../../lib/i18n";
import { BLOCK_TYPES, TEMPLATE_GROUPS, slotCountFor } from "../../lib/showcase";
import { Modal } from "../ui/Modal";
import { BlockDiagram } from "./BlockDiagram";

function TemplateCard({ type, onPick, index }) {
  const reduce = useReducedMotion();
  const def = BLOCK_TYPES[type];
  const count = slotCountFor(type);
  return (
    <motion.button
      type="button"
      onClick={() => onPick(type)}
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 320, damping: 26, delay: Math.min(index * 0.025, 0.2) }}
      whileHover={reduce ? undefined : { y: -3 }}
      whileTap={reduce ? undefined : { scale: 0.97 }}
      className="group flex flex-col gap-2.5 rounded-2xl border border-border bg-background p-3 text-left shadow-soft transition-colors hover:border-primary/50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex h-16 items-stretch rounded-xl bg-muted/70 p-2">
        <BlockDiagram type={type} className="w-full" />
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold text-foreground">{t(def.label)}</p>
          <p className="text-xs text-muted-foreground">
            {def.variable ? `N (${count})` : tf("mc_products_count", { n: count })}
          </p>
        </div>
        <span
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors",
            "group-hover:bg-primary group-hover:text-primary-foreground"
          )}
        >
          <Plus className="h-4 w-4" strokeWidth={2.6} />
        </span>
      </div>
    </motion.button>
  );
}

/** "+ Blok qo'shish" modal: pick a template/single block to append. */
export function AddBlockModal({ open, onOpenChange, onPick }) {
  const pick = (type) => {
    onPick(type);
    onOpenChange(false);
  };
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="xl"
      title={t("mc_modal_title")}
      header={
        <div className="pb-4">
          <h2 className="font-display text-lg font-extrabold text-foreground">
            {t("mc_modal_title")}
          </h2>
        </div>
      }
    >
      <div className="space-y-6">
        {TEMPLATE_GROUPS.map((group) => (
          <section key={group.label}>
            <h3 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-muted-foreground">
              {t(group.label)}
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {group.types.map((type, i) => (
                <TemplateCard key={type} type={type} index={i} onPick={pick} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </Modal>
  );
}
