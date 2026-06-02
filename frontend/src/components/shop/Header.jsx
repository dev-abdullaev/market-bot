import { AnimatePresence, motion } from "framer-motion";
import { ShoppingBag, Store } from "lucide-react";
import { Button } from "../ui/Button";
import { spring } from "../../lib/motion";

export function Header({ storeName, count, onOpenCart }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary text-white shadow-soft">
            <Store className="h-5 w-5" strokeWidth={2.2} />
          </span>
          <span className="truncate font-display text-lg font-bold leading-none text-foreground">
            {storeName || "Do'kon"}
          </span>
        </div>

        <Button
          variant="soft"
          size="md"
          onClick={onOpenCart}
          className="relative rounded-full px-4"
          aria-label={`Savatcha, ${count} ta mahsulot`}
        >
          <ShoppingBag className="h-5 w-5" strokeWidth={2.2} />
          <span className="hidden sm:inline">Savatcha</span>
          <AnimatePresence>
            {count > 0 && (
              <motion.span
                key={count}
                initial={{ scale: 0.2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.2, opacity: 0 }}
                transition={spring}
                className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold text-accent-foreground shadow-soft"
              >
                {count}
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </div>
    </header>
  );
}
