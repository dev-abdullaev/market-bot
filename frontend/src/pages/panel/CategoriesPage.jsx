import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Plus, Tags } from "lucide-react";
import api from "../../lib/api";
import { t } from "../../lib/i18n";
import { localName } from "../../lib/format";
import { asList } from "../../lib/panel";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input, Label } from "../../components/ui/Input";
import { Spinner } from "../../components/ui/Spinner";
import {
  ConfirmDelete,
  EmptyState,
  PageHeader,
  SkeletonList,
} from "../../components/panel/common";

export default function CategoriesPage() {
  const reduce = useReducedMotion();
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name_uz: "", name_ru: "" });
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    let alive = true;
    api
      .get("/categories")
      .then((r) => alive && setCats(asList(r.data)))
      .catch(() => alive && setCats([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const add = async (e) => {
    e.preventDefault();
    if (!form.name_uz.trim() && !form.name_ru.trim()) return;
    setSaving(true);
    try {
      const { data } = await api.post("/categories", {
        name_uz: form.name_uz.trim(),
        name_ru: form.name_ru.trim(),
        is_active: true,
      });
      setCats((list) => [...list, data]);
      setForm({ name_uz: "", name_ru: "" });
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    setBusyId(id);
    try {
      await api.delete(`/categories/${id}`);
      setCats((list) => list.filter((c) => c.id !== id));
    } catch {
      /* ignore */
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <PageHeader icon={Tags} title={t("nav_categories")} />

      <Card className="mb-6 p-4 sm:p-5">
        <form onSubmit={add} className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div>
            <Label htmlFor="cat-uz">{t("name_uz")}</Label>
            <Input
              id="cat-uz"
              value={form.name_uz}
              onChange={(e) => setForm((s) => ({ ...s, name_uz: e.target.value }))}
              placeholder={t("name_uz")}
            />
          </div>
          <div>
            <Label htmlFor="cat-ru">{t("name_ru")}</Label>
            <Input
              id="cat-ru"
              value={form.name_ru}
              onChange={(e) => setForm((s) => ({ ...s, name_ru: e.target.value }))}
              placeholder={t("name_ru")}
            />
          </div>
          <Button type="submit" disabled={saving} className="sm:w-auto">
            {saving ? (
              <Spinner className="text-primary-foreground" size={16} />
            ) : (
              <Plus className="h-4 w-4" strokeWidth={2.4} />
            )}
            {t("add")}
          </Button>
        </form>
      </Card>

      {loading ? (
        <SkeletonList rows={4} />
      ) : cats.length === 0 ? (
        <EmptyState icon={Tags} title={t("empty")} />
      ) : (
        <motion.div layout className="space-y-3">
          <AnimatePresence initial={false}>
            {cats.map((c, i) => (
              <motion.div
                key={c.id}
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
                className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-background p-4 shadow-soft"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Tags className="h-5 w-5" strokeWidth={2.2} />
                  </span>
                  <div>
                    <p className="font-display text-sm font-bold text-foreground">
                      {localName(c) || `#${c.id}`}
                    </p>
                    {c.name_ru && c.name_uz ? (
                      <p className="text-xs text-muted-foreground">{c.name_ru}</p>
                    ) : null}
                  </div>
                </div>
                <ConfirmDelete busy={busyId === c.id} onConfirm={() => remove(c.id)} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
