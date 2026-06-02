import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ChevronDown,
  Clock,
  CreditCard,
  MessageSquare,
  Palette,
  Settings,
  Store,
  Truck,
} from "lucide-react";
import api from "../../lib/api";
import { t } from "../../lib/i18n";
import { cn } from "../../lib/cn";
import { Button } from "../../components/ui/Button";
import { Input, Label, Select } from "../../components/ui/Input";
import { Spinner, FullScreenLoader } from "../../components/ui/Spinner";
import {
  PageHeader,
  Toast,
  Toggle,
} from "../../components/panel/common";

/** Labelled text/number input bound to the settings form. */
function Field({ id, label, value, onChange, type = "text", ...rest }) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        {...rest}
      />
    </div>
  );
}

/** Labelled textarea bound to the settings form. */
function TextAreaField({ id, label, value, onChange, rows = 2 }) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <textarea
        id={id}
        rows={rows}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full resize-y rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground shadow-soft transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary"
      />
    </div>
  );
}

/** Collapsible accordion section with an animated body. */
function Section({ icon: Icon, title, open, onToggle, children }) {
  const reduce = useReducedMotion();
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-soft">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-4 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-5"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" strokeWidth={2.2} />
        </span>
        <span className="flex-1 font-display text-base font-extrabold text-foreground">
          {title}
        </span>
        <ChevronDown
          className={cn(
            "h-5 w-5 text-muted-foreground transition-transform duration-200",
            open && "rotate-180"
          )}
          strokeWidth={2.2}
        />
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reduce ? { opacity: 1 } : { height: "auto", opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="space-y-3.5 border-t border-border px-4 py-4 sm:px-5 sm:py-5">
              {children}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export default function SettingsPage() {
  const [f, setF] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [open, setOpen] = useState("store");

  useEffect(() => {
    let alive = true;
    api
      .get("/stores/me")
      .then((r) => alive && setF({ ...r.data, telegram_bot_token: "" }))
      .catch(() => alive && setF({}))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 3200);
    return () => clearTimeout(id);
  }, [toast]);

  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));
  const toggleSection = (id) => setOpen((cur) => (cur === id ? "" : id));

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...f };
      // Bot token is write-only: omit it from the PATCH when left blank so we
      // never overwrite the stored token with an empty string.
      if (!payload.telegram_bot_token?.trim()) delete payload.telegram_bot_token;
      const { data } = await api.patch("/stores/me", payload);
      setF({ ...data, telegram_bot_token: "" });
      setToast(t("saved"));
    } catch {
      setToast(t("error"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <FullScreenLoader label={t("loading")} />;

  const dynamic = f.delivery_pricing_mode !== "fixed";

  return (
    <div className="pb-24">
      <PageHeader icon={Settings} title={t("nav_settings")} />

      <div className="space-y-4">
        {/* Do'kon */}
        <Section
          icon={Store}
          title={t("set_store")}
          open={open === "store"}
          onToggle={() => toggleSection("store")}
        >
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <Field id="s-name" label={t("store_name")} value={f.name} onChange={set("name")} />
            <Field id="s-phone" label={t("phone")} value={f.phone} onChange={set("phone")} />
          </div>
          <Field id="s-addr" label={t("address")} value={f.address} onChange={set("address")} />
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <Field
              id="s-support"
              label={t("support_username")}
              value={f.support_username}
              onChange={set("support_username")}
            />
            <Field id="s-logo" label={t("logo_url")} value={f.logo_url} onChange={set("logo_url")} />
          </div>
        </Section>

        {/* Ish vaqti */}
        <Section
          icon={Clock}
          title={t("set_hours")}
          open={open === "hours"}
          onToggle={() => toggleSection("hours")}
        >
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
            <Field id="s-open" label={t("open_time")} type="time" value={f.open_time} onChange={set("open_time")} />
            <Field id="s-close" label={t("close_time")} type="time" value={f.close_time} onChange={set("close_time")} />
            <Field id="s-tz" label={t("timezone")} value={f.timezone} onChange={set("timezone")} placeholder="Asia/Tashkent" />
          </div>
        </Section>

        {/* Yetkazib berish */}
        <Section
          icon={Truck}
          title={t("set_delivery")}
          open={open === "delivery"}
          onToggle={() => toggleSection("delivery")}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Toggle
              checked={!!f.is_delivery_enabled}
              onChange={set("is_delivery_enabled")}
              label={t("delivery_enabled")}
            />
            <Toggle
              checked={!!f.is_pickup_enabled}
              onChange={set("is_pickup_enabled")}
              label={t("pickup_enabled")}
            />
          </div>

          <div>
            <Label htmlFor="s-mode">{t("pricing_mode")}</Label>
            <Select
              id="s-mode"
              value={f.delivery_pricing_mode || "dynamic"}
              onChange={(e) => set("delivery_pricing_mode")(e.target.value)}
            >
              <option value="dynamic">{t("mode_dynamic")}</option>
              <option value="fixed">{t("mode_fixed")}</option>
            </Select>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={dynamic ? "dyn" : "fix"}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 gap-3.5 sm:grid-cols-3"
            >
              {dynamic ? (
                <>
                  <Field id="s-radius" label={t("base_radius")} type="number" value={f.delivery_base_radius} onChange={set("delivery_base_radius")} />
                  <Field id="s-bprice" label={t("base_price")} type="number" value={f.delivery_base_price} onChange={set("delivery_base_price")} />
                  <Field id="s-perkm" label={t("price_per_km")} type="number" value={f.delivery_price_per_km} onChange={set("delivery_price_per_km")} />
                </>
              ) : (
                <Field id="s-fixed" label={t("fixed_price")} type="number" value={f.delivery_fixed_price} onChange={set("delivery_fixed_price")} />
              )}
            </motion.div>
          </AnimatePresence>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <Field id="s-min" label={t("minimum_order")} type="number" value={f.minimum_order_amount} onChange={set("minimum_order_amount")} />
            <Field id="s-fee" label={t("service_fee")} type="number" value={f.service_fee} onChange={set("service_fee")} />
          </div>
        </Section>

        {/* To'lov */}
        <Section
          icon={CreditCard}
          title={t("set_payment")}
          open={open === "payment"}
          onToggle={() => toggleSection("payment")}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Toggle checked={!!f.cash_enabled} onChange={set("cash_enabled")} label={t("cash_enabled")} />
            <Toggle checked={!!f.card_enabled} onChange={set("card_enabled")} label={t("card_enabled")} />
            <Toggle checked={!!f.payme_enabled} onChange={set("payme_enabled")} label={t("payme_enabled")} />
          </div>

          <AnimatePresence initial={false}>
            {f.card_enabled ? (
              <motion.div
                key="card"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 gap-3.5 rounded-xl border border-border bg-muted/40 p-3.5 sm:grid-cols-3">
                  <Field id="s-ctitle" label={t("card_title")} value={f.card_payment_title} onChange={set("card_payment_title")} />
                  <Field id="s-cnum" label={t("card_number")} value={f.card_number} onChange={set("card_number")} />
                  <Field id="s-chold" label={t("card_holder")} value={f.card_holder} onChange={set("card_holder")} />
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <AnimatePresence initial={false}>
            {f.payme_enabled ? (
              <motion.div
                key="payme"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 gap-3.5 rounded-xl border border-border bg-muted/40 p-3.5 sm:grid-cols-2">
                  <Field id="s-pmid" label={t("payme_merchant")} value={f.payme_merchant_id} onChange={set("payme_merchant_id")} />
                  <Field id="s-pmurl" label={t("payme_url")} value={f.payme_url} onChange={set("payme_url")} />
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <Field id="s-click" label={t("click_url")} value={f.click_url} onChange={set("click_url")} />
            <Field id="s-uzum" label={t("uzum_url")} value={f.uzum_url} onChange={set("uzum_url")} />
          </div>
        </Section>

        {/* Bot xabarlari */}
        <Section
          icon={MessageSquare}
          title={t("set_messages")}
          open={open === "messages"}
          onToggle={() => toggleSection("messages")}
        >
          <TextAreaField id="s-mnew" label={t("msg_new")} value={f.msg_new} onChange={set("msg_new")} />
          <TextAreaField id="s-mprep" label={t("msg_preparing")} value={f.msg_preparing} onChange={set("msg_preparing")} />
          <TextAreaField id="s-mdel" label={t("msg_delivering")} value={f.msg_delivering} onChange={set("msg_delivering")} />
          <TextAreaField id="s-mdone" label={t("msg_delivered")} value={f.msg_delivered} onChange={set("msg_delivered")} />
          <TextAreaField id="s-mcanc" label={t("msg_cancelled")} value={f.msg_cancelled} onChange={set("msg_cancelled")} />
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <Field id="s-group" label={t("telegram_group")} value={f.telegram_group_id} onChange={set("telegram_group_id")} />
            <div>
              <Label htmlFor="s-token">{t("bot_token")}</Label>
              <Input
                id="s-token"
                type="password"
                autoComplete="new-password"
                value={f.telegram_bot_token ?? ""}
                onChange={(e) => set("telegram_bot_token")(e.target.value)}
                placeholder="••••••••"
              />
              <p className="mt-1 text-xs text-muted-foreground">{t("bot_token_hint")}</p>
            </div>
          </div>
        </Section>

        {/* Ko'rinish */}
        <Section
          icon={Palette}
          title={t("set_appearance")}
          open={open === "appearance"}
          onToggle={() => toggleSection("appearance")}
        >
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div>
              <Label htmlFor="s-theme">{t("ui_theme")}</Label>
              <Select
                id="s-theme"
                value={f.ui_theme || "light"}
                onChange={(e) => set("ui_theme")(e.target.value)}
              >
                <option value="light">{t("theme_light")}</option>
                <option value="dark">{t("theme_dark")}</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="s-color">{t("primary_color")}</Label>
              <div className="flex items-center gap-3">
                <input
                  id="s-color"
                  type="color"
                  value={f.ui_primary_color || "#2563EB"}
                  onChange={(e) => set("ui_primary_color")(e.target.value)}
                  className="h-11 w-14 shrink-0 cursor-pointer rounded-xl border border-border bg-background p-1 shadow-soft"
                />
                <Input
                  value={f.ui_primary_color ?? ""}
                  onChange={(e) => set("ui_primary_color")(e.target.value)}
                  placeholder="#2563EB"
                  className="font-mono"
                />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <Field id="s-font" label={t("font_family")} value={f.ui_font_family} onChange={set("ui_font_family")} placeholder="Nunito Sans" />
            <div>
              <Label htmlFor="s-menu">{t("menu_view")}</Label>
              <Select
                id="s-menu"
                value={f.menu_view_mode || "grid"}
                onChange={(e) => set("menu_view_mode")(e.target.value)}
              >
                <option value="grid">grid</option>
                <option value="list">list</option>
              </Select>
            </div>
          </div>
        </Section>
      </div>

      {/* Sticky save bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/90 px-4 py-3 backdrop-blur-md lg:pl-64">
        <div className="mx-auto flex max-w-6xl justify-end sm:px-6">
          <Button onClick={save} disabled={saving} size="lg" className="w-full sm:w-auto">
            {saving ? <Spinner className="text-primary-foreground" size={18} /> : null}
            {t("save_changes")}
          </Button>
        </div>
      </div>

      <Toast message={toast} />
    </div>
  );
}
