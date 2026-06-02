import { motion } from "framer-motion";
import { ProductCard } from "./ProductCard";
import { gridContainer } from "../../lib/motion";
import { localName } from "../../lib/format";

export function CategorySection({ category, currency, onAdd }) {
  const products = category.products ?? [];
  if (products.length === 0) return null;

  return (
    <section className="scroll-mt-20">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
          {localName(category)}
        </h2>
        <span className="text-xs font-semibold text-muted-foreground">
          {products.length} ta
        </span>
      </div>

      <motion.div
        variants={gridContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 sm:gap-4"
      >
        {products.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            currency={currency}
            onAdd={onAdd}
          />
        ))}
      </motion.div>
    </section>
  );
}
