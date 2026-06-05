import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  CalendarClock, Clock, History, ImagePlus, ListChecks,
  Megaphone, Plus, Send, Trash2,
} from "lucide-react";
import api from "../../lib/api";
import { t, tf } from "../../lib/i18n";
import { cn } from "../../lib/cn";
import { asList } from "../../lib/panel";
import { Button } from "../../components/ui/Button";
import { Input, Label, Select } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { Spinner } from "../../components/ui/Spinner";
import { ErrorAlert } from "../../components/ui/Alert";
import {
  ConfirmDelete, EmptyState, PageHeader, SkeletonList, Toast, Toggle,
} from "../../components/panel/common";

/* EnableBar — title left + toggle right (clean style). */
function EnableBar({ label, icon: Icon, checked, onChange }) {
  return (
    <div className={cn(
      "flex items-center justify-between rounded-xl border px-4 py-3 transition-colors",
      checked ? "border-primary/40 bg-primary/5" : "border-border bg-muted/30"
    )}>
      <span className="flex items-center gap-2 text-sm font-bold text-foreground">
        {Icon ? <Icon className="h-4 w-4 text-primary" strokeWidth={2.2} /> : null}
        {label}
      </span>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

/* Telegram-style live preview bubble. */
function TelegramPreview({ storeName, text, imageUrl, scheduled }) {
  return (
    <div className="relative hidden lg:flex flex-col rounded-2xl overflow-hidden border border-border"
      style={{ background: "#e6ddd4" }}>
      <div className="absolute inset-0 opacity-[0.06]"
        style={{ backgroundImage: "radial-gradient(circle, #000 1px, transparent 1px)", backgroundSize: "18px 18px" }} />
      <div className="relative flex justify-center pt-5">
        <span className="rounded-full bg-black/15 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur">
          {scheduled ? t("bc_preview_scheduled") : t("bc_preview_instant")}
        </span>
      </div>
      <div className="relative flex-1 flex items-start justify-end p-4">
        <div className="max-w-[80%] rounded-xl rounded-tr-sm bg-white px-3 py-2 shadow-soft">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
              {(storeName || "M")[0].toUpperCase()}
            </span>
            <span className="text-xs font-bold text-primary">{storeName || "MINE"}</span>
          </div>
          {imageUrl ? (
            <img src={imageUrl} alt="" className="mb-1.5 max-h-40 w-full rounded-lg object-cover"
              onError={(e) => (e.target.style.display = "none")} />
          ) : null}
          <p className="whitespace-pre-wrap break-words text-sm text-gray-800">
            {text?.trim() ? text : t("bc_preview_placeholder")}
          </p>
          <p className="mt-0.5 text-right text-[10px] text-gray-400">
            {new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(0)} ✓✓
          </p>
        </div>
      </div>
    </div>
  );
}

const REPEAT_OPTIONS = [
  { value: "once", key: "bc_repeat_once" },
  { value: "daily", key: "bc_repeat_daily" },
  { value: "weekly", key: "bc_repeat_weekly" },
];

const TABS = [
  { id: "add", icon: Plus, key: "bc_tab_add" },
  { id: "queue", icon: ListChecks, key: "bc_tab_queue" },
  { id: "history", icon: History, key: "bc_tab_history" },
];

/* ── Add tab ─────────────────────────────────────────────── */
function AddTab({ storeName, onDone }) {
  const [text, setText] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [scheduled, setScheduled] = useState(false);
  const [repeat, setRepeat] = useState("once");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [confirming, setConfirming] = useState(false);

  const submit = async () => {
    if (!text.trim()) { setErr(t("required")); return; }
    setBusy(true); setErr("");
    try {
      const payload = { text: text.trim(), image_url: imageUrl.trim() || undefined };
      if (scheduled && date && time) {
        payload.scheduled_at = new Date(`${date}T${time}`).toISOString();
        payload.repeat = repeat;
      }
      const { data } = await api.post("/admin/broadcast", payload);
      if (data?.scheduled) onDone(t("bc_scheduled_ok"));
      else onDone(tf("broadcast_sent", { n: data?.sent ?? 0 }));
      setText(""); setImageUrl(""); setScheduled(false); setConfirming(false);
    } catch (e) {
      setErr(e?.response?.data?.detail || t("error"));
    } finally { setBusy(false); }
  };

  return (
    <div className="grid gap-0 lg:grid-cols-2">
      {/* Left: form */}
      <div className="space-y-4 p-1 lg:pr-5">
        <ErrorAlert message={err} />
        <div>
          <Label>{t("bc_media")}</Label>
          <div className="rounded-xl border-2 border-dashed border-border bg-muted/30 px-4 py-6 text-center">
            <div className="flex items-center justify-center gap-2 text-2xl">📸 🎬</div>
            <p className="mt-1.5 text-xs text-muted-foreground">{t("bc_media_hint")}</p>
            <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..." className="mt-3" />
          </div>
        </div>

        <div>
          <Label>{t("message_text")} *</Label>
          <textarea rows={6} value={text} onChange={(e) => setText(e.target.value)}
            placeholder={t("bc_text_ph")}
            className="w-full resize-y rounded-xl border border-border bg-background px-3.5 py-3 text-sm text-foreground placeholder:text-muted-foreground shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary" />
        </div>

        <EnableBar icon={CalendarClock} label={t("bc_schedule")} checked={scheduled} onChange={setScheduled} />

        <AnimatePresence initial={false}>
          {scheduled && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
              <div className="space-y-3 rounded-xl border border-border p-4">
                <div>
                  <Label>{t("bc_repeat")}</Label>
                  <Select value={repeat} onChange={(e) => setRepeat(e.target.value)}>
                    {REPEAT_OPTIONS.map((r) => <option key={r.value} value={r.value}>{t(r.key)}</option>)}
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>{t("bc_date")}</Label>
                    <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                  </div>
                  <div>
                    <Label>{t("bc_time")}</Label>
                    <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {confirming ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
            <span className="text-sm font-bold text-foreground">{t("confirm_send")}</span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={busy}>{t("back")}</Button>
              <Button size="sm" onClick={submit} disabled={busy}>
                {busy ? <Spinner size={16} className="text-primary-foreground" /> : <Send className="h-4 w-4" strokeWidth={2.3} />}
                {t("send")}
              </Button>
            </div>
          </div>
        ) : (
          <Button size="lg" className="w-full"
            disabled={!text.trim() || busy || (scheduled && (!date || !time))}
            onClick={() => (scheduled ? submit() : setConfirming(true))}>
            {busy ? <Spinner size={18} className="text-primary-foreground" />
              : scheduled ? <CalendarClock className="h-4 w-4" strokeWidth={2.3} />
              : <Megaphone className="h-4 w-4" strokeWidth={2.3} />}
            {scheduled ? t("bc_schedule_btn") : t("bc_send_all")}
          </Button>
        )}
      </div>

      {/* Right: preview */}
      <div className="hidden lg:block lg:pl-1">
        <TelegramPreview storeName={storeName} text={text} imageUrl={imageUrl} scheduled={scheduled} />
      </div>
    </div>
  );
}

/* ── Queue tab ───────────────────────────────────────────── */
function QueueTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = () => {
    setLoading(true);
    api.get("/admin/broadcast/queue").then((r) => setItems(asList(r.data)))
      .catch(() => setItems([])).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const cancel = async (id) => {
    setBusyId(id);
    try { await api.delete(`/admin/broadcast/queue/${id}`); setItems((l) => l.filter((i) => i.id !== id)); }
    catch { /* ignore */ } finally { setBusyId(null); }
  };

  const fmt = (iso) => iso ? new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso)) : "—";

  if (loading) return <SkeletonList rows={3} />;
  if (!items.length) return <EmptyState icon={Clock} title={t("bc_queue_empty")} />;

  return (
    <div className="space-y-3">
      {items.map((it) => (
        <div key={it.id} className="flex items-start gap-3 rounded-xl border border-border bg-background p-4 shadow-soft">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <CalendarClock className="h-5 w-5" strokeWidth={2.2} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{it.text}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {fmt(it.scheduled_at)} · {t(REPEAT_OPTIONS.find((r) => r.value === it.repeat)?.key || "bc_repeat_once")}
            </p>
          </div>
          <ConfirmDelete busy={busyId === it.id} onConfirm={() => cancel(it.id)} className="h-8" />
        </div>
      ))}
    </div>
  );
}

