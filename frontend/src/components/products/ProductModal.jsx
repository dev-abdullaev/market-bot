import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Box,
  ChevronRight,
  ImagePlus,
  Info,
  Search,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react";
import api from "../../lib/api";
import { t } from "../../lib/i18n";
import { cn } from "../../lib/cn";
import {
  UNITS,
  PACKAGING,
  SEASONS,
  MAX_IMAGES,
  flattenCategories,
  indexCategories,
} from "../../lib/products";
import { Button } from "../ui/Button";
import { Input, Label, Select } from "../ui/Input";
import { ErrorAlert } from "../ui/Alert";
import { Spinner } from "../ui/Spinner";
import { Modal } from "../ui/Modal";
import { DimensionsBox } from "./DimensionsBox";

// Lazy-loaded so three.js stays out of the main panel bundle (separate chunk).
const DimensionsBox3D = lazy(() => import("./DimensionsBox3D"));

const TABS = [
  { id: "main", labelKey: "tab_main" },
  { id: "extra", labelKey: "tab_extra" },
  { id: "variants", labelKey: "tab_variants" },
];

const EMPTY = {
  name_ru: "",
  name_uz: "",
  description_ru: "",
  description_uz: "",
  category: "",
  sort_order: 0,
  price: "",
  has_discount: false,
  discount_price: "",
  unit: "dona",
  packaging: "Idishsiz",
  in_stock: true,
  is_hidden: false,
  seasonality: "all_season",
  weight_kg: "",
  length_cm: "",
  width_cm: "",
  height_cm: "",
  manufacturer: "",
  brand: "",
  model: "",
  country: "",
  barcode: "",
  ikpu: "",
};

/** Compact top-right pill toggle (e.g. "Yo'q", "Yashirish"). */
function PillToggle({ checked, onChange, label, tone = "destructive" }) {
  const tones = {
    destructive: "bg-destructive text-destructive-foreground",
    amber: "bg-amber-500 text-white",
  };
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        checked
          ? `${tones[tone]} border-transparent`
          : "border-border bg-muted text-muted-foreground hover:bg-muted/70"
      )}
    >
      <span
        className={cn(
          "relative h-4 w-7 rounded-full transition-colors",
          checked ? "bg-white/40" : "bg-muted-foreground/30"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-all",
            checked ? "left-[0.875rem]" : "left-0.5"
          )}
        />
      </span>
      {label}
    </button>
  );
}

/** A single image slot: preview + file picker + remove. First slot is cover. */
function ImageSlot({ slot, cover, onPick, onRemove }) {
  const ref = useRef(null);
  const preview = slot?.preview;
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className={cn(
          "group relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          preview
            ? "border-solid border-border"
            : "border-border bg-muted hover:border-primary/50 hover:bg-primary/5"
        )}
      >
        {preview ? (
          <img
            src={preview}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <ImagePlus
            className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary"
            strokeWidth={2}
          />
        )}
      </button>
      {cover && preview ? (
        <span className="absolute left-1 top-1 flex items-center gap-0.5 rounded-md bg-primary/90 px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
          <Star className="h-2.5 w-2.5 fill-current" />
        </span>
      ) : null}
      {preview ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label="remove"
          className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-md bg-foreground/70 text-background transition-colors hover:bg-destructive cursor-pointer"
        >
          <Trash2 className="h-3 w-3" strokeWidth={2.4} />
        </button>
      ) : null}
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPick(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}

