import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  BarChart2, Bell, ChevronDown, ChevronUp, Gift, Globe,
  ImagePlus, Package, Palette, Send, Settings, Truck,
  CreditCard, Megaphone, Star, Image,
} from "lucide-react";
import api from "../../lib/api";
import { t } from "../../lib/i18n";
import { cn } from "../../lib/cn";
import { asList } from "../../lib/panel";
import { catName, indexCategories, childrenOf } from "../../lib/products";
import { localName } from "../../lib/format";
import { Button } from "../../components/ui/Button";
import { Input, Label, Select } from "../../components/ui/Input";
import { Spinner } from "../../components/ui/Spinner";
import { PageHeader, Toast, Toggle } from "../../components/panel/common";
import { Card } from "../../components/ui/Card";

/* ── helpers ─────────────────────────────────────────────────── */
const sc = (f) => f.showcase_config || {};
const getSC = (f, key, def) => sc(f)[key] ?? def;
const setSCFn = (setF, key) => (val) =>
  setF((s) => ({ ...s, showcase_config: { ...sc(s), [key]: val } }));
const nestedSC = (f, ns, key, def) => (sc(f)[ns] || {})[key] ?? def;
const setNestedSCFn = (setF, ns) => (key) => (val) =>
  setF((s) => {
    const prev = sc(s);
    return { ...s, showcase_config: { ...prev, [ns]: { ...(prev[ns] || {}), [key]: val } } };
  });

function SectionTitle({ children }) {
  return (
    <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
      {children}
    </h3>
  );
}
function Hint({ children }) {
  return <p className="mt-1 text-xs text-muted-foreground">{children}</p>;
}
function Field({ label, hint, children }) {
  return (
    <div>
      {label ? <Label>{label}</Label> : null}
      {children}
      {hint ? <Hint>{hint}</Hint> : null}
    </div>
  );
}
function Row({ children, className }) {
  return <div className={cn("grid gap-4", className)}>{children}</div>;
}
function Divider() {
  return <hr className="border-border" />;
}

