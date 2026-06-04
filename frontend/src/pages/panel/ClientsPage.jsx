import { useEffect, useState, useCallback } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Pencil, Plus, Search, Trash2, Users } from "lucide-react";
import api from "../../lib/api";
import { t } from "../../lib/i18n";
import { formatPrice } from "../../lib/format";
import { cn } from "../../lib/cn";
import { Button } from "../../components/ui/Button";
import { Input, Label, Select } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { Spinner } from "../../components/ui/Spinner";
import {
  ConfirmDelete,
  EmptyState,
  PageHeader,
  Skeleton,
  SkeletonList,
} from "../../components/panel/common";

const PAGE_SIZES = [15, 25, 50];
const STATUS_OPTIONS = ["", "active", "inactive"];

function StatusBadge({ status }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold",
      status === "active"
        ? "bg-emerald-100 text-emerald-700"
        : "bg-muted text-muted-foreground"
    )}>
      <span className={cn("h-1.5 w-1.5 rounded-full",
        status === "active" ? "bg-emerald-500" : "bg-muted-foreground/50"
      )} />
      {status === "active" ? t("st_active") : t("st_inactive")}
    </span>
  );
}

function initials(name) {
  if (!name) return "?";
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
}

/* ─── Segment assign modal ──────────────────────────────────────── */
function AssignSegmentModal({ open, onOpenChange, customer, segments, onAssigned }) {
  const [segId, setSegId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setSegId(customer?.segment_id ? String(customer.segment_id) : "");
  }, [open, customer]);

  const save = async () => {
    setSaving(true);
    try {
      await api.patch(`/admin/customers/${customer.id}/segment`, {
        segment_id: segId ? Number(segId) : null,
      });
      onAssigned?.();
      onOpenChange(false);
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  const footer = (
    <div className="flex justify-end gap-2">
      <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>{t("back")}</Button>
      <Button onClick={save} disabled={saving} className="min-w-24">
        {saving ? <Spinner size={16} className="text-primary-foreground" /> : null}
        {t("save")}
      </Button>
    </div>
  );

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={t("clients_assign_segment")} footer={footer} size="md">
      <div>
        <Label>{t("nav_segment")}</Label>
        <Select value={segId} onChange={(e) => setSegId(e.target.value)}>
          <option value="">— {t("no_segment")} —</option>
          {segments.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </Select>
      </div>
    </Modal>
  );
}

/* ─── Add segment modal ─────────────────────────────────────────── */
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

/* ─── Segments section ──────────────────────────────────────────── */
function SegmentsSection({ segments, onRefresh }) {
  const reduce = useReducedMotion();
  const [addOpen, setAddOpen] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const remove = async (id) => {
    setBusyId(id);
    try {
      await api.delete(`/admin/segments/${id}`);
      onRefresh();
    } catch { /* ignore */ }
    finally { setBusyId(null); }
  };

  return (
    <div className="mt-8">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-display text-base font-extrabold text-foreground">{t("client_segments_title")}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{t("segment_base_hint")}</p>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" strokeWidth={2.4} />
          {t("segment_add")}
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-soft">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/50 text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 w-12">№</th>
              <th className="px-4 py-3">{t("name")}</th>
              <th className="px-4 py-3 text-right">{t("col_actions")}</th>
            </tr>
          </thead>
          <tbody>
            {segments.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  {t("segment_empty")}
                </td>
              </tr>
            ) : segments.map((s, i) => (
              <motion.tr key={s.id}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 28, delay: i * 0.04 }}
                className="border-b border-border/60 last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3 font-semibold text-muted-foreground">{i + 1}</td>
                <td className="px-4 py-3 font-bold text-foreground">{s.name}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {i === 0 ? null : (
                      <ConfirmDelete busy={busyId === s.id} onConfirm={() => remove(s.id)} className="h-8" />
                    )}
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      <AddSegmentModal
        open={addOpen}
        onOpenChange={setAddOpen}
        onSaved={onRefresh}
        segmentsCount={segments.length}
      />
    </div>
  );
}

/* ─── Main page ─────────────────────────────────────────────────── */
export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState(null);

  const loadSegments = useCallback(() => {
    api.get("/admin/segments").then((r) => setSegments(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, []);

  const loadClients = useCallback(() => {
    setLoading(true);
    api.get("/admin/customers", {
      params: { q: q || undefined, status: status || undefined, page, page_size: pageSize },
    })
      .then((r) => {
        const data = r.data;
        if (data?.results) {
          setClients(data.results);
          setTotal(data.count ?? 0);
        } else {
          setClients(Array.isArray(data) ? data : []);
          setTotal(Array.isArray(data) ? data.length : 0);
        }
      })
      .catch(() => { setClients([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [q, status, page, pageSize]);

  useEffect(() => { loadSegments(); }, [loadSegments]);
  useEffect(() => { setPage(1); }, [q, status, pageSize]);
  useEffect(() => { loadClients(); }, [loadClients]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const openAssign = (client) => { setAssignTarget(client); setAssignOpen(true); };

  return (
    <div>
      <PageHeader icon={Users} title={t("nav_clients")}
        subtitle={t("clients_found").replace("{n}", String(total))}
      />

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input icon={Search} placeholder={t("clients_search_ph")} value={q}
          onChange={(e) => setQ(e.target.value)} className="h-9 w-56 text-sm" />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 w-40 text-sm">
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s ? t(`st_${s}`) : t("p_all_statuses")}</option>
          ))}
        </Select>
        <Select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="h-9 w-20 text-sm">
          {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
        </Select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50 text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">{t("col_client")}</th>
                <th className="px-4 py-3">Telegram</th>
                <th className="px-4 py-3 text-center">{t("col_orders")}</th>
                <th className="px-4 py-3 text-right">{t("col_sum")}</th>
                <th className="px-4 py-3">{t("col_segment")}</th>
                <th className="px-4 py-3">{t("col_status")}</th>
                <th className="px-4 py-3">{t("col_date")}</th>
                <th className="px-4 py-3 text-right">{t("col_actions")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/60">
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 w-full rounded-md" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    {t("no_clients")}
                  </td>
                </tr>
              ) : clients.map((c, i) => (
                <motion.tr key={c.id}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 28, delay: Math.min(i * 0.025, 0.15) }}
                  className="border-b border-border/60 last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-xs font-bold text-primary-foreground">
                        {initials(c.full_name)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground max-w-[140px]">
                          {c.full_name || "—"}
                        </p>
                        {c.phone ? <p className="text-xs text-muted-foreground">{c.phone}</p> : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.telegram_id ? <span className="font-mono text-xs">@{c.telegram_id}</span> : "—"}
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-foreground">{c.orders_count ?? 0}</td>
                  <td className="px-4 py-3 text-right font-bold text-primary">
                    {formatPrice(c.total_spent || 0)}
                  </td>
                  <td className="px-4 py-3">
                    {c.segment_name
                      ? <span className="rounded-full bg-secondary/10 px-2 py-0.5 text-xs font-bold text-secondary">{c.segment_name}</span>
                      : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {c.last_order_date ? c.last_order_date : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="outline" size="iconSm" onClick={() => openAssign(c)}
                      title={t("clients_assign_segment")}>
                      <Pencil className="h-3.5 w-3.5" strokeWidth={2.2} />
                    </Button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <span className="text-xs text-muted-foreground">
              {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} / {total}
            </span>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>←</Button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const p = totalPages <= 5 ? i + 1 : Math.max(1, page - 2) + i;
                if (p > totalPages) return null;
                return (
                  <Button key={p} variant={p === page ? "default" : "outline"} size="sm"
                    onClick={() => setPage(p)} className="w-8 px-0">{p}</Button>
                );
              })}
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>→</Button>
            </div>
          </div>
        )}
      </div>

      {/* Segments section */}
      <SegmentsSection segments={segments} onRefresh={loadSegments} />

      <AssignSegmentModal
        open={assignOpen}
        onOpenChange={setAssignOpen}
        customer={assignTarget}
        segments={segments}
        onAssigned={() => { loadClients(); loadSegments(); }}
      />
    </div>
  );
}