/** Searchable category dropdown — replaces the plain <Select> for category. */
function CategorySearchSelect({ options, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef(null);

  const filtered = useMemo(() => {
    if (!q.trim()) return options;
    const lo = q.toLowerCase();
    return options.filter((c) => c.name.toLowerCase().includes(lo));
  }, [options, q]);

  const selected = useMemo(
    () => options.find((c) => String(c.id) === String(value)),
    [options, value]
  );

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
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-border bg-background px-3.5 text-sm shadow-soft transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
      >
        <span className={cn("truncate", selected ? "text-foreground font-semibold" : "text-muted-foreground")}>
          {selected ? selected.name : t("no_category")}
        </span>
        <ChevronRight
          className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-90")}
          strokeWidth={2.2}
        />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="absolute left-0 right-0 z-50 mt-1 rounded-xl border border-border bg-background shadow-lift"
          >
            <div className="border-b border-border p-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" strokeWidth={2} />
                <input
                  autoFocus
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={t("gp_cat_search")}
                  className="h-8 w-full rounded-lg border border-border bg-muted/50 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto">
              <button
                type="button"
                onClick={() => { onChange(""); setOpen(false); setQ(""); }}
                className="flex w-full items-center px-3 py-2 text-sm text-muted-foreground hover:bg-muted cursor-pointer"
              >
                — {t("no_category")} —
              </button>
              {filtered.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { onChange(String(c.id)); setOpen(false); setQ(""); }}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-muted",
                    String(c.id) === String(value)
                      ? "bg-primary/5 font-bold text-primary"
                      : "text-foreground"
                  )}
                  style={{ paddingLeft: `${12 + c.depth * 16}px` }}
                >
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

function FieldRow({ label, htmlFor, children, className }) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

