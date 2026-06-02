import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Package, Pencil, Plus } from "lucide-react";
import api from "../../lib/api";
import { t } from "../../lib/i18n";
import { formatPrice, localName } from "../../lib/format";
import { asList } from "../../lib/panel";
import { Button } from "../../components/ui/Button";
import { ProductImage } from "../../components/ProductImage";
import {
  ConfirmDelete,
  EmptyState,
  PageHeader,
  SkeletonList,
} from "../../components/panel/common";

function ProductRow({ product, onDelete, busy, index }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      layout
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 26,
        delay: Math.min(index * 0.035, 0.2),
      }}
      className="flex items-center gap-4 rounded-2xl border border-border bg-background p-3 shadow-soft sm:p-4"
    >
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-border sm:h-16 sm:w-16">
        <ProductImage src={product.photo_url || product.image_url} alt={localName(product)} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-sm font-bold text-foreground sm:text-base">
          {localName(product) || `#${product.id}`}
        </p>
        <p className="font-display text-base font-extrabold text-primary">
          {formatPrice(product.price)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Link to={`/webapp/product/${product.id}`}>
          <Button variant="outline" size="sm">
            <Pencil className="h-4 w-4" strokeWidth={2.2} />
            <span className="hidden sm:inline">{t("edit")}</span>
          </Button>
        </Link>
        <ConfirmDelete busy={busy} onConfirm={() => onDelete(product.id)} />
      </div>
    </motion.div>
  );
}

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    let alive = true;
    api
      .get("/products")
      .then((r) => alive && setProducts(asList(r.data)))
      .catch(() => alive && setProducts([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const remove = async (id) => {
    setBusyId(id);
    try {
      await api.delete(`/products/${id}`);
      setProducts((list) => list.filter((p) => p.id !== id));
    } catch {
      /* keep row on failure */
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <PageHeader
        icon={Package}
        title={t("nav_products")}
        action={
          <Link to="/webapp/product">
            <Button size="sm">
              <Plus className="h-4 w-4" strokeWidth={2.4} />
              {t("add_product")}
            </Button>
          </Link>
        }
      />

      {loading ? (
        <SkeletonList rows={5} />
      ) : products.length === 0 ? (
        <EmptyState icon={Package} title={t("no_products")} />
      ) : (
        <motion.div layout className="space-y-3">
          <AnimatePresence initial={false}>
            {products.map((p, i) => (
              <ProductRow
                key={p.id}
                product={p}
                index={i}
                busy={busyId === p.id}
                onDelete={remove}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
