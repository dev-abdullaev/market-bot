import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Box, ChevronRight, Plus, Search } from "lucide-react";
import api from "../../lib/api";
import { t } from "../../lib/i18n";
import { asList } from "../../lib/panel";
import { indexCategories, flattenCategories } from "../../lib/products";
import { cn } from "../../lib/cn";
import { Button } from "../../components/ui/Button";
import { Input, Label } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { Spinner } from "../../components/ui/Spinner";
import {
  ConfirmDelete,
  EmptyState,
  PageHeader,
  SkeletonList,
} from "../../components/panel/common";

function CatPicker({ categories, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef(null);
  const flat = useMemo(() => flattenCategories(indexCategories(categories)), [categories]);
  const filtered = useMemo(() => {
    if (!q.trim()) return flat;
    const lo = q.toLowerCase();
    return flat.filter((c) => c.name.toLowerCase().includes(lo));
  }, [flat, q]);
  const selected = flat.find((c) => String(c.id) === String(value));

  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)}
        className="flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-border bg-background px-3.5 text-sm shadow-soft transition-colors hover:bg-muted cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span className={cn("truncate", selected ? "font-semibold text-foreground" : "text-muted-foreground")}>
          {selected ? selected.name : `— ${t("no_category")} —`}
        </span>
        <ChevronRight className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-90")} strokeWidth={2.2} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="absolute left-0 right-0 z-50 mt-1 rounded-xl border border-border bg-background shadow-lift">
            <div className="border-b border-border p-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" strokeWidth={2} />
                <input autoFocus type="text" value={q} onChange={(e) => setQ(e.target.value)}
                  placeholder={t("gp_cat_search")}
                  className="h-8 w-full rounded-lg border border-border bg-muted/50 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto">
              <button type="button" onClick={() => { onChange(""); setOpen(false); setQ(""); }}
                className="flex w-full items-center px-3 py-2 text-sm text-muted-foreground hover:bg-muted cursor-pointer">
                — {t("no_category")} —
              </button>
              {filtered.map((c) => (
                <button key={c.id} type="button"
                  onClick={() => { onChange(String(c.id)); setOpen(false); setQ(""); }}
                  className={cn("flex w-full items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-muted",
                    String(c.id) === String(value) ? "bg-primary/5 font-bold text-primary" : "text-foreground")}
                  style={{ paddingLeft: `${12 + c.depth * 16}px` }}>
                  {c.depth > 0 ? <span className="text-muted-foreground">└</span> : null}
                  {c.name}
                </button>
              ))}
              {!filtered.length && <p className="px-3 py-2 text-xs text-muted-foreground">{t("gp_none_found")}</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const EMPTY_FORM = { name: "", price: "", sort_order: 0, category: "" };

function PackagingModal({ open, onOpenChange, categories, onSaved }) {
  const [f, setF] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => { if (open) { setF(EMPTY_FORM); setErr(""); } }, [open]);

  const save = async (e) => {
    e?.preventDefault();
    if (!f.name.trim()) { setErr(t("required")); return; }
    setSaving(true); setErr("");
    try {
      await api.post("/packagings", {
        name: f.name.trim(),
        price: f.price === "" ? 0 : Number(f.price),
        sort_order: Number(f.sort_order) || 0,
        category: f.category ? Number(f.category) : null,
      });
      onSaved?.();
      onOpenChange(false);
    } catch {
      setErr(t("error"));
    } finally {
      setSaving(false);
    }
  };

  const footer = (
    <div className="flex justify-end gap-2">
      <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>{t("back")}</Button>
      <Button type="button" onClick={save} disabled={saving} className="min-w-28">
        {saving ? <Spinner className="text-primary-foreground" size={16} /> : null}
        {saving ? t("saving") : t("add")}
      </Button>
    </div>
  );

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={t("fasovka_add")} footer={footer} size="lg">
      {err ? <p className="mb-3 rounded-xl bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">{err}</p> : null}
      <div className="space-y-4">
        <div>
          <Label htmlFor="pk-name">{t("fasovka_name")} *</Label>
          <Input id="pk-name" value={f.name} onChange={(e) => setF((s) => ({ ...s, name: e.target.value }))}
            placeholder={t("fasovka_name_ph")} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="pk-price">{t("field_price")} (so'm)</Label>
            <Input id="pk-price" type="number" min="0" value={f.price}
              onChange={(e) => setF((s) => ({ ...s, price: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="pk-sort">{t("field_sort_order")}</Label>
            <Input id="pk-sort" type="number" value={f.sort_order}
              onChange={(e) => setF((s) => ({ ...s, sort_order: e.target.value }))} />
          </div>
        </div>
        <div>
          <Label>{t("field_category")}</Label>
          <CatPicker categories={categories} value={f.category}
            onChange={(v) => setF((s) => ({ ...s, category: v }))} />
        </div>
      </div>
    </Modal>
  );
}

export default function FasovkaPage() {
  const reduce = useReducedMotion();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get("/packagings").then((r) => asList(r.data)).catch(() => []),
      api.get("/categories").then((r) => asList(r.data)).catch(() => []),
    ]).then(([p, c]) => {
      setItems(p);
      setCategories(c);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const remove = async (id) => {
    setBusyId(id);
    try {
      await api.delete(`/packagings/${id}`);
      setItems((list) => list.filter((i) => i.id !== id));
    } catch { /* ignore */ }
    finally { setBusyId(null); }
  };

  const catIndex = useMemo(() => indexCategories(categories), [categories]);
  const catName = (id) => {
    if (!id) return null;
    const flat = flattenCategories(catIndex);
    return flat.find((c) => c.id === id)?.name;
  };

  return (
    <div>
      <PageHeader icon={Box} title={t("nav_fasovka")}
        subtitle={t("fasovka_subtitle")}
        action={
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" strokeWidth={2.4} />
            {t("add")}
          </Button>
        }
      />

      <div className="mb-5 rounded-2xl border border-border bg-background p-4 text-sm text-muted-foreground shadow-soft">
        {t("fasovka_hint")}
      </div>

      {loading ? (
        <SkeletonList rows={4} />
      ) : items.length === 0 ? (
        <EmptyState icon={Box} title={t("fasovka_empty")} />
      ) : (
        <motion.div layout className="space-y-3">
          <AnimatePresence initial={false}>
            {items.map((item, i) => (
              <motion.div key={item.id} layout
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
                transition={{ type: "spring", stiffness: 300, damping: 26, delay: Math.min(i * 0.03, 0.15) }}
                className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-background p-4 shadow-soft">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Box className="h-5 w-5" strokeWidth={2.2} />
                  </span>
                  <div>
                    <p className="font-display text-sm font-bold text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {Number(item.price) > 0
                        ? `${new Intl.NumberFormat("ru-RU").format(item.price)} so'm`
                        : t("fasovka_free")}
                      {catName(item.category) ? ` · ${catName(item.category)}` : ""}
                    </p>
                  </div>
                </div>
                <ConfirmDelete busy={busyId === item.id} onConfirm={() => remove(item.id)} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <PackagingModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        categories={categories}
        onSaved={load}
      />
    </div>
  );
}
