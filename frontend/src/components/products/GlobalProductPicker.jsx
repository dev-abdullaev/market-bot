import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Globe,
  Inbox,
  Lock,
  PackageSearch,
  Search,
} from "lucide-react";
import api from "../../lib/api";
import { t, tf, pname } from "../../lib/i18n";
import { cn } from "../../lib/cn";
import { flattenCategories, indexCategories } from "../../lib/products";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Spinner } from "../ui/Spinner";

const PAGE_SIZE = 20;

function Thumb({ src }) {
  const [failed, setFailed] = useState(!src);
  if (failed) {
    return (
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground/60">
        <Lock className="h-4 w-4" strokeWidth={2} />
      </div>
    );
  }
  return (
    <img src={src} alt="" loading="lazy" onError={() => setFailed(true)}
      className="h-11 w-11 shrink-0 rounded-lg border border-border object-cover" />
  );
}

function CheckBox({ checked }) {
  return (
    <span className={cn(
      "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
      checked ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"
    )}>
      {checked ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
    </span>
  );
}

/** Left-pane row (checkable) */
function LeftRow({ product, checked, onToggle }) {
  return (
    <button type="button" onClick={onToggle}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border bg-background p-2.5 text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        checked ? "border-primary/60 bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/50"
      )}>
      <CheckBox checked={checked} />
      <Thumb src={product.image_url} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-sm font-bold text-foreground">
          {pname(product) || `#${product.id}`}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {t("gp_barcode")}: <span className="font-medium">{product.barcode || "—"}</span>
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {t("gp_rec_cat")}: {product.recommended_category || "—"}
        </p>
      </div>
    </button>
  );
}

