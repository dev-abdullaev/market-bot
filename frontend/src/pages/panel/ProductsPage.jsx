import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Eraser,
  Package,
  Pencil,
  Search,
  SlidersHorizontal,
  Upload,
} from "lucide-react";
import api from "../../lib/api";
import { t } from "../../lib/i18n";
import { formatPrice, localName } from "../../lib/format";
import { asList } from "../../lib/panel";
import {
  catName,
  childrenOf,
  indexCategories,
  ancestryOf,
  productStatus,
  coverImage,
  PRODUCT_STATUS_STYLES,
  PRODUCT_STATUS_DOT,
} from "../../lib/products";
import { cn } from "../../lib/cn";
import { Button } from "../../components/ui/Button";
import { Input, Select } from "../../components/ui/Input";
import { ProductImage } from "../../components/ProductImage";
import {
  ConfirmDelete,
  EmptyState,
  PageHeader,
  SkeletonList,
  Toast,
} from "../../components/panel/common";
import { ProductModal } from "../../components/products/ProductModal";
import { ImportModal } from "../../components/products/ImportModal";
import { AddProductMenu } from "../../components/products/AddProductMenu";
import { GlobalProductPicker } from "../../components/products/GlobalProductPicker";

const STATUS_LABEL = { active: "st_active", hidden: "st_hidden", out: "st_out" };

function StatusPill({ status }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold",
        PRODUCT_STATUS_STYLES[status]
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", PRODUCT_STATUS_DOT[status])} />
      {t(STATUS_LABEL[status])}
    </span>
  );
}

function DiscountedPrice({ product }) {
  if (product.has_discount && product.discount_price) {
    return (
      <span className="flex flex-col leading-tight">
        <span className="font-display text-sm font-extrabold text-accent">
          {formatPrice(product.discount_price)}
        </span>
        <span className="text-xs font-semibold text-muted-foreground line-through">
          {formatPrice(product.price)}
        </span>
      </span>
    );
  }
  return (
    <span className="font-display text-sm font-extrabold text-primary">
      {formatPrice(product.price)}
    </span>
  );
}

