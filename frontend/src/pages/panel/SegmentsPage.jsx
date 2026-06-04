import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Layers, Plus } from "lucide-react";
import api from "../../lib/api";
import { t } from "../../lib/i18n";
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

function AddSegmentModal({ open, onOpenChange, onSaved, segmentsCount }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) setName(""); }, [open]);

  const save = async () => {
    setSaving(true);
    try {
      const nextNum = segmentsCount + 1;
      await api.post("/admin/segments", {
        name: name.trim() || `${nextNum}-segment`,
        sort_order: nextNum,
      });
      onSaved?.();
      onOpenChange(false);
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  const footer = (
    <div className="flex justify-end gap-2">
      <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>{t("back")}</Button>
      <Button onClick={save} disabled={saving} className="min-w-28">
        {saving ? <Spinner size={16} className="text-primary-foreground" /> : null}
        {t("add")}
      </Button>
    </div>
  );

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={t("segment_add")} footer={footer} size="md">
      <div>
        <Label htmlFor="seg-name">{t("name")}</Label>
        <Input
          id="seg-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("segment_name_ph")}
          onKeyDown={(e) => e.key === "Enter" && save()}
        />
        <p className="mt-1.5 text-xs text-muted-foreground">{t("segment_hint")}</p>
      </div>
    </Modal>
  );
}

export default function SegmentsPage() {
  const reduce = useReducedMotion();
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = () => {
    setLoading(true);
    api.get("/admin/segments")
      .then((r) => setSegments(Array.isArray(r.data) ? r.data : []))
      .catch(() => setSegments([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const remove = async (id) => {
    setBusyId(id);
    try {
      await api.delete(`/admin/segments/${id}`);
      setSegments((list) => list.filter((s) => s.id !== id));
    } catch { /* ignore */ }
    finally { setBusyId(null); }
  };

  return (
    <div>
      <PageHeader
        icon={Layers}
        title={t("nav_segments")}
        subtitle={t("segment_base_hint")}
        action={
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" strokeWidth={2.4} />
            {t("segment_add")}
          </Button>
        }
      />

      {loading ? (
        <SkeletonList rows={4} />
      ) : segments.length === 0 ? (
        <EmptyState icon={Layers} title={t("segment_empty")} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-soft">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50 text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-3 w-14">№</th>
                <th className="px-5 py-3">{t("name")}</th>
                <th className="px-5 py-3 text-right">{t("col_actions")}</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {segments.map((s, i) => (
                  <motion.tr key={s.id}
                    layout
                    initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
                    transition={{ type: "spring", stiffness: 300, damping: 28, delay: Math.min(i * 0.04, 0.15) }}
                    className="border-b border-border/60 last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-5 py-3.5 font-semibold text-muted-foreground">{i + 1}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/10 text-secondary font-extrabold text-sm">
                          {i + 1}
                        </span>
                        <span className="font-bold text-foreground">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {i === 0 ? (
                        <span className="text-xs text-muted-foreground">{t("segment_default")}</span>
                      ) : (
                        <ConfirmDelete busy={busyId === s.id} onConfirm={() => remove(s.id)} className="h-8" />
                      )}
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}

      <AddSegmentModal
        open={addOpen}
        onOpenChange={setAddOpen}
        onSaved={load}
        segmentsCount={segments.length}
      />
    </div>
  );
}
