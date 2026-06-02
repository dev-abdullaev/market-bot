import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Plus } from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { ProductImage } from "../ProductImage";
import { cardItem, spring } from "../../lib/motion";
import { localName, localDesc, formatPrice } from "../../lib/format";

export function ProductCard({ product, currency, onAdd }) {
  const reduce = useReducedMotion();
  const [justAdded, setJustAdded] = useState(false);

  const handleAdd = () => {
    onAdd(product);
    setJustAdded(true);
    window.clearTimeout(handleAdd._t);
    handleAdd._t = window.setTimeout(() => setJustAdded(false), 1100);
  };

  return (
    <motion.div
      variants={cardItem}
      whileHover={reduce ? undefined : { y: -6, scale: 1.015 }}
      transition={spring}
      className="h-full"
    >
      <Card className="group flex h-full flex-col overflow-hidden transition-shadow duration-250 hover:shadow-lift">
        <div className="relative aspect-square overflow-hidden bg-muted">
          <ProductImage
            src={product.photo_url}
            alt={localName(product)}
            className="transition-transform duration-300 ease-out group-hover:scale-110"
          />
          {product.unit && (
            <span className="absolute left-2.5 top-2.5 rounded-full bg-background/85 px-2 py-0.5 text-[11px] font-bold text-foreground backdrop-blur">
              {product.unit}
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-1 p-3.5">
          <h3 className="line-clamp-2 font-display text-sm font-bold leading-snug text-foreground">
            {localName(product)}
          </h3>
          {localDesc(product) && (
            <p className="line-clamp-2 text-xs text-muted-foreground">
              {localDesc(product)}
            </p>
          )}

          <div className="mt-auto flex items-end justify-between gap-2 pt-2.5">
            <span className="font-display text-base font-extrabold text-accent">
              {formatPrice(product.price, currency)}
            </span>
            <Button
              size="iconSm"
              variant={justAdded ? "accent" : "primary"}
              onClick={handleAdd}
              aria-label={`${localName(product)} ni savatga qo'shish`}
              className="shrink-0 rounded-full overflow-hidden"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={justAdded ? "added" : "add"}
                  initial={reduce ? false : { scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={reduce ? undefined : { scale: 0.4, opacity: 0 }}
                  transition={spring}
                  className="flex items-center justify-center"
                >
                  {justAdded ? (
                    <Check className="h-4 w-4" strokeWidth={2.6} />
                  ) : (
                    <Plus className="h-4 w-4" strokeWidth={2.6} />
                  )}
                </motion.span>
              </AnimatePresence>
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