export default function ProductsPage() {
  const reduce = useReducedMotion();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState("");

  // Filters
  const [showFilters, setShowFilters] = useState(true);
  const [q, setQ] = useState("");
  const [cat1, setCat1] = useState("");
  const [cat2, setCat2] = useState("");
  const [cat3, setCat3] = useState("");
  const [status, setStatus] = useState("");

  // Modals
  const [editing, setEditing] = useState(null); // null | {} (new) | product
  const [modalOpen, setModalOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [globalOpen, setGlobalOpen] = useState(false);

  const catIndex = useMemo(() => indexCategories(categories), [categories]);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get("/products").then((r) => asList(r.data)).catch(() => []),
      api.get("/categories").then((r) => asList(r.data)).catch(() => []),
    ])
      .then(([p, c]) => {
        setProducts(p);
        setCategories(c);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    api
      .get("/stores/me")
      .then((r) => setStore(r.data))
      .catch(() => setStore(null));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(id);
  }, [toast]);

  // Cascading category selects: reset deeper levels when a parent changes.
  const roots = childrenOf(catIndex, null);
  const subs = cat1 ? childrenOf(catIndex, Number(cat1)) : [];
  const thirds = cat2 ? childrenOf(catIndex, Number(cat2)) : [];

  const selectedCatId = cat3 || cat2 || cat1;

  // Which category ids count as "in scope" for the selected filter (self + descendants).
  const inScope = useMemo(() => {
    if (!selectedCatId) return null;
    const ids = new Set();
    const walk = (id) => {
      ids.add(id);
      for (const ch of childrenOf(catIndex, id)) walk(ch.id);
    };
    walk(Number(selectedCatId));
    return ids;
  }, [selectedCatId, catIndex]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return products
      .filter((p) => {
        if (needle) {
          const hay = `${p.name_uz || ""} ${p.name_ru || ""}`.toLowerCase();
          if (!hay.includes(needle)) return false;
        }
        if (inScope && !inScope.has(Number(p.category))) return false;
        if (status && productStatus(p) !== status) return false;
        return true;
      })
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }, [products, q, inScope, status]);

  const clearFilters = () => {
    setQ("");
    setCat1("");
    setCat2("");
    setCat3("");
    setStatus("");
  };

  const hasFilters = q || cat1 || cat2 || cat3 || status;

  const openNew = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (p) => {
    setEditing(p);
    setModalOpen(true);
  };

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

  const categoryLabel = (p) => {
    const chain = ancestryOf(catIndex, Number(p.category));
    return chain.map((c) => catName(c)).join(" › ") || "—";
  };

  return (
    <div>
      <PageHeader
        icon={Package}
        title={t("products_title")}
        subtitle={t("products_found").replace("{n}", String(filtered.length))}
        action={
          <>
            <Button
              variant="outline"
              size="icon"
              aria-label={t("p_filters")}
              aria-pressed={showFilters}
              onClick={() => setShowFilters((v) => !v)}
              className={cn(showFilters && "border-primary text-primary")}
            >
              <SlidersHorizontal className="h-4 w-4" strokeWidth={2.2} />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" strokeWidth={2.2} />
              <span className="hidden sm:inline">{t("p_import")}</span>
            </Button>
            <AddProductMenu
              onManual={openNew}
              onGlobal={() => setGlobalOpen(true)}
            />
          </>
        }
      />

      {/* Filters */}
      <AnimatePresence initial={false}>
        {showFilters ? (
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, height: "auto" }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: 0.24 }}
            className="mb-5 overflow-hidden"
          >
            <div className="rounded-2xl border border-border bg-background p-3 shadow-soft sm:p-4">
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                <Input
                  icon={Search}
                  placeholder={t("p_search_ph")}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                <Select
                  value={cat1}
                  onChange={(e) => {
                    setCat1(e.target.value);
                    setCat2("");
                    setCat3("");
                  }}
                >
                  <option value="">{t("p_all_categories")}</option>
                  {roots.map((c) => (
                    <option key={c.id} value={c.id}>
                      {catName(c)}
                    </option>
                  ))}
                </Select>
                <Select
                  value={cat2}
                  disabled={!subs.length}
                  onChange={(e) => {
                    setCat2(e.target.value);
                    setCat3("");
                  }}
                >
                  <option value="">{t("p_all_subcategories")}</option>
                  {subs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {catName(c)}
                    </option>
                  ))}
                </Select>
                <Select
                  value={cat3}
                  disabled={!thirds.length}
                  onChange={(e) => setCat3(e.target.value)}
                >
                  <option value="">{t("p_all_third")}</option>
                  {thirds.map((c) => (
                    <option key={c.id} value={c.id}>
                      {catName(c)}
                    </option>
                  ))}
                </Select>
                <Select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="">{t("p_all_statuses")}</option>
                  <option value="active">{t("st_active")}</option>
                  <option value="hidden">{t("st_hidden")}</option>
                  <option value="out">{t("st_out")}</option>
                </Select>
                <Button
                  variant="ghost"
                  onClick={clearFilters}
                  disabled={!hasFilters}
                  className="justify-start sm:justify-center"
                >
                  <Eraser className="h-4 w-4" strokeWidth={2.2} />
                  {t("p_clear")}
                </Button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {loading ? (
        <SkeletonList rows={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title={hasFilters ? t("no_products_match") : t("no_products")}
          hint={hasFilters ? t("no_products_hint") : undefined}
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-2xl border border-border bg-background shadow-soft lg:block">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/60 text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-3 text-center">№</th>
                    <th className="px-3 py-3">{t("col_image")}</th>
                    <th className="px-3 py-3">{t("col_name")}</th>
                    <th className="px-3 py-3 text-center">{t("col_order")}</th>
                    <th className="px-3 py-3">{t("col_category")}</th>
                    <th className="px-3 py-3">{t("col_price")}</th>
                    <th className="px-3 py-3">{t("col_unit")}</th>
                    <th className="px-3 py-3">{t("col_packaging")}</th>
                    <th className="px-3 py-3">{t("col_status")}</th>
                    <th className="px-3 py-3 text-right">{t("col_actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p, i) => (
                    <motion.tr
                      key={p.id}
                      layout
                      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 320,
                        damping: 28,
                        delay: Math.min(i * 0.02, 0.18),
                      }}
                      className="border-b border-border last:border-0 transition-colors hover:bg-muted/40"
                    >
                      <td className="px-3 py-2.5 text-center font-semibold text-muted-foreground">
                        {i + 1}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="h-12 w-12 overflow-hidden rounded-xl border border-border">
                          <ProductImage
                            src={coverImage(p)}
                            alt={localName(p)}
                          />
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="font-display font-bold text-foreground">
                          {localName(p) || `#${p.id}`}
                        </p>
                        {p.brand ? (
                          <p className="text-xs text-muted-foreground">{p.brand}</p>
                        ) : null}
                      </td>
                      <td className="px-3 py-2.5 text-center font-semibold text-muted-foreground">
                        {p.sort_order ?? 0}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-xs text-muted-foreground">
                          {categoryLabel(p)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <DiscountedPrice product={p} />
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">{p.unit}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {p.packaging || "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusPill status={productStatus(p)} />
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="iconSm"
                            aria-label={t("edit")}
                            onClick={() => openEdit(p)}
                          >
                            <Pencil className="h-4 w-4" strokeWidth={2.2} />
                          </Button>
                          <ConfirmDelete
                            busy={busyId === p.id}
                            onConfirm={() => remove(p.id)}
                            className="h-8"
                          />
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <motion.div layout className="space-y-3 lg:hidden">
            <AnimatePresence initial={false}>
              {filtered.map((p, i) => (
                <motion.div
                  key={p.id}
                  layout
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 26,
                    delay: Math.min(i * 0.03, 0.18),
                  }}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-background p-3 shadow-soft"
                >
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border">
                    <ProductImage src={coverImage(p)} alt={localName(p)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate font-display text-sm font-bold text-foreground">
                        {localName(p) || `#${p.id}`}
                      </p>
                      <StatusPill status={productStatus(p)} />
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {categoryLabel(p)} · {p.unit}
                      {p.packaging ? ` · ${p.packaging}` : ""}
                    </p>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <DiscountedPrice product={p} />
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="iconSm"
                          aria-label={t("edit")}
                          onClick={() => openEdit(p)}
                        >
                          <Pencil className="h-4 w-4" strokeWidth={2.2} />
                        </Button>
                        <ConfirmDelete
                          busy={busyId === p.id}
                          onConfirm={() => remove(p.id)}
                          className="h-8"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </>
      )}

      <ProductModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        product={editing}
        categories={categories}
        supportUsername={store?.support_username}
        onSaved={() => {
          load();
          setToast(t("product_saved"));
        }}
      />

      <ImportModal
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={() => {
          load();
          setToast(t("import_done"));
        }}
      />

      <GlobalProductPicker
        open={globalOpen}
        onOpenChange={setGlobalOpen}
        categories={categories}
        onAdded={(msg) => {
          load();
          setToast(msg);
        }}
      />

      <Toast message={toast} />
    </div>
  );
}
