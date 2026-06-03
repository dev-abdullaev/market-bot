import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown, Globe, Pencil, Plus } from "lucide-react";
import { t } from "../../lib/i18n";
import { cn } from "../../lib/cn";
import { Button } from "../ui/Button";

/**
 * The "+ Qo'shish" split button with a dropdown offering two ways to add a
 * product: manually (the rich modal) or from the shared global catalog.
 * Lightweight click-away dropdown — no extra dependency.
 */
export function AddProductMenu({ onManual, onGlobal }) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const choose = (fn) => () => {
    setOpen(false);
    fn?.();
  };

  const items = [
    { key: "p_add_manual", icon: Pencil, onClick: choose(onManual) },
    { key: "p_add_global", icon: Globe, onClick: choose(onGlobal) },
  ];

  return (
    <div ref={wrapRef} className="relative">
      <Button
        size="sm"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Plus className="h-4 w-4" strokeWidth={2.4} />
        {t("p_add")}
        <ChevronDown
          className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
          strokeWidth={2.4}
        />
      </Button>

      <AnimatePresence>
        {open ? (
          <motion.div
            role="menu"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            className="absolute right-0 z-30 mt-2 w-60 origin-top-right overflow-hidden rounded-2xl border border-border bg-background p-1.5 shadow-lift"
          >
            {items.map((it) => (
              <button
                key={it.key}
                type="button"
                role="menuitem"
                onClick={it.onClick}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-foreground transition-colors hover:bg-muted cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <it.icon className="h-4 w-4" strokeWidth={2.2} />
                </span>
                {t(it.key)}
              </button>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
