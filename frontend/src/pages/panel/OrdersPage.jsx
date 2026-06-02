import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  Clock,
  GripVertical,
  LayoutGrid,
  List,
  MapPin,
  Phone,
  Receipt,
  User,
} from "lucide-react";
import api from "../../lib/api";
import { t } from "../../lib/i18n";
import { formatPrice } from "../../lib/format";
import {
  asList,
  ORDER_STATUSES,
  STATUS_DOT,
  STATUS_HEX,
  statusKey,
} from "../../lib/panel";
import { Select } from "../../components/ui/Input";
import { Spinner } from "../../components/ui/Spinner";
import {
  EmptyState,
  PageHeader,
  SkeletonList,
  StatusPill,
} from "../../components/panel/common";

const FILTERS = ["all", ...ORDER_STATUSES];
const todayISO = () => new Date().toISOString().slice(0, 10);

/** Compact HH:MM from an ISO timestamp. */
function timeOf(iso) {
  if (!iso) return "";
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function itemsSummary(items) {
  if (!Array.isArray(items) || !items.length) return "";
  return items
    .map((it) => `${it.product_name} ×${it.quantity}`)
    .join(", ");
}

/* ------------------------- order card (shared) ------------------------- */

function CardBody({ order, compact }) {
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="font-display text-base font-extrabold text-foreground">
          #{order.id}
        </span>
        <span className="font-display text-sm font-extrabold text-foreground">
          {formatPrice(order.total_amount)}
        </span>
      </div>
      <p className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <User className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2.2} />
        <span className="truncate">{order.customer_name || "—"}</span>
      </p>
      {order.customer_phone ? (
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Phone className="h-3.5 w-3.5" strokeWidth={2.2} />
          {order.customer_phone}
        </p>
      ) : null}
      {!compact && order.delivery_address ? (
        <p className="mt-0.5 flex items-start gap-1.5 text-xs text-muted-foreground">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2.2} />
          <span className="line-clamp-2">{order.delivery_address}</span>
        </p>
      ) : null}
      {itemsSummary(order.items) ? (
        <p className="mt-2 line-clamp-2 rounded-lg bg-muted/50 px-2 py-1.5 text-xs text-muted-foreground">
          {itemsSummary(order.items)}
        </p>
      ) : null}
      <p className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
        <Clock className="h-3 w-3" strokeWidth={2.2} />
        {timeOf(order.created_at)}
      </p>
    </>
  );
}

/** Draggable Kanban card. */
function KanbanCard({ order, busy }) {
  const reduce = useReducedMotion();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: order.id,
    data: { status: order.status },
  });
  return (
    <motion.div
      ref={setNodeRef}
      layout
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: isDragging ? 0.35 : 1, y: 0, scale: 1 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 320, damping: 28 }}
      className="group relative rounded-xl border border-border bg-background p-3 shadow-soft"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={t("move_to")}
        className="absolute right-1.5 top-1.5 flex h-7 w-7 cursor-grab touch-none items-center justify-center rounded-lg text-muted-foreground opacity-50 transition-opacity hover:bg-muted hover:opacity-100 active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {busy ? <Spinner size={14} /> : <GripVertical className="h-4 w-4" strokeWidth={2.2} />}
      </button>
      <div className="pr-7">
        <CardBody order={order} compact />
      </div>
    </motion.div>
  );
}

/** A Kanban column droppable. */
function Column({ status, orders, busyId }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div className="flex min-w-[260px] flex-1 flex-col">
      <div className="mb-3 flex items-center gap-2 px-1">
        <span className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT[status]}`} />
        <h3 className="font-display text-sm font-extrabold text-foreground">
          {t(statusKey(status))}
        </h3>
        <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground">
          {orders.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex flex-1 flex-col gap-2.5 rounded-2xl border p-2.5 transition-colors ${
          isOver
            ? "border-primary bg-primary/5"
            : "border-dashed border-border bg-muted/40"
        }`}
        style={{ borderTopWidth: 3, borderTopColor: STATUS_HEX[status], borderTopStyle: "solid" }}
      >
        {orders.length === 0 ? (
          <p className="py-8 text-center text-xs font-semibold text-muted-foreground">
            {t("no_data")}
          </p>
        ) : (
          <AnimatePresence initial={false} mode="popLayout">
            {orders.map((o) => (
              <KanbanCard key={o.id} order={o} busy={busyId === o.id} />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

/* ------------------------------- list row ------------------------------ */

function ListRow({ order, onStatus, busy, index }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      layout
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
      transition={{ type: "spring", stiffness: 300, damping: 26, delay: Math.min(index * 0.03, 0.2) }}
      className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-background p-4 shadow-soft"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-display text-base font-extrabold text-foreground">#{order.id}</span>
          <StatusPill status={order.status} />
        </div>
        <p className="mt-1 truncate text-sm font-semibold text-foreground">
          {order.customer_name || "—"}
          {order.customer_phone ? (
            <span className="ml-2 font-normal text-muted-foreground">{order.customer_phone}</span>
          ) : null}
        </p>
        {itemsSummary(order.items) ? (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{itemsSummary(order.items)}</p>
        ) : null}
      </div>
      <span className="font-display text-base font-extrabold text-foreground">
        {formatPrice(order.total_amount)}
      </span>
      <div className="flex items-center gap-2">
        {busy ? <Spinner size={16} /> : null}
        <Select
          aria-label={t("move_to")}
          value={order.status}
          disabled={busy}
          onChange={(e) => onStatus(order.id, e.target.value)}
          className="h-9 w-40 text-sm"
        >
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(statusKey(s))}
            </option>
          ))}
        </Select>
      </div>
    </motion.div>
  );
}

