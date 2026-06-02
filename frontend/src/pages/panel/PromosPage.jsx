import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Percent, Plus, Ticket } from "lucide-react";
import api from "../../lib/api";
import { t } from "../../lib/i18n";
import { formatPrice } from "../../lib/format";
import { asList } from "../../lib/panel";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input, Label, Select } from "../../components/ui/Input";
import { Spinner } from "../../components/ui/Spinner";
import { cn } from "../../lib/cn";
import {
  ConfirmDelete,
  EmptyState,
  PageHeader,
  SkeletonList,
} from "../../components/panel/common";

const EMPTY = {
  code: "",
  discount_type: "percent",
  discount_value: "",
  valid_until: "",
  usage_limit: "",
};

function formatDiscount(p) {
  if (p.discount_type === "percent") return `${p.discount_value}%`;
  return formatPrice(p.discount_value);
}

function PromoRow({ promo, onToggle, onDelete, busy, index }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      layout
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 26,
        delay: Math.min(index * 0.03, 0.18),
      }}
      className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-background p-4 shadow-soft"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
        <Ticket className="h-5 w-5" strokeWidth={2.2} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg bg-foreground px-2.5 py-1 font-mono text-sm font-bold uppercase tracking-wider text-background">
            {promo.code}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
            <Percent className="h-3 w-3" strokeWidth={2.4} />
            {formatDiscount(promo)}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("used_count")}: <span className="font-bold text-foreground">{promo.used_count ?? 0}</span>
          {promo.usage_limit ? ` / ${promo.usage_limit}` : ""}
          {promo.valid_until ? ` · ${t("valid_until")} ${promo.valid_until}` : ""}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => onToggle(promo)}
          aria-pressed={promo.is_active}
          className={cn(
            "inline-flex h-9 items-center gap-2 rounded-xl px-3 text-xs font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            promo.is_active
              ? "bg-accent/10 text-accent"
              : "bg-muted text-muted-foreground"
          )}
        >
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              promo.is_active ? "bg-accent" : "bg-muted-foreground"
            )}
          />
          {promo.is_active ? t("active") : t("inactive")}
        </button>
        <ConfirmDelete busy={busy} onConfirm={() => onDelete(promo.id)} />
      </div>
    </motion.div>
  );
}

export default function PromosPage() {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    let alive = true;
    api
      .get("/promos")
      .then((r) => alive && setPromos(asList(r.data)))
      .catch(() => alive && setPromos([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const set = (k) => (e) => setForm((s) => ({ ...s, [k]: e.target.value }));

  const add = async (e) => {
    e.preventDefault();
    if (!form.code.trim() || !form.discount_value) return;
    setSaving(true);
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        is_active: true,
        valid_until: form.valid_until || null,
        usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
      };
      const { data } = await api.post("/promos", payload);
      setPromos((list) => [data, ...list]);
      setForm(EMPTY);
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (promo) => {
    const next = !promo.is_active;
    setPromos((list) =>
      list.map((p) => (p.id === promo.id ? { ...p, is_active: next } : p))
    );
    try {
      await api.patch(`/promos/${promo.id}`, { is_active: next });
    } catch {
      setPromos((list) =>
        list.map((p) => (p.id === promo.id ? { ...p, is_active: !next } : p))
      );
    }
  };

  const remove = async (id) => {
    setBusyId(id);
    try {
      await api.delete(`/promos/${id}`);
      setPromos((list) => list.filter((p) => p.id !== id));
    } catch {
      /* ignore */
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <PageHeader icon={Ticket} title={t("nav_promos")} />

      <Card className="mb-6 p-4 sm:p-5">
        <form onSubmit={add} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
          <div>
            <Label htmlFor="pr-code">{t("promo_code")}</Label>
            <Input
              id="pr-code"
              value={form.code}
              onChange={set("code")}
              placeholder="SALE20"
              className="uppercase"
            />
          </div>
          <div>
            <Label htmlFor="pr-type">{t("discount_type")}</Label>
            <Select id="pr-type" value={form.discount_type} onChange={set("discount_type")}>
              <option value="percent">{t("type_percent")}</option>
              <option value="fixed">{t("type_fixed")}</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="pr-value">{t("discount_value")}</Label>
            <Input
              id="pr-value"
              type="number"
              min="0"
              value={form.discount_value}
              onChange={set("discount_value")}
            />
          </div>
          <div>
            <Label htmlFor="pr-until">{t("valid_until")}</Label>
            <Input
              id="pr-until"
              type="date"
              value={form.valid_until}
              onChange={set("valid_until")}
            />
          </div>
          <div>
            <Label htmlFor="pr-limit">{t("usage_limit")}</Label>
            <Input
              id="pr-limit"
              type="number"
              min="0"
              value={form.usage_limit}
              onChange={set("usage_limit")}
            />
          </div>
          <div className="lg:col-span-5">
            <Button type="submit" disabled={saving} className="w-full sm:w-auto">
              {saving ? (
                <Spinner className="text-primary-foreground" size={16} />
              ) : (
                <Plus className="h-4 w-4" strokeWidth={2.4} />
              )}
              {t("create")}
            </Button>
          </div>
        </form>
      </Card>

      {loading ? (
        <SkeletonList rows={4} />
      ) : promos.length === 0 ? (
        <EmptyState icon={Ticket} title={t("no_promos")} />
      ) : (
        <motion.div layout className="space-y-3">
          <AnimatePresence initial={false}>
            {promos.map((p, i) => (
              <PromoRow
                key={p.id}
                promo={p}
                index={i}
                busy={busyId === p.id}
                onToggle={toggle}
                onDelete={remove}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
