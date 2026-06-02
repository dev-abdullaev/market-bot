import { AnimatePresence, motion } from "framer-motion";
import { Minus, Plus, ShoppingBag, ShoppingCart, Trash2, X } from "lucide-react";
import { Sheet, SheetClose } from "../ui/Sheet";
import { Button } from "../ui/Button";
import { ProductImage } from "../ProductImage";
import { lineItem, spring } from "../../lib/motion";
import { localName, formatPrice } from "../../lib/format";

function Stepper({ qty, onDec, onInc }) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-border bg-muted/60 p-0.5">
      <button
        onClick={onDec}
        aria-label="Kamaytirish"
        className="flex h-7 w-7 items-center justify-center rounded-full bg-background text-foreground shadow-soft transition-colors hover:text-primary cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Minus className="h-3.5 w-3.5" strokeWidth={2.6} />
      </button>
      <motion.span
        key={qty}
        initial={{ scale: 0.6, opacity: 0.4 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={spring}
        className="w-7 text-center text-sm font-extrabold tabular-nums"
      >
        {qty}
      </motion.span>
      <button
        onClick={onInc}
        aria-label="Ko'paytirish"
        className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-soft transition-colors hover:bg-primary/90 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={2.6} />
      </button>
    </div>
  );
}

export function CartDrawer({ open, onOpenChange, cart, currency }) {
  const { list, total, count, setQty, remove } = cart;

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Savatcha"
      description="Tanlangan mahsulotlar ro'yxati"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-primary" strokeWidth={2.2} />
          <h2 className="font-display text-lg font-extrabold">Savatcha</h2>
          {count > 0 && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
              {count}
            </span>
          )}
        </div>
        <SheetClose asChild>
          <Button variant="ghost" size="icon" aria-label="Yopish" className="rounded-full">
            <X className="h-5 w-5" />
          </Button>
        </SheetClose>
      </div>

      {/* Body */}
      <div className="no-scrollbar flex-1 overflow-y-auto px-5 py-4">
        {list.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 py-16 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <ShoppingBag className="h-7 w-7 text-primary/40" strokeWidth={1.8} />
            </span>
            <p className="font-display text-base font-bold text-foreground">
              Savatcha bo'sh
            </p>
            <p className="max-w-[15rem] text-sm text-muted-foreground">
              Mahsulotlarni tanlab, savatga qo'shing.
            </p>
            <SheetClose asChild>
              <Button variant="soft" className="mt-1 rounded-full">
                Xaridni boshlash
              </Button>
            </SheetClose>
          </div>
        ) : (
          <ul className="space-y-3">
            <AnimatePresence initial={false}>
              {list.map(({ product, qty }) => (
                <motion.li
                  key={product.id}
                  layout
                  variants={lineItem}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="flex gap-3 overflow-hidden rounded-2xl border border-border bg-background p-2.5"
                >
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
                    <ProductImage src={product.photo_url} alt={localName(product)} />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <p className="line-clamp-1 text-sm font-bold text-foreground">
                      {localName(product)}
                    </p>
                    <p className="text-xs font-semibold text-accent">
                      {formatPrice(product.price, currency)}
                    </p>
                    <div className="mt-auto flex items-center justify-between pt-1.5">
                      <Stepper
                        qty={qty}
                        onDec={() => setQty(product.id, qty - 1)}
                        onInc={() => setQty(product.id, qty + 1)}
                      />
                      <button
                        onClick={() => remove(product.id)}
                        aria-label="O'chirish"
                        className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={2.1} />
                      </button>
                    </div>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>

      {/* Footer */}
      {list.length > 0 && (
        <div className="border-t border-border bg-background/80 px-5 py-4 backdrop-blur">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-muted-foreground">Jami</span>
            <motion.span
              key={total}
              initial={{ scale: 0.85, opacity: 0.5 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={spring}
              className="font-display text-xl font-extrabold text-foreground"
            >
              {formatPrice(total, currency)}
            </motion.span>
          </div>
          <Button variant="accent" size="lg" className="w-full rounded-2xl text-base">
            Buyurtma berish
          </Button>
        </div>
      )}
    </Sheet>
  );
}