/* ------------------------------ controls ------------------------------- */

function FilterTabs({ value, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-background p-1 shadow-soft">
      {FILTERS.map((f) => (
        <button
          key={f}
          type="button"
          onClick={() => onChange(f)}
          className={`relative rounded-lg px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            value === f ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {value === f ? (
            <motion.span
              layoutId="orders-filter"
              className="absolute inset-0 -z-0 rounded-lg bg-gradient-to-r from-primary to-secondary"
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
            />
          ) : null}
          <span className="relative z-10">
            {f === "all" ? t("filter_all") : t(statusKey(f))}
          </span>
        </button>
      ))}
    </div>
  );
}

function ViewToggle({ view, onChange }) {
  return (
    <div className="flex items-center rounded-xl border border-border bg-background p-0.5 shadow-soft">
      {[
        { key: "board", icon: LayoutGrid },
        { key: "list", icon: List },
      ].map(({ key, icon: Icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          aria-label={t(`view_${key}`)}
          aria-pressed={view === key}
          className={`relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            view === key ? "text-primary-foreground" : "text-muted-foreground"
          }`}
        >
          {view === key ? (
            <motion.span
              layoutId="orders-view"
              className="absolute inset-0 -z-0 rounded-lg bg-primary"
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
            />
          ) : null}
          <Icon className="relative z-10 h-4 w-4" strokeWidth={2.2} />
        </button>
      ))}
    </div>
  );
}

/* ------------------------------- page ---------------------------------- */

export default function OrdersPage() {
  const reduce = useReducedMotion();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState("board");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 160, tolerance: 8 } })
  );

  const fetchOrders = useMemo(
    () => () => {
      const params = {};
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      return api
        .get("/admin/orders", { params })
        .then((r) => setOrders(asList(r.data)))
        .catch(() => setOrders([]));
    },
    [dateFrom, dateTo]
  );

  useEffect(() => {
    let alive = true;
    Promise.resolve().then(() => alive && setLoading(true));
    fetchOrders().finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [fetchOrders]);

  const changeStatus = async (id, status) => {
    let prev = null;
    let noop = false;
    // Read + write the latest list atomically inside the updater so we never
    // touch a ref during render.
    setOrders((list) => {
      prev = list;
      const current = list.find((o) => o.id === id);
      if (!current || current.status === status) {
        noop = true;
        return list;
      }
      return list.map((o) => (o.id === id ? { ...o, status } : o));
    });
    if (noop) return;
    setBusyId(id);
    try {
      await api.patch(`/admin/orders/${id}/status`, { status });
      await fetchOrders();
    } catch {
      if (prev) setOrders(prev); // rollback
    } finally {
      setBusyId(null);
    }
  };

  const onDragEnd = ({ active, over }) => {
    setActiveId(null);
    if (!over) return;
    const target = String(over.id);
    if (!ORDER_STATUSES.includes(target)) return;
    changeStatus(active.id, target);
  };

  const visible = filter === "all" ? orders : orders.filter((o) => o.status === filter);
  const byStatus = (s) => visible.filter((o) => o.status === s);
  const activeOrder = activeId != null ? orders.find((o) => o.id === activeId) : null;
  // In board mode honour the filter by showing only matching columns.
  const columns = filter === "all" ? ORDER_STATUSES : ORDER_STATUSES.filter((s) => s === filter);

  return (
    <div>
      <PageHeader
        icon={Receipt}
        title={t("nav_orders")}
        action={<ViewToggle view={view} onChange={setView} />}
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <FilterTabs value={filter} onChange={setFilter} />
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            {t("date_from")}
            <input
              type="date"
              value={dateFrom}
              max={dateTo || todayISO()}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-9 rounded-xl border border-border bg-background px-2.5 text-sm font-semibold text-foreground shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            {t("date_to")}
            <input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              max={todayISO()}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-9 rounded-xl border border-border bg-background px-2.5 text-sm font-semibold text-foreground shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
        </div>
      </div>

      {loading ? (
        <SkeletonList rows={5} />
      ) : orders.length === 0 ? (
        <EmptyState icon={Receipt} title={t("no_orders")} />
      ) : view === "list" ? (
        <motion.div layout className="space-y-3">
          <AnimatePresence initial={false}>
            {visible.length === 0 ? (
              <EmptyState key="empty" icon={Receipt} title={t("no_data")} />
            ) : (
              visible.map((o, i) => (
                <ListRow
                  key={o.id}
                  order={o}
                  index={i}
                  busy={busyId === o.id}
                  onStatus={changeStatus}
                />
              ))
            )}
          </AnimatePresence>
        </motion.div>
      ) : (
        <>
          <p className="mb-3 text-xs font-semibold text-muted-foreground">{t("drag_hint")}</p>
          <DndContext
            sensors={sensors}
            onDragStart={({ active }) => setActiveId(active.id)}
            onDragCancel={() => setActiveId(null)}
            onDragEnd={onDragEnd}
          >
            <div className="flex gap-4 overflow-x-auto pb-2">
              {columns.map((s) => (
                <Column key={s} status={s} orders={byStatus(s)} busyId={busyId} />
              ))}
            </div>
            <DragOverlay dropAnimation={reduce ? null : undefined}>
              {activeOrder ? (
                <div className="w-[244px] rotate-2 cursor-grabbing rounded-xl border border-primary bg-background p-3 shadow-lift">
                  <CardBody order={activeOrder} compact />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </>
      )}
    </div>
  );
}
