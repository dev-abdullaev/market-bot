import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { MapPin, Phone, Receipt, User } from "lucide-react";
import api from "../../lib/api";
import { t } from "../../lib/i18n";
import { formatPrice } from "../../lib/format";
import { asList, ORDER_STATUSES, statusKey } from "../../lib/panel";
import { Select } from "../../components/ui/Input";
import { Spinner } from "../../components/ui/Spinner";
import {
  EmptyState,
  PageHeader,
  SkeletonList,
  StatusPill,
} from "../../components/panel/common";

function OrderItems({ items }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <ul className="mt-3 divide-y divide-border rounded-xl border border-border bg-muted/40">
      {items.map((it) => (
        <li
          key={it.id}
          className="flex items-center justify-between px-3.5 py-2 text-sm"
        >
          <span className="font-semibold text-foreground">
            {it.product_name}
            <span className="ml-1.5 text-muted-foreground">× {it.quantity}</span>
          </span>
          <span className="font-bold text-foreground">
            {formatPrice(it.price)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function OrderCard({ order, onStatus, busy, index }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      layout
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 26,
        delay: Math.min(index * 0.04, 0.24),
      }}
      className="rounded-2xl border border-border bg-background p-4 shadow-soft sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-display text-base font-extrabold text-foreground">
              #{order.id}
            </span>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={order.status}
                initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.85 }}
                transition={{ type: "spring", stiffness: 420, damping: 28 }}
              >
                <StatusPill status={order.status} />
              </motion.span>
            </AnimatePresence>
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <User className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2.2} />
            {order.customer_name || "—"}
          </p>
          {order.customer_phone ? (
            <a
              href={`tel:${order.customer_phone}`}
              className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
            >
              <Phone className="h-3.5 w-3.5" strokeWidth={2.2} />
              {order.customer_phone}
            </a>
          ) : null}
          {order.delivery_address ? (
            <p className="mt-1 flex items-start gap-1.5 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2.2} />
              <span>{order.delivery_address}</span>
            </p>
          ) : null}
        </div>

        <div className="flex flex-col items-end gap-2">
          <span className="font-display text-lg font-extrabold text-foreground">
            {formatPrice(order.total_amount)}
          </span>
          <div className="relative flex items-center gap-2">
            {busy ? <Spinner size={16} /> : null}
            <Select
              aria-label={t("nav_orders")}
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
        </div>
      </div>

      <OrderItems items={order.items} />
    </motion.div>
  );
}

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    let alive = true;
    api
      .get("/admin/orders")
      .then((r) => alive && setOrders(asList(r.data)))
      .catch(() => alive && setOrders([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const changeStatus = async (id, status) => {
    const prev = orders;
    setBusyId(id);
    // Optimistic update for snappy feedback.
    setOrders((list) =>
      list.map((o) => (o.id === id ? { ...o, status } : o))
    );
    try {
      await api.patch(`/admin/orders/${id}/status`, { status });
    } catch {
      setOrders(prev); // rollback
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <PageHeader icon={Receipt} title={t("nav_orders")} />

      {loading ? (
        <SkeletonList rows={4} />
      ) : orders.length === 0 ? (
        <EmptyState icon={Receipt} title={t("no_orders")} />
      ) : (
        <motion.div layout className="space-y-4">
          <AnimatePresence initial={false}>
            {orders.map((o, i) => (
              <OrderCard
                key={o.id}
                order={o}
                index={i}
                busy={busyId === o.id}
                onStatus={changeStatus}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
