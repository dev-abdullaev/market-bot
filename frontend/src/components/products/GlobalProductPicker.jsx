import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Globe,
  Inbox,
  Lock,
  PackageSearch,
  Search,
} from "lucide-react";
import api from "../../lib/api";
import { t, tf, pname } from "../../lib/i18n";
import { cn } from "../../lib/cn";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Spinner } from "../ui/Spinner";

const PAGE_SIZE = 20;

/** Small square thumbnail; falls back to a lock glyph like the reference UI. */
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
    <img
      src={src}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-11 w-11 shrink-0 rounded-lg border border-border object-cover"
    />
  );
}

/** A styled, accessible checkbox square. */
function CheckBox({ checked }) {
  return (
    <span
      className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
        checked
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background"
      )}
    >
      {checked ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
    </span>
  );
}

/** One product row used in both panes. */
function Row({ product, checked, onToggle }) {
  const cat = product.recommended_category;
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border bg-background p-2.5 text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        checked
          ? "border-primary/60 bg-primary/5"
          : "border-border hover:border-primary/40 hover:bg-muted/50"
      )}
    >
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
          {t("gp_rec_cat")}: {cat || "—"}
        </p>
      </div>
    </button>
  );
}

/** Section frame (header with title + count) reused for both panes. */
function Pane({ title, count, children, className }) {
  return (
    <div
      className={cn(
        "flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-muted/30",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border px-3.5 py-2.5">
        <span className="font-display text-sm font-extrabold text-foreground">
          {title}
        </span>
        <span className="rounded-full bg-background px-2 py-0.5 text-xs font-bold text-muted-foreground shadow-soft">
          {count}
        </span>
      </div>
      {children}
    </div>
  );
}

/**
 * Dual-pane transfer modal for adding products from the shared global catalog
 * into the operator's store. Left pane = searchable global catalog (paginated);
 * right pane = the selection to be added. Mirrors the reference talablar UI.
 */
export function GlobalProductPicker({ open, onOpenChange, onAdded }) {
  const reduce = useReducedMotion();

  const [qName, setQName] = useState("");
  const [qBarcode, setQBarcode] = useState("");

  const [items, setItems] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Selection: id -> full product object (survives searches/pagination).
  const [selected, setSelected] = useState(new Map());
  const [leftChecked, setLeftChecked] = useState(new Set());
  const [rightChecked, setRightChecked] = useState(new Set());
  const [adding, setAdding] = useState(false);

  const reqId = useRef(0);

  // Reset everything when the modal is (re)opened.
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQName("");
    setQBarcode("");
    setSelected(new Map());
    setLeftChecked(new Set());
    setRightChecked(new Set());
    setError("");
  }, [open]);

  const fetchPage = useCallback(
    async (nextPage, replace) => {
      const mine = ++reqId.current;
      setLoading(true);
      setError("");
      try {
        const { data } = await api.get("/global-products", {
          params: {
            q: qName.trim() || undefined,
            barcode: qBarcode.trim() || undefined,
            page: nextPage,
            page_size: PAGE_SIZE,
          },
        });
        if (mine !== reqId.current) return; // a newer request superseded this one
        const results = data?.results ?? [];
        setItems((prev) => (replace ? results : [...prev, ...results]));
        setCount(data?.count ?? results.length);
        setHasNext(Boolean(data?.next));
        setPage(nextPage);
      } catch {
        if (mine !== reqId.current) return;
        setError(t("error"));
        if (replace) {
          setItems([]);
          setCount(0);
          setHasNext(false);
        }
      } finally {
        if (mine === reqId.current) setLoading(false);
      }
    },
    [qName, qBarcode]
  );

  // Debounced (re)load whenever the search terms change (and on open).
  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => fetchPage(1, true), 300);
    return () => clearTimeout(id);
  }, [open, qName, qBarcode, fetchPage]);

  // Left pane shows catalog items that are not already in the selection.
  const leftItems = useMemo(
    () => items.filter((p) => !selected.has(p.id)),
    [items, selected]
  );
  const rightItems = useMemo(() => Array.from(selected.values()), [selected]);

  const toggleLeft = (id) =>
    setLeftChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const toggleRight = (id) =>
    setRightChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const moveRight = () => {
    if (!leftChecked.size) return;
    setSelected((prev) => {
      const next = new Map(prev);
      for (const p of items) if (leftChecked.has(p.id)) next.set(p.id, p);
      return next;
    });
    setLeftChecked(new Set());
  };

  const moveLeft = () => {
    if (!rightChecked.size) return;
    setSelected((prev) => {
      const next = new Map(prev);
      for (const id of rightChecked) next.delete(id);
      return next;
    });
    setRightChecked(new Set());
  };

  const confirm = async () => {
    const ids = Array.from(selected.keys());
    if (!ids.length) return;
    setAdding(true);
    setError("");
    try {
      const { data } = await api.post("/global-products/add-to-store", { ids });
      const created = data?.created ?? 0;
      const skipped = data?.skipped ?? 0;
      let msg;
      if (created && skipped) msg = tf("gp_added_some", { n: created, s: skipped });
      else if (created) msg = tf("gp_added", { n: created });
      else msg = t("gp_added_none");
      onAdded?.(msg);
      onOpenChange(false);
    } catch {
      setError(t("error"));
    } finally {
      setAdding(false);
    }
  };

  const header = (
    <div className="flex items-center gap-2.5 pb-3 pr-10 pt-1">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary text-primary-foreground shadow-soft">
        <Globe className="h-5 w-5" strokeWidth={2.2} />
      </span>
      <h2 className="font-display text-lg font-extrabold text-foreground">
        {t("gp_title")}
      </h2>
    </div>
  );

  const footer = (
    <div className="flex items-center justify-between gap-3">
      <span className="hidden text-sm font-semibold text-muted-foreground sm:block">
        {selected.size ? `${selected.size} ${t("gp_right").toLowerCase()}` : ""}
      </span>
      <div className="flex flex-1 items-center justify-end gap-2">
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={adding}>
          {t("gp_cancel")}
        </Button>
        <Button
          onClick={confirm}
          disabled={adding || selected.size === 0}
          className="min-w-36"
        >
          {adding ? <Spinner className="text-primary-foreground" size={16} /> : null}
          {t("gp_add_btn")}
          {selected.size ? ` (${selected.size})` : ""}
        </Button>
      </div>
    </div>
  );

  const list = (rows, checkedSet, onToggle, emptyIcon, emptyText) => (
    <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2.5">
      {rows.length === 0 ? (
        <div className="flex h-full min-h-40 flex-col items-center justify-center gap-2 px-4 text-center">
          {emptyIcon}
          <p className="text-sm font-semibold text-muted-foreground">{emptyText}</p>
        </div>
      ) : (
        rows.map((p) => (
          <Row
            key={p.id}
            product={p}
            checked={checkedSet.has(p.id)}
            onToggle={() => onToggle(p.id)}
          />
        ))
      )}
    </div>
  );

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t("gp_title")}
      header={header}
      footer={footer}
      size="3xl"
      className="sm:max-h-[90svh]"
    >
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto_1fr]">
        {/* Left: global catalog */}
        <Pane title={t("gp_left")} count={count} className="h-[58svh] lg:h-[62vh]">
          <div className="grid grid-cols-1 gap-2 border-b border-border p-2.5 sm:grid-cols-2">
            <Input
              icon={Search}
              placeholder={t("gp_search_name")}
              value={qName}
              onChange={(e) => setQName(e.target.value)}
            />
            <Input
              icon={Search}
              placeholder={t("gp_search_barcode")}
              inputMode="numeric"
              value={qBarcode}
              onChange={(e) => setQBarcode(e.target.value)}
            />
          </div>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2.5">
            {error ? (
              <p className="px-2 py-1 text-sm font-semibold text-destructive">{error}</p>
            ) : null}
            {leftItems.length === 0 && loading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-[68px] animate-pulse rounded-xl border border-border bg-muted/60"
                  />
                ))}
              </div>
            ) : leftItems.length === 0 ? (
              <div className="flex h-full min-h-40 flex-col items-center justify-center gap-2 px-4 text-center">
                <PackageSearch className="h-8 w-8 text-muted-foreground/50" strokeWidth={1.6} />
                <p className="text-sm font-semibold text-muted-foreground">
                  {t("gp_none_found")}
                </p>
              </div>
            ) : (
              <>
                {leftItems.map((p) => (
                  <Row
                    key={p.id}
                    product={p}
                    checked={leftChecked.has(p.id)}
                    onToggle={() => toggleLeft(p.id)}
                  />
                ))}
                {hasNext ? (
                  <Button
                    variant="soft"
                    size="sm"
                    className="w-full"
                    disabled={loading}
                    onClick={() => fetchPage(page + 1, false)}
                  >
                    {loading ? (
                      <Spinner size={15} />
                    ) : null}
                    {t("gp_load_more")}
                  </Button>
                ) : null}
              </>
            )}
          </div>
        </Pane>

        {/* Middle: transfer controls */}
        <div className="flex flex-row items-center justify-center gap-2 lg:flex-col">
          <Button
            variant="outline"
            size="icon"
            aria-label={t("gp_move_right")}
            disabled={!leftChecked.size}
            onClick={moveRight}
            className={cn(leftChecked.size && "border-primary text-primary")}
          >
            <ArrowRight className="h-4 w-4 lg:block" strokeWidth={2.4} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label={t("gp_move_left")}
            disabled={!rightChecked.size}
            onClick={moveLeft}
            className={cn(rightChecked.size && "border-primary text-primary")}
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2.4} />
          </Button>
        </div>

        {/* Right: selection */}
        <Pane title={t("gp_right")} count={selected.size} className="h-[44svh] lg:h-[62vh]">
          {list(
            rightItems,
            rightChecked,
            toggleRight,
            <Inbox className="h-8 w-8 text-muted-foreground/50" strokeWidth={1.6} />,
            t("gp_empty_selected")
          )}
        </Pane>
      </div>

      <AnimatePresence>
        {leftChecked.size ? (
          <motion.p
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-2 text-center text-xs font-semibold text-primary lg:hidden"
          >
            {leftChecked.size} ✓ — {t("gp_move_right")}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </Modal>
  );
}
