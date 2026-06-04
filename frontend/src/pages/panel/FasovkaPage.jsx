import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Box, Plus } from "lucide-react";
import api from "../../lib/api";
import { t } from "../../lib/i18n";
import { asList } from "../../lib/panel";
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


const EMPTY_FORM = { name: "", price: "", sort_order: 0 };

function PackagingModal({ open, onOpenChange, onSaved }) {
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
      </div>
    </Modal>
  );
}

export default function FasovkaPage() {
  const reduce = useReducedMotion();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = () => {
    setLoading(true);
    api.get("/packagings").then((r) => setItems(asList(r.data))).catch(() => {}).finally(() => setLoading(false));
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
        onSaved={load}
      />
    </div>
  );
}