/** Inline category dropdown (searchable flat list) */
function CategoryDropdown({ catIndex, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef(null);

  const flat = useMemo(() => flattenCategories(catIndex, { hideFirstRoot: true }), [catIndex]);
  const filtered = useMemo(() => {
    if (!q.trim()) return flat;
    const lo = q.toLowerCase();
    return flat.filter(c => c.name.toLowerCase().includes(lo));
  }, [flat, q]);

  const selected = useMemo(() =>
    flat.find(c => c.id === value), [flat, value]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="flex h-9 w-full items-center justify-between gap-2 rounded-xl border border-border bg-background px-3 text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer">
        <span className={cn("truncate", value ? "text-foreground font-semibold" : "text-muted-foreground")}>
          {selected ? selected.name : t("gp_cat_placeholder")}
        </span>
        <ChevronRight className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-90")} strokeWidth={2.2} />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="absolute left-0 right-0 z-50 mt-1 max-h-52 overflow-hidden rounded-xl border border-border bg-background shadow-lift">
            <div className="border-b border-border p-2">
              <Input icon={Search} placeholder={t("gp_cat_search")}
                value={q} onChange={e => setQ(e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="max-h-40 overflow-y-auto">
              <button type="button" onClick={() => { onChange(null); setOpen(false); setQ(""); }}
                className="flex w-full items-center px-3 py-2 text-sm text-muted-foreground hover:bg-muted cursor-pointer">
                — {t("no_category")} —
              </button>
              {filtered.map(c => (
                <button key={c.id} type="button"
                  onClick={() => { onChange(c.id); setOpen(false); setQ(""); }}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-muted",
                    c.id === value ? "bg-primary/5 font-bold text-primary" : "text-foreground"
                  )}
                  style={{ paddingLeft: `${12 + c.depth * 16}px` }}>
                  {c.depth > 0 ? <span className="text-muted-foreground">└</span> : null}
                  {c.name}
                </button>
              ))}
              {!filtered.length && (
                <p className="px-3 py-2 text-xs text-muted-foreground">{t("gp_none_found")}</p>
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/** Right-pane row with price input + category selector */
function RightRow({ product, entry, catIndex, checked, onToggle, onPriceChange, onCategoryChange }) {
  const rec = product.recommended_category;
  return (
    <div className={cn(
      "rounded-xl border bg-background p-3 transition-colors",
      checked ? "border-primary/60 bg-primary/5" : "border-border"
    )}>
      <div className="flex items-start gap-3">
        <button type="button" onClick={onToggle}
          className="mt-0.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md">
          <CheckBox checked={checked} />
        </button>
        <Thumb src={product.image_url} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-sm font-bold text-foreground">
            {pname(product) || `#${product.id}`}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("gp_barcode")}: {product.barcode || "—"}
          </p>
        </div>
      </div>

      <div className="mt-2.5 grid grid-cols-[1fr_1.6fr] gap-2">
        <div>
          <label className="mb-1 block text-xs font-bold text-foreground">
            {t("gp_price_label")} <span className="text-destructive">*</span>
          </label>
          <input
            type="number" min="0" step="100"
            placeholder="0"
            value={entry.price}
            onChange={e => onPriceChange(e.target.value)}
            className="h-9 w-full rounded-xl border border-border bg-background px-3 text-sm font-semibold text-foreground shadow-soft transition-all focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-foreground">
            {t("field_category")}
          </label>
          <CategoryDropdown catIndex={catIndex} value={entry.category_id} onChange={onCategoryChange} />
        </div>
      </div>

      {rec ? (
        <p className="mt-1.5 text-xs text-muted-foreground">
          {t("gp_rec_cat")}: <span className="font-medium">{rec}</span>
        </p>
      ) : null}
    </div>
  );
}

function Pane({ title, count, children, className }) {
  return (
    <div className={cn(
      "flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-muted/30",
      className
    )}>
      <div className="flex items-center justify-between gap-2 border-b border-border px-3.5 py-2.5">
        <span className="font-display text-sm font-extrabold text-foreground">{title}</span>
        <span className="rounded-full bg-background px-2 py-0.5 text-xs font-bold text-muted-foreground shadow-soft">
          {count}
        </span>
      </div>
      {children}
    </div>
  );
}

export function GlobalProductPicker({ open, onOpenChange, onAdded, categories = [] }) {
  const catIndex = useMemo(() => indexCategories(categories), [categories]);

  const [qName, setQName] = useState("");
  const [qBarcode, setQBarcode] = useState("");
  const [items, setItems] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // selection: Map<id, {product, price, category_id}>
  const [selected, setSelected] = useState(new Map());
  const [leftChecked, setLeftChecked] = useState(new Set());
  const [rightChecked, setRightChecked] = useState(new Set());
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");

  const reqId = useRef(0);

  // Reset all state when the modal opens. Wrapped in a timeout so React
  // processes the open=true render first (avoids the sync-setState-in-effect lint rule).
  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => {
      setQName(""); setQBarcode(""); setSelected(new Map());
      setLeftChecked(new Set()); setRightChecked(new Set());
      setError(""); setAddError("");
    }, 0);
    return () => clearTimeout(id);
  }, [open]);

  const fetchPage = useCallback(async (nextPage, replace) => {
    const mine = ++reqId.current;
    setLoading(true); setError("");
    try {
      const { data } = await api.get("/global-products", {
        params: { q: qName.trim() || undefined, barcode: qBarcode.trim() || undefined, page: nextPage, page_size: PAGE_SIZE },
      });
      if (mine !== reqId.current) return;
      const results = data?.results ?? [];
      setItems(prev => replace ? results : [...prev, ...results]);
      setCount(data?.count ?? results.length);
      setHasNext(Boolean(data?.next));
      setPage(nextPage);
    } catch {
      if (mine !== reqId.current) return;
      setError(t("error"));
      if (replace) { setItems([]); setCount(0); setHasNext(false); }
    } finally {
      if (mine === reqId.current) setLoading(false);
    }
  }, [qName, qBarcode]);

  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => fetchPage(1, true), 300);
    return () => clearTimeout(id);
  }, [open, qName, qBarcode, fetchPage]);

  const leftItems = useMemo(() => items.filter(p => !selected.has(p.id)), [items, selected]);
  const rightItems = useMemo(() => Array.from(selected.values()), [selected]);

  const moveRight = () => {
    if (!leftChecked.size) return;
    setSelected(prev => {
      const next = new Map(prev);
      for (const p of items) {
        if (leftChecked.has(p.id) && !next.has(p.id)) {
          next.set(p.id, { product: p, price: "", category_id: null });
        }
      }
      return next;
    });
    setLeftChecked(new Set());
  };

  const moveLeft = () => {
    if (!rightChecked.size) return;
    setSelected(prev => { const next = new Map(prev); for (const id of rightChecked) next.delete(id); return next; });
    setRightChecked(new Set());
  };

  const updateEntry = (id, patch) =>
    setSelected(prev => { const next = new Map(prev); const e = next.get(id); if (e) next.set(id, { ...e, ...patch }); return next; });

  // validate: all items need a price > 0
  const priceErrors = useMemo(() => {
    const bad = [];
    for (const [id, e] of selected) {
      if (!e.price || Number(e.price) <= 0) bad.push(id);
    }
    return new Set(bad);
  }, [selected]);

  const confirm = async () => {
    if (priceErrors.size) { setAddError(t("gp_price_required")); return; }
    const payload = Array.from(selected.entries()).map(([id, e]) => ({
      id, price: e.price, category_id: e.category_id || null,
    }));
    setAdding(true); setAddError("");
    try {
      const { data } = await api.post("/global-products/add-to-store", { items: payload });
      const created = data?.created ?? 0, skipped = data?.skipped ?? 0;
      let msg;
      if (created && skipped) msg = tf("gp_added_some", { n: created, s: skipped });
      else if (created) msg = tf("gp_added", { n: created });
      else msg = t("gp_added_none");
      onAdded?.(msg);
      onOpenChange(false);
    } catch { setAddError(t("error")); }
    finally { setAdding(false); }
  };

  const header = (
    <div className="flex items-center gap-2.5 pb-3 pr-10 pt-1">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary text-primary-foreground shadow-soft">
        <Globe className="h-5 w-5" strokeWidth={2.2} />
      </span>
      <h2 className="font-display text-lg font-extrabold text-foreground">{t("gp_title")}</h2>
    </div>
  );

  const footer = (
    <div className="flex items-center justify-between gap-3">
      {addError ? (
        <p className="text-sm font-semibold text-destructive">{addError}</p>
      ) : (
        <span className="hidden text-sm font-semibold text-muted-foreground sm:block">
          {selected.size ? `${selected.size} ${t("gp_right").toLowerCase()}` : ""}
        </span>
      )}
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={adding}>{t("gp_cancel")}</Button>
        <Button onClick={confirm} disabled={adding || selected.size === 0} className="min-w-36">
          {adding ? <Spinner className="text-primary-foreground" size={16} /> : null}
          {t("gp_add_btn")}{selected.size ? ` (${selected.size})` : ""}
        </Button>
      </div>
    </div>
  );

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={t("gp_title")}
      header={header} footer={footer} size="3xl" className="sm:max-h-[90svh]">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto_1fr]">
        {/* Left: catalog */}
        <Pane title={t("gp_left")} count={count} className="h-[56svh] lg:h-[60vh]">
          <div className="grid grid-cols-1 gap-2 border-b border-border p-2.5 sm:grid-cols-2">
            <Input icon={Search} placeholder={t("gp_search_name")} value={qName} onChange={e => setQName(e.target.value)} />
            <Input icon={Search} placeholder={t("gp_search_barcode")} inputMode="numeric" value={qBarcode} onChange={e => setQBarcode(e.target.value)} />
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2.5">
            {error ? <p className="px-2 py-1 text-sm font-semibold text-destructive">{error}</p> : null}
            {leftItems.length === 0 && loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl border border-border bg-muted/60" />
              ))
            ) : leftItems.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center gap-2">
                <PackageSearch className="h-8 w-8 text-muted-foreground/50" strokeWidth={1.6} />
                <p className="text-sm font-semibold text-muted-foreground">{t("gp_none_found")}</p>
              </div>
            ) : (
              <>
                {leftItems.map(p => (
                  <LeftRow key={p.id} product={p} checked={leftChecked.has(p.id)}
                    onToggle={() => setLeftChecked(prev => { const n = new Set(prev); n.has(p.id) ? n.delete(p.id) : n.add(p.id); return n; })} />
                ))}
                {hasNext ? (
                  <Button variant="soft" size="sm" className="w-full" disabled={loading}
                    onClick={() => fetchPage(page + 1, false)}>
                    {loading ? <Spinner size={15} /> : null}{t("gp_load_more")}
                  </Button>
                ) : null}
              </>
            )}
          </div>
        </Pane>

        {/* Transfer arrows */}
        <div className="flex flex-row items-center justify-center gap-2 lg:flex-col">
          <Button variant="outline" size="icon" aria-label={t("gp_move_right")}
            disabled={!leftChecked.size} onClick={moveRight}
            className={cn(leftChecked.size && "border-primary text-primary")}>
            <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
          </Button>
          <Button variant="outline" size="icon" aria-label={t("gp_move_left")}
            disabled={!rightChecked.size} onClick={moveLeft}
            className={cn(rightChecked.size && "border-primary text-primary")}>
            <ArrowLeft className="h-4 w-4" strokeWidth={2.4} />
          </Button>
        </div>

        {/* Right: selection with price + category */}
        <Pane title={t("gp_right")} count={selected.size} className="h-[56svh] lg:h-[60vh]">
          <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-2.5">
            {rightItems.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center gap-2">
                <Inbox className="h-8 w-8 text-muted-foreground/50" strokeWidth={1.6} />
                <p className="text-sm font-semibold text-muted-foreground">{t("gp_empty_selected")}</p>
              </div>
            ) : rightItems.map(({ product, price, category_id }) => (
              <RightRow key={product.id} product={product}
                entry={{ price, category_id }}
                catIndex={catIndex}
                checked={rightChecked.has(product.id)}
                onToggle={() => setRightChecked(prev => { const n = new Set(prev); n.has(product.id) ? n.delete(product.id) : n.add(product.id); return n; })}
                onPriceChange={v => updateEntry(product.id, { price: v })}
                onCategoryChange={v => updateEntry(product.id, { category_id: v })}
              />
            ))}
          </div>
        </Pane>
      </div>
    </Modal>
  );
}