export function ProductModal({
  open,
  onOpenChange,
  product,
  categories,
  supportUsername,
  onSaved,
}) {
  const reduce = useReducedMotion();
  const isEdit = Boolean(product?.id);
  const [tab, setTab] = useState("main");
  const [f, setF] = useState(EMPTY);
  // Image slots: existing URLs (kept) + newly picked Files (uploaded on save).
  const [slots, setSlots] = useState([]); // [{file?, url?, preview}]
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const catOptions = useMemo(
    () => flattenCategories(indexCategories(categories || [])),
    [categories]
  );

  // (Re)seed form whenever the modal opens for a (new or existing) product.
  // Syncing form state to the opened product is exactly what this effect is
  // for; the lint rule's perf concern doesn't apply to a one-shot open.
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTab("main");
    setErr("");
    if (product?.id) {
      setF({ ...EMPTY, ...product, category: product.category ?? "" });
      const urls = [
        ...(product.photo_url ? [product.photo_url] : []),
        ...(Array.isArray(product.images) ? product.images : []),
      ];
      const seen = new Set();
      const dedup = urls.filter((u) => u && !seen.has(u) && seen.add(u));
      setSlots(dedup.slice(0, MAX_IMAGES).map((url) => ({ url, preview: url })));
    } else {
      setF(EMPTY);
      setSlots([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product?.id]);

  // Revoke object URLs for picked files on unmount/replace to avoid leaks.
  useEffect(() => {
    return () => {
      slots.forEach((s) => s.file && s.preview && URL.revokeObjectURL(s.preview));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (k) => (e) =>
    setF((s) => ({ ...s, [k]: e?.target ? e.target.value : e }));

  const pickImage = (idx) => (file) => {
    const preview = URL.createObjectURL(file);
    setSlots((prev) => {
      const next = [...prev];
      next[idx] = { file, preview };
      return next;
    });
  };

  const removeImage = (idx) => () => {
    setSlots((prev) => {
      const s = prev[idx];
      if (s?.file && s.preview) URL.revokeObjectURL(s.preview);
      const next = [...prev];
      next.splice(idx, 1);
      return next;
    });
  };

  const save = async (e) => {
    e?.preventDefault();
    if (!f.name_uz.trim() && !f.name_ru.trim()) {
      setTab("main");
      setErr(t("required"));
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const payload = {
        name_ru: f.name_ru.trim(),
        name_uz: f.name_uz.trim(),
        description_ru: f.description_ru,
        description_uz: f.description_uz,
        category: f.category || null,
        sort_order: toInt(f.sort_order),
        price: f.price === "" ? 0 : f.price,
        has_discount: Boolean(f.has_discount),
        discount_price:
          f.has_discount && f.discount_price !== "" ? f.discount_price : null,
        unit: f.unit,
        packaging: f.packaging,
        in_stock: f.in_stock,
        is_hidden: f.is_hidden,
        seasonality: f.seasonality,
        weight_kg: numOrZero(f.weight_kg),
        length_cm: numOrZero(f.length_cm),
        width_cm: numOrZero(f.width_cm),
        height_cm: numOrZero(f.height_cm),
        manufacturer: f.manufacturer,
        brand: f.brand,
        model: f.model,
        country: f.country,
        barcode: f.barcode,
        ikpu: f.ikpu,
        // Keep existing images that the user did not remove.
        images: slots.filter((s) => s.url).map((s) => s.url),
      };

      const saved = isEdit
        ? await api.patch(`/products/${product.id}`, payload)
        : await api.post("/products", payload);
      const id = saved.data?.id ?? product?.id;

      // Upload newly picked files sequentially (endpoint appends to images[]).
      const files = slots.filter((s) => s.file).map((s) => s.file);
      for (const file of files) {
        const fd = new FormData();
        fd.append("photo", file);
        await api.post(`/products/${id}/photo`, fd);
      }

      onSaved?.();
      onOpenChange(false);
    } catch (e2) {
      setErr(e2?.response?.data?.detail || t("error"));
    } finally {
      setBusy(false);
    }
  };

  const header = (
    <div className="pb-3">
      <div className="flex items-start justify-between gap-3 pr-10">
        <h2 className="font-display text-lg font-extrabold text-foreground">
          {isEdit ? t("edit_product_title") : t("add_product_title")}
        </h2>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <PillToggle
            label={t("toggle_out")}
            checked={f.in_stock === false}
            onChange={(v) => setF((s) => ({ ...s, in_stock: !v }))}
            tone="destructive"
          />
          <PillToggle
            label={t("toggle_hide")}
            checked={Boolean(f.is_hidden)}
            onChange={(v) => setF((s) => ({ ...s, is_hidden: v }))}
            tone="amber"
          />
        </div>
      </div>
      {/* Tabs */}
      <div className="mt-3 flex gap-1 border-b border-border" role="tablist">
        {TABS.map((tb) => (
          <button
            key={tb.id}
            type="button"
            role="tab"
            aria-selected={tab === tb.id}
            onClick={() => setTab(tb.id)}
            className={cn(
              "relative px-3 py-2.5 text-sm font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-t-lg",
              tab === tb.id
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t(tb.labelKey)}
            {tab === tb.id ? (
              <motion.span
                layoutId="product-tab-underline"
                className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );

  const footer = (
    <div className="flex items-center justify-end gap-2">
      <Button
        type="button"
        variant="outline"
        onClick={() => onOpenChange(false)}
        disabled={busy}
      >
        {t("back")}
      </Button>
      <Button type="button" onClick={save} disabled={busy} className="min-w-28">
        {busy ? <Spinner className="text-primary-foreground" size={16} /> : null}
        {busy ? t("saving") : t("save")}
      </Button>
    </div>
  );

  const tabAnim = {
    initial: reduce ? { opacity: 0 } : { opacity: 0, x: 16 },
    animate: { opacity: 1, x: 0 },
    exit: reduce ? { opacity: 0 } : { opacity: 0, x: -16 },
    transition: { duration: 0.2 },
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? t("edit_product_title") : t("add_product_title")}
      header={header}
      footer={footer}
      size="xl"
    >
      <ErrorAlert message={err} className="mb-3" />
      <AnimatePresence mode="wait" initial={false}>
        {tab === "main" ? (
          <motion.div key="main" {...tabAnim} className="space-y-4">
            {/* Names */}
            <div className="grid gap-3 sm:grid-cols-2">
              <FieldRow label={`${t("field_name_ru")} 🇷🇺`} htmlFor="pm-ru">
                <NameInput
                  id="pm-ru"
                  value={f.name_ru}
                  onChange={set("name_ru")}
                />
              </FieldRow>
              <FieldRow label={`${t("field_name_uz")} 🇺🇿`} htmlFor="pm-uz">
                <NameInput
                  id="pm-uz"
                  value={f.name_uz}
                  onChange={set("name_uz")}
                />
              </FieldRow>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <FieldRow label={t("field_category")}>
                <CategorySearchSelect
                  options={catOptions}
                  value={f.category}
                  onChange={set("category")}
                />
              </FieldRow>
              <FieldRow label={t("field_sort_order")} htmlFor="pm-sort">
                <Input
                  id="pm-sort"
                  type="number"
                  value={f.sort_order}
                  onChange={set("sort_order")}
                />
              </FieldRow>
            </div>

            {/* Price + discount */}
            <div className="grid gap-3 sm:grid-cols-2">
              <FieldRow label={t("field_price")} htmlFor="pm-price">
                <Input
                  id="pm-price"
                  type="number"
                  min="0"
                  value={f.price}
                  onChange={set("price")}
                />
              </FieldRow>
              <div className="flex flex-col">
                <Label>{t("field_discount")}</Label>
                <InlineToggle
                  checked={Boolean(f.has_discount)}
                  onChange={(v) => setF((s) => ({ ...s, has_discount: v }))}
                  label={t("field_discount")}
                />
              </div>
            </div>

            <AnimatePresence initial={false}>
              {f.has_discount ? (
                <motion.div
                  initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
                  animate={
                    reduce ? { opacity: 1 } : { opacity: 1, height: "auto" }
                  }
                  exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
                  transition={{ duration: 0.22 }}
                  className="overflow-hidden"
                >
                  <FieldRow
                    label={t("field_discount_price")}
                    htmlFor="pm-dprice"
                  >
                    <Input
                      id="pm-dprice"
                      type="number"
                      min="0"
                      value={f.discount_price}
                      onChange={set("discount_price")}
                    />
                  </FieldRow>
                </motion.div>
              ) : null}
            </AnimatePresence>

            <div className="grid gap-3 sm:grid-cols-2">
              <FieldRow label={t("field_unit")} htmlFor="pm-unit">
                <Select id="pm-unit" value={f.unit} onChange={set("unit")}>
                  {UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </Select>
              </FieldRow>
              <FieldRow label={t("field_packaging")} htmlFor="pm-pack">
                <Select id="pm-pack" value={f.packaging} onChange={set("packaging")}>
                  {PACKAGING.map((p) => (
                    <option key={p.value} value={p.value}>
                      {t(p.key)}
                    </option>
                  ))}
                </Select>
              </FieldRow>
            </div>

            {/* Images */}
            <div>
              <Label>{t("field_image")}</Label>
              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: MAX_IMAGES }).map((_, i) => (
                  <ImageSlot
                    key={i}
                    slot={slots[i]}
                    cover={i === 0}
                    onPick={pickImage(i)}
                    onRemove={removeImage(i)}
                  />
                ))}
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {t("image_hint")} · ⭐ {t("image_cover")}
              </p>
            </div>
          </motion.div>
        ) : null}

        {tab === "extra" ? (
          <motion.div key="extra" {...tabAnim} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <FieldRow label={t("field_desc_ru")} htmlFor="pm-dru">
                <TextArea
                  id="pm-dru"
                  value={f.description_ru}
                  onChange={set("description_ru")}
                />
              </FieldRow>
              <FieldRow label={t("field_desc_uz")} htmlFor="pm-duz">
                <TextArea
                  id="pm-duz"
                  value={f.description_uz}
                  onChange={set("description_uz")}
                />
              </FieldRow>
            </div>

            <FieldRow label={t("field_seasonality")} htmlFor="pm-season">
              <Select id="pm-season" value={f.seasonality} onChange={set("seasonality")}>
                {SEASONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {t(s.key)}
                  </option>
                ))}
              </Select>
            </FieldRow>

            {/* Delivery params */}
            <div className="rounded-2xl border border-border bg-muted/40 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Box className="h-4 w-4 text-primary" strokeWidth={2.2} />
                <h3 className="font-display text-sm font-extrabold text-foreground">
                  {t("delivery_params")}
                </h3>
              </div>
              <div className="grid gap-4 sm:grid-cols-[1fr_minmax(180px,0.9fr)]">
                <div className="grid grid-cols-2 gap-3">
                  <FieldRow label={t("field_length")} htmlFor="pm-len">
                    <Input
                      id="pm-len"
                      type="number"
                      min="0"
                      value={f.length_cm}
                      onChange={set("length_cm")}
                    />
                  </FieldRow>
                  <FieldRow label={t("field_width")} htmlFor="pm-wid">
                    <Input
                      id="pm-wid"
                      type="number"
                      min="0"
                      value={f.width_cm}
                      onChange={set("width_cm")}
                    />
                  </FieldRow>
                  <FieldRow label={t("field_height")} htmlFor="pm-hei">
                    <Input
                      id="pm-hei"
                      type="number"
                      min="0"
                      value={f.height_cm}
                      onChange={set("height_cm")}
                    />
                  </FieldRow>
                  <FieldRow label={t("field_weight")} htmlFor="pm-wei">
                    <Input
                      id="pm-wei"
                      type="number"
                      min="0"
                      step="0.01"
                      value={f.weight_kg}
                      onChange={set("weight_kg")}
                    />
                  </FieldRow>
                </div>
                <Suspense
                  fallback={
                    <DimensionsBox
                      length={f.length_cm}
                      width={f.width_cm}
                      height={f.height_cm}
                    />
                  }
                >
                  <DimensionsBox3D
                    length={f.length_cm}
                    width={f.width_cm}
                    height={f.height_cm}
                  />
                </Suspense>
              </div>
            </div>

            {/* Manufacturer / brand */}
            <div className="rounded-2xl border border-border p-4">
              <h3 className="mb-3 font-display text-sm font-extrabold text-foreground">
                {t("manufacturer_brand")}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <FieldRow label={t("field_manufacturer")} htmlFor="pm-mfr">
                  <Input id="pm-mfr" value={f.manufacturer} onChange={set("manufacturer")} />
                </FieldRow>
                <FieldRow label={t("field_brand")} htmlFor="pm-brand">
                  <Input id="pm-brand" value={f.brand} onChange={set("brand")} />
                </FieldRow>
                <FieldRow label={t("field_model")} htmlFor="pm-model">
                  <Input id="pm-model" value={f.model} onChange={set("model")} />
                </FieldRow>
                <FieldRow label={t("field_country")} htmlFor="pm-country">
                  <Input id="pm-country" value={f.country} onChange={set("country")} />
                </FieldRow>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <FieldRow label={t("field_barcode")} htmlFor="pm-barcode">
                <Input id="pm-barcode" value={f.barcode} onChange={set("barcode")} />
              </FieldRow>
              <FieldRow label={t("field_ikpu")} htmlFor="pm-ikpu">
                <Input id="pm-ikpu" value={f.ikpu} onChange={set("ikpu")} />
              </FieldRow>
            </div>
          </motion.div>
        ) : null}

        {tab === "variants" ? (
          <motion.div
            key="variants"
            {...tabAnim}
            className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-muted/40 px-6 py-12 text-center"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Info className="h-7 w-7" strokeWidth={2} />
            </span>
            <div className="space-y-1.5">
              <h3 className="font-display text-base font-extrabold text-foreground">
                {t("variants_title")}
              </h3>
              <p className="max-w-sm text-sm text-muted-foreground">
                {t("variants_note")}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-bold text-primary shadow-soft">
              {t("variants_contact")}:{" "}
              {supportUsername ? `@${supportUsername}` : "@bdullaev"}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </Modal>
  );
}

/** Name input with a decorative sparkle affordance. */
function NameInput({ id, value, onChange }) {
  return (
    <div className="relative">
      <Input id={id} value={value} onChange={onChange} className="pr-10" />
      <span
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-primary/40"
        title={t("ai_suggest")}
        aria-hidden
      >
        <Sparkles className="h-4 w-4" strokeWidth={2} />
      </span>
    </div>
  );
}

function TextArea({ id, value, onChange }) {
  return (
    <textarea
      id={id}
      rows={3}
      value={value ?? ""}
      onChange={onChange}
      className="w-full resize-y rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground shadow-soft transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary"
    />
  );
}

/** Inline accent on/off switch used inside the form grid. */
function InlineToggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="flex h-11 items-center justify-between rounded-xl border border-border bg-background px-3.5 text-sm font-bold shadow-soft transition-colors hover:bg-muted cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="text-muted-foreground">{checked ? "✓" : "—"}</span>
      <span
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
          checked ? "bg-accent" : "bg-muted-foreground/30"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-background shadow-soft transition-all",
            checked ? "left-[1.375rem]" : "left-0.5"
          )}
        />
      </span>
    </button>
  );
}

function toInt(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
}
function numOrZero(v) {
  if (v === "" || v == null) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