/* ── History tab ─────────────────────────────────────────── */
function HistoryTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/admin/broadcast/history").then((r) => setItems(asList(r.data)))
      .catch(() => setItems([])).finally(() => setLoading(false));
  }, []);

  const fmt = (iso) => iso ? new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(iso)) : "—";

  if (loading) return <SkeletonList rows={3} />;
  if (!items.length) return <EmptyState icon={History} title={t("bc_history_empty")} />;

  return (
    <div className="space-y-3">
      {items.map((it) => (
        <div key={it.id} className="flex items-start gap-3 rounded-xl border border-border bg-background p-4 shadow-soft">
          <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            it.status === "sent" ? "bg-emerald-100 text-emerald-600" : "bg-destructive/10 text-destructive")}>
            <Send className="h-5 w-5" strokeWidth={2.2} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{it.text}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {fmt(it.sent_at || it.created_at)} · {it.status === "sent"
                ? tf("broadcast_sent", { n: it.sent_count ?? 0 })
                : t(`bc_status_${it.status}`)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Modal ───────────────────────────────────────────────── */
function BroadcastModal({ open, onOpenChange, storeName, onSent }) {
  const [tab, setTab] = useState("add");
  useEffect(() => { if (open) setTab("add"); }, [open]);

  const header = (
    <div className="pb-3">
      <div className="flex items-center gap-2 pr-10">
        <Megaphone className="h-5 w-5 text-primary" strokeWidth={2.3} />
        <h2 className="font-display text-lg font-extrabold text-foreground">{t("bc_modal_title")}</h2>
      </div>
      <div className="mt-3 flex gap-1 border-b border-border" role="tablist">
        {TABS.map((tb) => (
          <button key={tb.id} type="button" onClick={() => setTab(tb.id)}
            className={cn("relative flex items-center gap-1.5 px-3 py-2.5 text-sm font-bold rounded-t-lg transition-colors cursor-pointer",
              tab === tb.id ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
            <tb.icon className="h-3.5 w-3.5" strokeWidth={2.2} />
            {t(tb.key)}
            {tab === tb.id && <motion.span layoutId="bc-tab-line"
              className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary"
              transition={{ type: "spring", stiffness: 380, damping: 30 }} />}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={t("bc_modal_title")} header={header} size="3xl">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.16 }}>
          {tab === "add" && <AddTab storeName={storeName}
            onDone={(msg) => { onSent(msg); onOpenChange(false); }} />}
          {tab === "queue" && <QueueTab />}
          {tab === "history" && <HistoryTab />}
        </motion.div>
      </AnimatePresence>
    </Modal>
  );
}

/* ── Page ────────────────────────────────────────────────── */
export default function BroadcastPage() {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [storeName, setStoreName] = useState("");

  useEffect(() => {
    api.get("/stores/me").then((r) => setStoreName(r.data?.name || "")).catch(() => {});
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 3200);
    return () => clearTimeout(id);
  }, [toast]);

  return (
    <div>
      <PageHeader icon={Megaphone} title={t("nav_broadcast")} subtitle={t("broadcast_hint")}
        action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" strokeWidth={2.4} />{t("bc_new")}</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <button type="button" onClick={() => setOpen(true)}
          className="flex items-center gap-4 rounded-2xl border border-border bg-background p-5 text-left shadow-soft transition-colors hover:border-primary/40 hover:bg-muted/30 cursor-pointer">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Send className="h-6 w-6" strokeWidth={2.2} />
          </span>
          <div>
            <p className="font-display font-bold text-foreground">{t("bc_send_all")}</p>
            <p className="text-xs text-muted-foreground">{t("broadcast_hint")}</p>
          </div>
        </button>
        <button type="button" onClick={() => setOpen(true)}
          className="flex items-center gap-4 rounded-2xl border border-border bg-background p-5 text-left shadow-soft transition-colors hover:border-primary/40 hover:bg-muted/30 cursor-pointer">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
            <CalendarClock className="h-6 w-6" strokeWidth={2.2} />
          </span>
          <div>
            <p className="font-display font-bold text-foreground">{t("bc_schedule")}</p>
            <p className="text-xs text-muted-foreground">{t("bc_schedule_card_hint")}</p>
          </div>
        </button>
      </div>

      <BroadcastModal open={open} onOpenChange={setOpen} storeName={storeName} onSent={setToast} />
      <Toast message={toast} />
    </div>
  );
}