/* Toggle row with label + hint */
function ToggleRow({ label, hint, checked, onChange }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-foreground">{label}</p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

/* Accordion payment card */
function PayCard({ icon: Icon, label, hint, configured, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-border bg-background shadow-soft overflow-hidden">
      <button type="button" onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 p-4 cursor-pointer hover:bg-muted/30">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted">
          <Icon className="h-5 w-5 text-foreground" strokeWidth={2} />
        </span>
        <div className="flex-1 text-left">
          <p className="font-bold text-foreground text-sm">{label}</p>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold",
          configured ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground")}>
          {configured ? t("settings_configured") : t("settings_not_filled")}
        </span>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
               : <ChevronDown className="h-4 w-4 text-muted-foreground" strokeWidth={2} />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-border">
            <div className="p-4 space-y-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SaveBar({ saving, onSave }) {
  return (
    <div className="mt-6 flex justify-end">
      <Button onClick={onSave} disabled={saving} className="min-w-32">
        {saving ? <Spinner size={16} className="text-primary-foreground" /> : null}
        {saving ? t("saving") : t("save")}
      </Button>
    </div>
  );
}

/* ── TABS ─────────────────────────────────────────────────────── */
const TABS = [
  { id: "general", label: "Umumiy", icon: Settings },
  { id: "product", label: "Mahsulot sozlamalari", icon: Package },
  { id: "design", label: "Dizayn va Uslub", icon: Palette },
  { id: "banners", label: "Reklama bannerlari", icon: Megaphone },
  { id: "cat_images", label: "Kategoriya rasmlari", icon: Image },
  { id: "telegram", label: "Telegram", icon: Send },
  { id: "payment", label: "To'lov tizimlari", icon: CreditCard },
  { id: "delivery", label: "Yetkazib berish", icon: Truck },
  { id: "promos", label: "Promokodlar", icon: Gift },
  { id: "reports", label: "Hisobotlar", icon: BarChart2 },
];

const CURRENCIES = [
  { code: "UZS", label: "O'zbekiston — so'm (UZS)" },
  { code: "KZT", label: "Qozog'iston — tenge (KZT)" },
  { code: "TMT", label: "Turkmaniston — manat (TMT)" },
  { code: "TJS", label: "Tojikiston — somoni (TJS)" },
  { code: "KGS", label: "Qirg'iziston — som (KGS)" },
  { code: "AFN", label: "Afg'oniston — afgon (AFN)" },
  { code: "RUB", label: "Rossiya — rub (RUB)" },
  { code: "USD", label: "AQSH — $ (USD)" },
];

const TIMEZONES = [
  "Asia/Tashkent", "Asia/Almaty", "Asia/Bishkek",
  "Asia/Dushanbe", "Asia/Ashgabat", "Asia/Kabul", "Europe/Moscow",
];

/* ── 1. Umumiy ───────────────────────────────────────────────── */
function UmumiyTab({ f, setF, onSave, saving }) {
  const scKey = (k) => setSCFn(setF, k);
  const logoMode = getSC(f, "logo_mode", "square");
  const qrUseWeb = getSC(f, "qr_use_website", false);
  const safeMode = getSC(f, "safe_mode_enabled", false);

  return (
    <div className="space-y-6">
      {/* Logo */}
      <div>
        <SectionTitle>Logotip magaza</SectionTitle>
        <div className="rounded-2xl border-2 border-dashed border-border bg-muted/30 flex flex-col items-center justify-center py-10 gap-2 cursor-pointer hover:bg-muted/60 transition-colors" onClick={() => {}}>
          {f.logo_url ? (
            <img src={f.logo_url} alt="logo" className="h-20 w-20 object-contain rounded-xl" />
          ) : (
            <ImagePlus className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
          )}
          <p className="text-sm text-muted-foreground font-semibold">{t("settings_choose_logo")}</p>
        </div>
        <div className="mt-2">
          <Field label={t("settings_logo_url")}>
            <Input value={f.logo_url || ""} onChange={(e) => setF((s) => ({ ...s, logo_url: e.target.value }))}
              placeholder="https://..." />
          </Field>
        </div>
      </div>
      <div>
        <SectionTitle>Ko'rinish rejimi</SectionTitle>
        <Select value={logoMode} onChange={(e) => scKey("logo_mode")(e.target.value)}>
          <option value="square">Kvadratli</option>
          <option value="horizontal">Gorizontal</option>
        </Select>
        <Hint>Kvadratli: tavsiya 512×512 px (PNG). Gorizontal: 1200×400 px (PNG, shaffof fon).</Hint>
      </div>

      <Divider />

      {/* QR */}
      <div>
        <SectionTitle>QR-kod magaza</SectionTitle>
        <div className="rounded-2xl border border-border bg-muted/30 p-6 flex flex-col items-center gap-2">
          <Globe className="h-8 w-8 text-muted-foreground/50" strokeWidth={1.5} />
          <p className="text-sm text-muted-foreground">{t("settings_qr_hint")}</p>
        </div>
        <div className="mt-3">
          <ToggleRow label={t("settings_qr_use_website")}
            hint={t("settings_qr_use_website_hint")}
            checked={qrUseWeb} onChange={scKey("qr_use_website")} />
        </div>
      </div>

      <Divider />

      {/* Basic info */}
      <div className="space-y-4">
        <Row className="sm:grid-cols-2">
          <Field label={t("settings_store_name")}>
            <Input value={f.name || ""} onChange={(e) => setF((s) => ({ ...s, name: e.target.value }))} />
          </Field>
          <Field label={t("settings_phone")}>
            <Input value={f.phone || ""} onChange={(e) => setF((s) => ({ ...s, phone: e.target.value }))} />
          </Field>
        </Row>
        <Row className="sm:grid-cols-2">
          <Field label={t("settings_address")}>
            <Input value={f.address || ""} onChange={(e) => setF((s) => ({ ...s, address: e.target.value }))} />
          </Field>
          <Field label={t("settings_activity_type")}>
            <Input value={f.activity_type || ""} onChange={(e) => setF((s) => ({ ...s, activity_type: e.target.value }))} />
          </Field>
        </Row>
        <Field label={t("settings_timezone")}>
          <Select value={f.timezone || "Asia/Tashkent"} onChange={(e) => setF((s) => ({ ...s, timezone: e.target.value }))}>
            {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz} (UTC+{tz === "Asia/Tashkent" ? 5 : tz === "Europe/Moscow" ? 3 : tz === "Asia/Kabul" ? "4:30" : 5})</option>)}
          </Select>
          <Hint>{t("settings_timezone_hint")}</Hint>
        </Field>
        <Field label={t("settings_slug")}>
          <div className="flex items-center gap-0">
            <span className="flex h-11 items-center rounded-l-xl border border-r-0 border-border bg-muted px-3 text-sm text-muted-foreground">{window.location.origin}/shop/</span>
            <Input value={f.slug || ""} onChange={(e) => setF((s) => ({ ...s, slug: e.target.value }))}
              className="rounded-l-none" />
          </div>
          <Hint>{t("settings_slug_hint")}</Hint>
        </Field>
        <Row className="sm:grid-cols-2">
          <Field label={t("settings_open_time")}>
            <Input type="time" value={f.open_time || ""} onChange={(e) => setF((s) => ({ ...s, open_time: e.target.value }))} />
          </Field>
          <Field label={t("settings_close_time")}>
            <Input type="time" value={f.close_time || ""} onChange={(e) => setF((s) => ({ ...s, close_time: e.target.value }))} />
          </Field>
        </Row>
      </div>

      <Divider />

      {/* Currency */}
      <div>
        <SectionTitle>{t("settings_currency")}</SectionTitle>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {CURRENCIES.map((c) => (
            <button key={c.code} type="button"
              onClick={() => setF((s) => ({ ...s, currency_code: c.code }))}
              className={cn("rounded-xl border p-3 text-left text-sm transition-colors cursor-pointer",
                f.currency_code === c.code
                  ? "border-primary bg-primary/5 font-bold text-primary"
                  : "border-border hover:bg-muted text-foreground"
              )}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <Divider />

      {/* Safe mode */}
      <div className="rounded-2xl border border-border bg-muted/30 p-4">
        <p className="font-bold text-foreground text-sm mb-0.5">{t("settings_safe_mode")}</p>
        <p className="text-xs text-muted-foreground mb-3">{t("settings_safe_mode_hint")}</p>
        <ToggleRow label={t("settings_safe_mode_toggle")} checked={safeMode}
          onChange={scKey("safe_mode_enabled")} />
      </div>

      <SaveBar saving={saving} onSave={onSave} />
    </div>
  );
}

/* ── 2. Mahsulot sozlamalari ─────────────────────────────────── */
function MahsulotTab({ f, setF, onSave, saving }) {
  const setNS = setNestedSCFn(setF, "product");
  const stock = nestedSC(f, "product", "stock_tracking", false);
  const threshold = nestedSC(f, "product", "stock_threshold", 0);
  const priceSegm = nestedSC(f, "product", "price_segmentation", false);
  const showDelivTime = nestedSC(f, "product", "show_delivery_time", false);
  const fields = nestedSC(f, "product", "form_fields", { description: true, seasonality: true, barcode: true, ikpu: true });
  const setField = (key) => (val) => {
    setF((s) => {
      const prev = sc(s);
      const p = prev.product || {};
      return { ...s, showcase_config: { ...prev, product: { ...p, form_fields: { ...(p.form_fields || {}), [key]: val } } } };
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border p-4 space-y-4">
        <div>
          <p className="font-bold text-foreground text-sm">{t("settings_stock_tracking")}</p>
          <p className="text-xs text-muted-foreground">{t("settings_stock_tracking_hint")}</p>
        </div>
        <ToggleRow label={t("settings_stock_enable")} checked={stock} onChange={setNS("stock_tracking")} />
        <div className="grid grid-cols-2 gap-4">
          <Field label={t("settings_stock_threshold")}>
            <Input type="number" min="0" value={threshold}
              onChange={(e) => setNS("stock_threshold")(Number(e.target.value))} />
          </Field>
          <div className="rounded-xl bg-destructive/5 border border-destructive/20 p-3 flex items-start gap-2">
            <p className="text-xs text-destructive font-semibold">{t("settings_stock_example")}</p>
          </div>
        </div>
      </div>

      <Field label={t("settings_min_order")} hint={t("settings_min_order_hint")}>
        <Input type="number" min="0" value={f.minimum_order_amount || 0}
          onChange={(e) => setF((s) => ({ ...s, minimum_order_amount: e.target.value }))} />
      </Field>

      <div className="rounded-2xl border border-border p-4 space-y-3">
        <p className="font-bold text-foreground text-sm">{t("settings_price_segm")}</p>
        <p className="text-xs text-muted-foreground">{t("settings_price_segm_hint")}</p>
        <ToggleRow label={t("settings_price_segm_enable")} checked={priceSegm}
          onChange={setNS("price_segmentation")} />
      </div>

      <div className="rounded-2xl border border-border p-4 space-y-3">
        <p className="font-bold text-foreground text-sm">{t("settings_delivery_time")}</p>
        <p className="text-xs text-muted-foreground">{t("settings_delivery_time_hint")}</p>
        <ToggleRow label={t("settings_delivery_time_show")} checked={showDelivTime}
          onChange={setNS("show_delivery_time")} />
      </div>

      <div className="rounded-2xl border border-border p-4 space-y-3">
        <p className="font-bold text-foreground text-sm">{t("settings_form_fields")}</p>
        <p className="text-xs text-muted-foreground">{t("settings_form_fields_hint")}</p>
        {[
          { key: "description", label: "Tavsif (RU/UZ)" },
          { key: "seasonality", label: "Tovar mavsumlyligi" },
          { key: "barcode", label: "Shtrix-kod" },
          { key: "ikpu", label: "IKPU" },
        ].map((field) => (
          <ToggleRow key={field.key} label={field.label}
            checked={fields[field.key] !== false}
            onChange={setField(field.key)} />
        ))}
      </div>

      <SaveBar saving={saving} onSave={onSave} />
    </div>
  );
}

/* ── 3. Dizayn va Uslub ──────────────────────────────────────── */
const VIEW_MODES = [
  { id: "catalog", label: "Katalog", hint: "Kategoriyalar plitkasi, keyin mahsulotlar" },
  { id: "card_mode", label: "Kartochka rejimi", hint: "Barcha mahsulotlar kategoriyalar bo'yicha bitta ekranda" },
  { id: "category_folders", label: "Kategoriya papkalari", hint: "Kategoriya → Kategoriya → Mahsulotlar" },
];
const CARD_MODES = [
  { id: "wide", label: "Keng", hint: "Rasm 4:3, ixcham kartochka" },
  { id: "book", label: "Kitob", hint: "Rasm 3:4, fotoga urg'u" },
];

function DizaynTab({ f, setF, onSave, saving }) {
  const [subTab, setSubTab] = useState("view");
  const viewMode = getSC(f, "catalog_view_mode", "catalog");
  const cardMode = getSC(f, "product_card_mode", "wide");
  const setView = setSCFn(setF, "catalog_view_mode");
  const setCard = setSCFn(setF, "product_card_mode");

  return (
    <div className="space-y-5">
      <div className="flex gap-1 border-b border-border">
        {[
          { id: "view", label: "Ko'rinish rejimi" },
          { id: "colors", label: "Fon va ranglar" },
          { id: "fonts", label: "Shriftlar" },
        ].map((st) => (
          <button key={st.id} type="button" onClick={() => setSubTab(st.id)}
            className={cn("px-3 py-2 text-sm font-bold rounded-t-lg transition-colors cursor-pointer relative",
              subTab === st.id ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
            {st.label}
            {subTab === st.id && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />
            )}
          </button>
        ))}
      </div>

      {subTab === "view" && (
        <div className="space-y-5">
          <div>
            <SectionTitle>Katalog ko'rinish rejimi</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-3">
              {VIEW_MODES.map((m) => (
                <button key={m.id} type="button" onClick={() => setView(m.id)}
                  className={cn("rounded-xl border p-3 text-left cursor-pointer transition-colors",
                    viewMode === m.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted")}>
                  <p className={cn("font-bold text-sm", viewMode === m.id ? "text-primary" : "text-foreground")}>{m.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{m.hint}</p>
                </button>
              ))}
            </div>
            <Hint>Bitta ko'rinish rejimini tanlang (ochiluvchi ro'yxatsiz).</Hint>
          </div>
          <Divider />
          <div>
            <SectionTitle>Mahsulot kartochkasi rejimi</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-2">
              {CARD_MODES.map((m) => (
                <button key={m.id} type="button" onClick={() => setCard(m.id)}
                  className={cn("rounded-xl border p-3 text-left cursor-pointer transition-colors",
                    cardMode === m.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted")}>
                  <p className={cn("font-bold text-sm", cardMode === m.id ? "text-primary" : "text-foreground")}>{m.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{m.hint}</p>
                </button>
              ))}
            </div>
            <Hint>Menyu va mijoz vitrinasidagi mahsulot kartochkalariga ta'sir qiladi.</Hint>
          </div>
        </div>
      )}

      {subTab === "colors" && (
        <div className="space-y-4">
          <Field label="Asosiy rang">
            <div className="flex gap-3 items-center">
              <input type="color" value={f.ui_primary_color || "#2563EB"} className="h-11 w-16 rounded-xl border border-border cursor-pointer"
                onChange={(e) => setF((s) => ({ ...s, ui_primary_color: e.target.value }))} />
              <Input value={f.ui_primary_color || "#2563EB"}
                onChange={(e) => setF((s) => ({ ...s, ui_primary_color: e.target.value }))} />
            </div>
          </Field>
        </div>
      )}

      {subTab === "fonts" && (
        <div>
          <Field label="Shrift">
            <Select value={f.ui_font_family || "sans"} onChange={(e) => setF((s) => ({ ...s, ui_font_family: e.target.value }))}>
              <option value="sans">Sans-serif (standart)</option>
              <option value="serif">Serif</option>
              <option value="mono">Monospace</option>
            </Select>
          </Field>
        </div>
      )}

      <SaveBar saving={saving} onSave={onSave} />
    </div>
  );
}

/* ── 4. Reklama bannerlari ───────────────────────────────────── */
function BannerlarTab({ f, setF, onSave, saving }) {
  const banners = getSC(f, "banner_images", []);
  const setBanners = setSCFn(setF, "banner_images");
  const [url, setUrl] = useState("");

  const addBanner = () => {
    if (!url.trim()) return;
    setBanners([...banners, url.trim()]);
    setUrl("");
  };
  const removeBanner = (i) => setBanners(banners.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">{t("settings_banners_hint")}</p>
      <div className="space-y-3">
        {banners.map((b, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl border border-border p-2">
            <img src={b} alt="" className="h-12 w-20 rounded-lg object-cover border border-border flex-shrink-0" onError={(e) => e.target.style.display = 'none'} />
            <span className="flex-1 truncate text-xs text-muted-foreground">{b}</span>
            <Button variant="ghost" size="iconSm" onClick={() => removeBanner(i)}>×</Button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Input placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addBanner()} />
        <Button onClick={addBanner} variant="outline">+</Button>
      </div>
      <SaveBar saving={saving} onSave={onSave} />
    </div>
  );
}

/* ── 5. Kategoriya rasmlari ──────────────────────────────────── */
function KategoriyaRasmlariTab({ categories }) {
  const catIndex = indexCategories(categories);
  const roots = childrenOf(catIndex, null).slice(1); // skip first root category
  const [sel1, setSel1] = useState(null);
  const [sel2, setSel2] = useState(null);
  const [uploading, setUploading] = useState(null);

  const subs = sel1 ? childrenOf(catIndex, sel1) : [];
  const thirds = sel2 ? childrenOf(catIndex, sel2) : [];

  const uploadImage = async (catId, file) => {
    setUploading(catId);
    try {
      const fd = new FormData(); fd.append("photo", file);
      // use existing products photo endpoint pattern - but for categories we'll just update image_url
      const reader = new FileReader();
      reader.onload = async (e) => {
        // For now, update the image_url via PATCH
        await api.patch(`/categories/${catId}`, { image_url: "" });
      };
      reader.readAsDataURL(file);
    } catch { /* ignore */ }
    finally { setUploading(null); }
  };

  function CatRow({ cat, selected, onSelect }) {
    return (
      <button type="button" onClick={() => onSelect(cat.id)}
        className={cn("w-full flex items-center gap-3 rounded-xl p-2.5 text-left cursor-pointer transition-colors",
          selected ? "bg-primary/5 border border-primary/30" : "hover:bg-muted border border-transparent")}>
        <div className="h-10 w-10 shrink-0 rounded-xl border border-border bg-muted flex items-center justify-center overflow-hidden">
          {cat.image_url
            ? <img src={cat.image_url} alt="" className="h-full w-full object-cover" />
            : <span className="text-xs text-muted-foreground">📁</span>}
        </div>
        <span className="truncate text-sm font-semibold text-foreground">{catName(cat)}</span>
      </button>
    );
  }

  function ColPane({ title, cats, selected, onSelect }) {
    return (
      <div className="flex flex-col rounded-2xl border border-border overflow-hidden">
        <div className="border-b border-border bg-muted/50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {title}
        </div>
        <div className="flex-1 overflow-y-auto p-2 min-h-64 max-h-80 space-y-1">
          {cats.length === 0
            ? <div className="flex h-full items-center justify-center text-xs text-muted-foreground">👈 Oldingi darajadan kategoriya tanlang</div>
            : cats.map((c) => <CatRow key={c.id} cat={c} selected={selected === c.id} onSelect={onSelect} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">{t("settings_cat_images_hint")}</p>
      <div className="grid grid-cols-3 gap-3">
        <ColPane title="Asosiy daraja" cats={roots} selected={sel1} onSelect={(id) => { setSel1(id); setSel2(null); }} />
        <ColPane title="Daraja 2" cats={subs} selected={sel2} onSelect={(id) => { setSel2(id); }} />
        <ColPane title="Daraja 3" cats={thirds} selected={null} onSelect={() => {}} />
      </div>
      <p className="text-xs text-muted-foreground">
        <span className="text-primary font-semibold cursor-pointer">Kategoriyani tanlang</span> va ro'yxatning o'zida rasmni tanlang.
      </p>
    </div>
  );
}

/* ── 6. Telegram ─────────────────────────────────────────────── */
function TelegramTab({ f, setF, onSave, saving }) {
  const [tokenVisible, setTokenVisible] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);

  const verify = async () => {
    if (!f._bot_token_input) return;
    setVerifying(true);
    try {
      const r = await api.post("/auth/telegram/verify", { token: f._bot_token_input });
      setVerifyResult({ ok: true, name: r.data?.name, username: r.data?.username });
    } catch {
      setVerifyResult({ ok: false });
    } finally { setVerifying(false); }
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="font-bold text-foreground mb-1">{t("settings_telegram_title")}</p>
        <p className="text-xs text-muted-foreground">{t("settings_telegram_hint")}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label>Bot Token</Label>
          <div className="relative">
            <Input type={tokenVisible ? "text" : "password"} value={f._bot_token_input || ""}
              onChange={(e) => setF((s) => ({ ...s, _bot_token_input: e.target.value, telegram_bot_token: e.target.value }))}
              placeholder="123456:ABC..." />
          </div>
        </div>
        <div>
          <Label>Group ID ({t("settings_telegram_group_hint")})</Label>
          <Input value={f.telegram_group_id || ""} onChange={(e) => setF((s) => ({ ...s, telegram_group_id: e.target.value }))} />
        </div>
        <div>
          <Label>Tekshirish</Label>
          <Button type="button" variant="outline" className="w-full" onClick={verify} disabled={verifying}>
            {verifying ? <Spinner size={16} /> : null}
            {t("settings_telegram_verify")}
          </Button>
        </div>
      </div>
      {verifyResult && (
        <div className={cn("rounded-xl p-3 text-sm font-semibold",
          verifyResult.ok ? "bg-emerald-50 text-emerald-700" : "bg-destructive/10 text-destructive")}>
          {verifyResult.ok ? `✓ ${verifyResult.name} @${verifyResult.username}` : t("error")}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label>{t("settings_bot_name")}</Label>
          <div className="flex h-11 items-center gap-2 rounded-xl border border-border bg-muted px-3.5 text-sm text-muted-foreground">
            {f.telegram_bot_name || "—"}
          </div>
        </div>
        <div>
          <Label>{t("settings_bot_username")}</Label>
          <div className="flex h-11 items-center gap-2 rounded-xl border border-border bg-muted px-3.5 text-sm text-muted-foreground">
            {f.telegram_bot_username || "—"}
          </div>
        </div>
        <div>
          <Label>{t("settings_support_username")}</Label>
          <Input value={f.support_username || ""} onChange={(e) => setF((s) => ({ ...s, support_username: e.target.value }))}
            placeholder="@username" />
        </div>
      </div>
      <SaveBar saving={saving} onSave={onSave} />
    </div>
  );
}

/* ── 7. To'lov tizimlari ─────────────────────────────────────── */
function TulovTab({ f, setF, onSave, saving }) {
  const nsf = (ns) => setNestedSCFn(setF, ns);
  const nsSC = (ns, key, def) => nestedSC(f, ns, key, def);

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">{t("settings_payment_hint")}</p>

      {/* Nalichnye */}
      <PayCard icon={CreditCard} label="Nalichnye" hint="Oplatа nalichnymi pri poluchenii zakaza."
        configured={f.cash_enabled}>
        <ToggleRow label="Оплата наличными" hint="Если выключить, клиенты не смогут выбрать наличную оплату."
          checked={f.cash_enabled !== false} onChange={(v) => setF((s) => ({ ...s, cash_enabled: v }))} />
      </PayCard>

      {/* Karta */}
      <PayCard icon={CreditCard} label="Karta" hint="Оплата переводом на карту магазина с отправкой чека."
        configured={!!(f.card_number)}>
        <div className="space-y-3">
          <ToggleRow label="Kartani yoqish" checked={f.card_enabled} onChange={(v) => setF((s) => ({ ...s, card_enabled: v }))} />
          <Field label="Karta nomi">
            <Input value={f.card_payment_title || ""} placeholder="Масalan: HUMO / UZCARD"
              onChange={(e) => setF((s) => ({ ...s, card_payment_title: e.target.value }))} />
          </Field>
          <Row className="sm:grid-cols-2">
            <Field label="Karta raqami">
              <Input value={f.card_number || ""} placeholder="8600..."
                onChange={(e) => setF((s) => ({ ...s, card_number: e.target.value }))} />
            </Field>
            <Field label="Karta egasi">
              <Input value={f.card_holder || ""} placeholder="Ism Familiya"
                onChange={(e) => setF((s) => ({ ...s, card_holder: e.target.value }))} />
            </Field>
          </Row>
          <div>
            <Label>{t("settings_card_receipt_mode")}</Label>
            <div className="space-y-2 mt-1">
              {[
                { val: true, label: "Chekni bot orqali yuborish" },
                { val: false, label: "Chekni administratorga yuborish" },
              ].map((opt) => (
                <label key={String(opt.val)} className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="radio" name="card_receipt" checked={nsSC("card", "receipt_via_bot", true) === opt.val}
                    onChange={() => nsf("card")("receipt_via_bot")(opt.val)} className="accent-primary" />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>
        </div>
      </PayCard>

      {/* Bank */}
      <PayCard icon={CreditCard} label="Bank" hint="Оплата по банковским реквизитам магазина."
        configured={!!(nsSC("bank", "account", ""))}>
        <div className="space-y-3">
          <ToggleRow label="Bankni yoqish" checked={nsSC("bank", "enabled", false)}
            onChange={nsf("bank")("enabled")} />
          <Row className="sm:grid-cols-2">
            <Field label="P/C"><Input value={nsSC("bank", "account", "")} placeholder="2020..."
              onChange={(e) => nsf("bank")("account")(e.target.value)} /></Field>
            <Field label="Bank nomi"><Input value={nsSC("bank", "bank_name", "")} placeholder="Masalan: Agrobank"
              onChange={(e) => nsf("bank")("bank_name")(e.target.value)} /></Field>
            <Field label="INN"><Input value={nsSC("bank", "inn", "")} placeholder="123456789"
              onChange={(e) => nsf("bank")("inn")(e.target.value)} /></Field>
            <Field label="MFO"><Input value={nsSC("bank", "mfo", "")} placeholder="00450"
              onChange={(e) => nsf("bank")("mfo")(e.target.value)} /></Field>
            <Field label="OKXD"><Input value={nsSC("bank", "okxd", "")} placeholder="47.91"
              onChange={(e) => nsf("bank")("okxd")(e.target.value)} /></Field>
            <Field label="OKONX"><Input value={nsSC("bank", "okonx", "")} placeholder="96170"
              onChange={(e) => nsf("bank")("okonx")(e.target.value)} /></Field>
          </Row>
          <Field label="Yuridik manzil">
            <textarea rows={2} value={nsSC("bank", "legal_address", "")} placeholder="Yuridik manzilni kiriting"
              onChange={(e) => nsf("bank")("legal_address")(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </Field>
        </div>
      </PayCard>

      {/* Click */}
      <PayCard icon={CreditCard} label="Click" hint="Персональная ссылка для перевода клиента в оплату Click."
        configured={!!(f.click_url || nsSC("click", "merchant_id", ""))}>
        <div className="space-y-3">
          <ToggleRow label="Click ni yoqish" checked={nsSC("click", "enabled", false)}
            onChange={nsf("click")("enabled")} />
          <Field label="Click URL">
            <Input value={f.click_url || ""} placeholder="https://..."
              onChange={(e) => setF((s) => ({ ...s, click_url: e.target.value }))} />
          </Field>
          <div className="rounded-xl border border-border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-foreground uppercase tracking-wide">Click Merchant API</p>
              <ToggleRow label="" checked={nsSC("click", "api_enabled", false)} onChange={nsf("click")("api_enabled")} />
            </div>
            <Row className="sm:grid-cols-3">
              <Field label="Merchant ID"><Input value={nsSC("click", "merchant_id", "")}
                onChange={(e) => nsf("click")("merchant_id")(e.target.value)} /></Field>
              <Field label="API login"><Input value={nsSC("click", "api_login", "")}
                onChange={(e) => nsf("click")("api_login")(e.target.value)} /></Field>
              <Field label="API password"><Input type="password" value={nsSC("click", "api_password", "")}
                onChange={(e) => nsf("click")("api_password")(e.target.value)} /></Field>
            </Row>
            <ToggleRow label="Тестовый режим" checked={nsSC("click", "test_mode", false)} onChange={nsf("click")("test_mode")} />
          </div>
        </div>
      </PayCard>

      {/* Payme */}
      <PayCard icon={CreditCard} label="Payme" hint="Ссылка оплаты и Merchant API для автоматического подтверждения заказов."
        configured={f.payme_enabled}>
        <div className="space-y-3">
          <ToggleRow label="Payme ni yoqish" checked={f.payme_enabled}
            onChange={(v) => setF((s) => ({ ...s, payme_enabled: v }))} />
          <Field label="Payme URL">
            <Input value={f.payme_url || ""} placeholder="https://..."
              onChange={(e) => setF((s) => ({ ...s, payme_url: e.target.value }))} />
          </Field>
          <div className="rounded-xl border border-border p-3 space-y-2">
            <p className="text-xs font-bold text-foreground uppercase tracking-wide">Payme Merchant API</p>
            <Row className="sm:grid-cols-3">
              <Field label="Merchant ID"><Input value={f.payme_merchant_id || ""}
                onChange={(e) => setF((s) => ({ ...s, payme_merchant_id: e.target.value }))} /></Field>
              <Field label="API login"><Input value={nsSC("payme", "api_login", "")}
                onChange={(e) => nsf("payme")("api_login")(e.target.value)} /></Field>
              <Field label="API password"><Input type="password" value={nsSC("payme", "api_password", "")}
                onChange={(e) => nsf("payme")("api_password")(e.target.value)} /></Field>
            </Row>
            <ToggleRow label="Тестовый режим" checked={nsSC("payme", "test_mode", false)} onChange={nsf("payme")("test_mode")} />
          </div>
        </div>
      </PayCard>

      {/* Uzum */}
      <PayCard icon={CreditCard} label="Uzum" hint="Ссылка для перенаправления клиента на оплату через Uzum."
        configured={!!(f.uzum_url)}>
        <div className="space-y-3">
          <ToggleRow label="Uzum ni yoqish" checked={nsSC("uzum", "enabled", false)}
            onChange={nsf("uzum")("enabled")} />
          <Field label="Uzum URL">
            <Input value={f.uzum_url || ""} placeholder="https://..."
              onChange={(e) => setF((s) => ({ ...s, uzum_url: e.target.value }))} />
          </Field>
          <div className="rounded-xl border border-border p-3 space-y-2">
            <p className="text-xs font-bold text-foreground uppercase tracking-wide">Uzum Merchant API</p>
            <Row className="sm:grid-cols-3">
              <Field label="Merchant ID"><Input value={nsSC("uzum", "merchant_id", "")}
                onChange={(e) => nsf("uzum")("merchant_id")(e.target.value)} /></Field>
              <Field label="API login"><Input value={nsSC("uzum", "api_login", "")}
                onChange={(e) => nsf("uzum")("api_login")(e.target.value)} /></Field>
              <Field label="API password"><Input type="password" value={nsSC("uzum", "api_password", "")}
                onChange={(e) => nsf("uzum")("api_password")(e.target.value)} /></Field>
            </Row>
            <ToggleRow label="Тестовый режим" checked={nsSC("uzum", "test_mode", false)} onChange={nsf("uzum")("test_mode")} />
          </div>
        </div>
      </PayCard>

      {/* Xazna */}
      <PayCard icon={CreditCard} label="Xazna" hint="Ссылка для перенаправления клиента на оплату через Xazna."
        configured={!!(nsSC("xazna", "url", ""))}>
        <div className="space-y-3">
          <ToggleRow label="Xazna ni yoqish" checked={nsSC("xazna", "enabled", false)}
            onChange={nsf("xazna")("enabled")} />
          <Field label="Xazna URL">
            <Input value={nsSC("xazna", "url", "")} placeholder="https://..."
              onChange={(e) => nsf("xazna")("url")(e.target.value)} />
          </Field>
          <div className="rounded-xl border border-border p-3 space-y-2">
            <p className="text-xs font-bold text-foreground uppercase tracking-wide">Xazna Merchant API</p>
            <Row className="sm:grid-cols-3">
              <Field label="Merchant ID"><Input value={nsSC("xazna", "merchant_id", "")}
                onChange={(e) => nsf("xazna")("merchant_id")(e.target.value)} /></Field>
              <Field label="API login"><Input value={nsSC("xazna", "api_login", "")}
                onChange={(e) => nsf("xazna")("api_login")(e.target.value)} /></Field>
              <Field label="API password"><Input type="password" value={nsSC("xazna", "api_password", "")}
                onChange={(e) => nsf("xazna")("api_password")(e.target.value)} /></Field>
            </Row>
            <ToggleRow label="Тестовый режим" checked={nsSC("xazna", "test_mode", false)} onChange={nsf("xazna")("test_mode")} />
          </div>
        </div>
      </PayCard>

      <SaveBar saving={saving} onSave={onSave} />
    </div>
  );
}

/* ── 8. Yetkazib berish ──────────────────────────────────────── */
function YetkazibBerishTab({ f, setF, onSave, saving }) {
  const dtModes = getSC(f, "delivery_time_modes", { asap: true, by_time: true, by_date: false, later: false });
  const setDT = (key) => (val) => {
    setF((s) => {
      const prev = sc(s);
      const m = prev.delivery_time_modes || { asap: true, by_time: true, by_date: false, later: false };
      return { ...s, showcase_config: { ...prev, delivery_time_modes: { ...m, [key]: val } } };
    });
  };
  const pricingMode = f.delivery_pricing_mode || "dynamic";

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <ToggleRow label={t("settings_delivery_own")} checked={f.is_delivery_enabled !== false}
          onChange={(v) => setF((s) => ({ ...s, is_delivery_enabled: v }))} />
        <ToggleRow label={t("settings_pickup")} checked={f.is_pickup_enabled !== false}
          onChange={(v) => setF((s) => ({ ...s, is_pickup_enabled: v }))} />
        <Hint>Agar o'z-o'zini olib ketish o'chirilgan bo'lsa, vitrinada faqat yetkazib berish rejimi ko'rsatiladi.</Hint>
      </div>

      <Divider />

      <div>
        <SectionTitle>Yetkazib berish markazi koordinatalari</SectionTitle>
        <Row className="sm:grid-cols-2">
          <Field label="Kenglik (Latitude)">
            <Input type="number" step="0.0001" value={f.latitude || ""}
              onChange={(e) => setF((s) => ({ ...s, latitude: e.target.value }))} />
          </Field>
          <Field label="Uzunlik (Longitude)">
            <Input type="number" step="0.0001" value={f.longitude || ""}
              onChange={(e) => setF((s) => ({ ...s, longitude: e.target.value }))} />
          </Field>
        </Row>
        <Hint>Xaritada bosing yoki koordinatalarni qo'lda kiriting.</Hint>
      </div>

      <Divider />

      <div>
        <SectionTitle>Narx rejimi</SectionTitle>
        <div className="flex gap-0 rounded-xl border border-border overflow-hidden w-fit">
          {[{ val: "fixed", label: "Fiksatsiyalangan" }, { val: "dynamic", label: "Dinamik" }].map((m) => (
            <button key={m.val} type="button"
              onClick={() => setF((s) => ({ ...s, delivery_pricing_mode: m.val }))}
              className={cn("px-4 py-2 text-sm font-bold transition-colors cursor-pointer",
                pricingMode === m.val ? "bg-foreground text-background" : "bg-background text-foreground hover:bg-muted")}>
              {m.label}
            </button>
          ))}
        </div>
        <Hint>Fiksatsiyalangan: har qanday masofaga bir narx. Dinamik: radius va kilometrlar bo'yicha.</Hint>
      </div>

      {pricingMode === "dynamic" ? (
        <Row className="sm:grid-cols-3">
          <Field label="Bazoviy radius (km)">
            <Input type="number" min="0" step="0.1" value={f.delivery_base_radius || ""}
              onChange={(e) => setF((s) => ({ ...s, delivery_base_radius: e.target.value }))} />
          </Field>
          <Field label="Bazoviy narx (so'm)">
            <Input type="number" min="0" value={f.delivery_base_price || ""}
              onChange={(e) => setF((s) => ({ ...s, delivery_base_price: e.target.value }))} />
          </Field>
          <Field label="Qo'shimcha km narxi (so'm)">
            <Input type="number" min="0" value={f.delivery_price_per_km || ""}
              onChange={(e) => setF((s) => ({ ...s, delivery_price_per_km: e.target.value }))} />
          </Field>
        </Row>
      ) : (
        <Field label="Fiksatsiyalangan narx (so'm)">
          <Input type="number" min="0" value={f.delivery_fixed_price || ""}
            onChange={(e) => setF((s) => ({ ...s, delivery_fixed_price: e.target.value }))} />
        </Field>
      )}

      <Divider />

      <div>
        <SectionTitle>Yetkazib berish vaqt rejimlari</SectionTitle>
        <div className="space-y-3">
          {[
            { key: "asap", label: "Imkon qadar tez" },
            { key: "by_time", label: "Vaqtga ko'ra (soat tanlash)" },
            { key: "by_date", label: "Tanlangan sanaga yetkazib berish" },
            { key: "later", label: '"Keyinroq yetkazib berish" operatori uchun rejim' },
          ].map((m) => (
            <ToggleRow key={m.key} label={m.label} checked={dtModes[m.key] !== false}
              onChange={setDT(m.key)} />
          ))}
        </div>
      </div>

      <SaveBar saving={saving} onSave={onSave} />
    </div>
  );
}

/* ── 9. Promokodlar ──────────────────────────────────────────── */
function PromokodlarTab({ f, setF, onSave, saving }) {
  const enabled = getSC(f, "promos_enabled", false);
  const setEnabled = setSCFn(setF, "promos_enabled");

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-bold text-foreground">Promokodlar</p>
          <Hint>Mijoz savatda kiritiladigan chegirma kodlari. Faqat shu do'kon uchun amal qiladi.</Hint>
        </div>
        <div className="flex items-center gap-2">
          <Toggle checked={enabled} onChange={setEnabled} />
          <SaveBar saving={saving} onSave={onSave} />
        </div>
      </div>

      {!enabled && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Promokodlar o'chirilgan. Faollashtiring va o'zgarishlarni saqlang.
          <div className="mt-2">
            <Button variant="outline" size="sm" onClick={() => { setEnabled(true); }}>
              Sozlamalarni saqlash
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── 10. Hisobotlar ──────────────────────────────────────────── */
function HisobotlarTab({ f, setF, onSave, saving }) {
  const nsf = setNestedSCFn(setF, "reports");
  const balanceNotify = nestedSC(f, "reports", "balance_after_confirm", true);
  const dailyReport = nestedSC(f, "reports", "daily_summary", true);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border p-4 space-y-4">
        <p className="font-bold text-foreground">{t("settings_reports_telegram")}</p>
        <Hint>{t("settings_reports_hint")}</Hint>
        <ToggleRow label={t("settings_reports_balance")} checked={balanceNotify}
          onChange={nsf("balance_after_confirm")} />
        <ToggleRow label={t("settings_reports_daily")} checked={dailyReport}
          onChange={nsf("daily_summary")} />
      </div>
      <SaveBar saving={saving} onSave={onSave} />
    </div>
  );
}

/* ── Main SettingsPage ──────────────────────────────────────── */
export default function SettingsPage() {
  const [tab, setTab] = useState("general");
  const [f, setF] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [categories, setCategories] = useState([]);
  const tabsRef = useRef(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      api.get("/stores/me").then((r) => alive && setF(r.data)),
      api.get("/categories").then((r) => alive && setCategories(asList(r.data))).catch(() => {}),
    ]).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const { _bot_token_input, ...payload } = f;
      const r = await api.patch("/stores/me", payload);
      setF((s) => ({ ...r.data, _bot_token_input: s._bot_token_input }));
      setToast(t("saved"));
    } catch {
      setToast(t("error"));
    } finally {
      setSaving(false);
    }
    setTimeout(() => setToast(""), 3000);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size={32} />
      </div>
    );
  }

  const tabProps = { f, setF, onSave: save, saving };

  return (
    <div>
      <PageHeader icon={Settings} title={t("nav_settings")} />

      {/* Tab bar — horizontally scrollable */}
      <div ref={tabsRef} className="mb-6 -mx-1 overflow-x-auto pb-px">
        <div className="flex gap-1 border-b border-border min-w-max px-1">
          {TABS.map((tb) => (
            <button key={tb.id} type="button" onClick={() => setTab(tb.id)}
              className={cn(
                "relative flex items-center gap-1.5 whitespace-nowrap px-3 py-2.5 text-sm font-bold transition-colors cursor-pointer rounded-t-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                tab === tb.id ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}>
              <tb.icon className="h-3.5 w-3.5" strokeWidth={2.2} />
              {tb.label}
              {tab === tb.id && (
                <motion.span layoutId="settings-tab-line"
                  className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }} />
              )}
            </button>
          ))}
        </div>
      </div>

      <Card className="p-5 sm:p-6">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={tab}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
            {tab === "general" && <UmumiyTab {...tabProps} />}
            {tab === "product" && <MahsulotTab {...tabProps} />}
            {tab === "design" && <DizaynTab {...tabProps} />}
            {tab === "banners" && <BannerlarTab {...tabProps} />}
            {tab === "cat_images" && <KategoriyaRasmlariTab categories={categories} />}
            {tab === "telegram" && <TelegramTab {...tabProps} />}
            {tab === "payment" && <TulovTab {...tabProps} />}
            {tab === "delivery" && <YetkazibBerishTab {...tabProps} />}
            {tab === "promos" && <PromokodlarTab {...tabProps} />}
            {tab === "reports" && <HisobotlarTab {...tabProps} />}
          </motion.div>
        </AnimatePresence>
      </Card>

      <Toast message={toast} />
    </div>
  );
}
