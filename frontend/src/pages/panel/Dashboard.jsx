import { useEffect, useMemo, useRef, useState } from "react";
import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import {
  AlertTriangle,
  BarChart3,
  Clock,
  Eye,
  LayoutDashboard,
  MapPin,
  MessageSquare,
  Package2,
  PieChart as PieIcon,
  Receipt,
  Star,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import api from "../../lib/api";
import { t } from "../../lib/i18n";
import { cn } from "../../lib/cn";
import { ANALYTICS_STATUSES, STATUS_DOT } from "../../lib/panel";
import { PageHeader, EmptyState, Skeleton } from "../../components/panel/common";

const PERIODS = ["day", "month", "year"];

// Brand-aligned palette for the payment donut + charts.
const PIE_COLORS = [
  "#2563EB",
  "#6366F1",
  "#059669",
  "#0EA5E9",
  "#8B5CF6",
  "#F59E0B",
  "#EC4899",
];

const todayISO = () => new Date().toISOString().slice(0, 10);
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** Grouped thousands + "so'm" suffix. */
function soum(value) {
  const n = num(value);
  const grouped = new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 0,
  }).format(n);
  return `${grouped} ${t("soum")}`;
}
const grouped = (value) =>
  new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(num(value));

/* ----------------------------- primitives ------------------------------ */

/** Count-up that fires when scrolled into view and respects reduced motion. */
function CountUp({ value, format }) {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => format(Math.round(v)));
  useEffect(() => {
    if (reduce || !inView) {
      if (inView) mv.set(value);
      return;
    }
    const controls = animate(mv, value, { duration: 0.9, ease: "easeOut" });
    return () => controls.stop();
  }, [value, mv, reduce, inView]);
  return (
    <motion.span ref={ref}>{reduce ? format(value) : text}</motion.span>
  );
}

/** Soft rounded section card with header + optional icon. */
function Panel({ icon: Icon, title, action, className, children, index = 0 }) {
  const reduce = useReducedMotion();
  return (
    <motion.section
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{
        type: "spring",
        stiffness: 280,
        damping: 26,
        delay: Math.min(index * 0.04, 0.2),
      }}
      className={cn(
        "rounded-2xl border border-border bg-background p-5 shadow-soft",
        className
      )}
    >
      {title ? (
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {Icon ? (
              <Icon className="h-5 w-5 text-primary" strokeWidth={2.3} />
            ) : null}
            <h2 className="font-display text-base font-extrabold text-foreground">
              {title}
            </h2>
          </div>
          {action}
        </div>
      ) : null}
      {children}
    </motion.section>
  );
}

function StatCard({ icon: Icon, tint, label, value, format, sublines, index }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 26,
        delay: index * 0.06,
      }}
      whileHover={reduce ? undefined : { y: -3 }}
      className="flex flex-col rounded-2xl border border-border bg-background p-5 shadow-soft transition-shadow hover:shadow-lift"
    >
      <span
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-xl",
          tint
        )}
      >
        <Icon className="h-5 w-5" strokeWidth={2.3} />
      </span>
      <p className="mt-4 font-display text-2xl font-extrabold tracking-tight text-foreground">
        <CountUp value={num(value)} format={format} />
      </p>
      <p className="mt-0.5 text-sm font-bold text-muted-foreground">{label}</p>
      {sublines?.length ? (
        <div className="mt-3 space-y-1 border-t border-border pt-3">
          {sublines.map((s, i) => (
            <p
              key={i}
              className="flex items-center justify-between text-xs text-muted-foreground"
            >
              <span>{s.label}</span>
              <span className="font-bold text-foreground">{s.value}</span>
            </p>
          ))}
        </div>
      ) : null}
    </motion.div>
  );
}

/* ------------------------------- charts -------------------------------- */

function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-xl border border-border bg-background px-3 py-2 text-xs shadow-lift">
      <p className="font-bold text-foreground">{p.label}</p>
      <p className="mt-0.5 text-muted-foreground">
        {p.percent}% · {grouped(p.sum)} {t("soum")}
      </p>
    </div>
  );
}

function HourTooltip({ active, payload, label, money }) {
  if (!active || !payload?.length) return null;
  const v = payload[0].value;
  return (
    <div className="rounded-xl border border-border bg-background px-3 py-2 text-xs shadow-lift">
      <p className="font-bold text-foreground">{label}</p>
      <p className="mt-0.5 text-muted-foreground">
        <span className="font-bold text-foreground">
          {money ? soum(v) : grouped(v)}
        </span>
      </p>
    </div>
  );
}

function HourlyChart({ data, color, money }) {
  const reduce = useReducedMotion();
  const rows = (Array.isArray(data) ? data : []).map((d) => ({
    hour: `${String(d.hour).padStart(2, "0")}:00`,
    value: num(d.value),
  }));
  const hasData = rows.some((r) => r.value > 0);
  if (!hasData) return <EmptyState icon={Clock} title={t("no_data_period")} />;
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E4ECFC" vertical={false} />
          <XAxis
            dataKey="hour"
            tick={{ fill: "#64748B", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval={3}
          />
          <YAxis
            tick={{ fill: "#64748B", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={44}
            tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)}
          />
          <Tooltip content={<HourTooltip money={money} />} cursor={{ stroke: color, strokeOpacity: 0.2 }} />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
            isAnimationActive={!reduce}
            animationDuration={700}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/* -------------------------------- map ---------------------------------- */

// Custom divIcon avoids leaflet's broken default-marker asset paths under Vite.
const markerIcon = L.divIcon({
  className: "",
  html: `<span style="display:flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:9999px;background:#2563EB;border:2.5px solid #fff;box-shadow:0 2px 6px rgba(15,23,42,.35)"></span>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 13);
      return;
    }
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [32, 32], maxZoom: 14 });
  }, [points, map]);
  return null;
}

function GeographyMap({ geography }) {
  const points = useMemo(
    () =>
      (Array.isArray(geography) ? geography : [])
        .filter((g) => Number.isFinite(num(g.lat)) && Number.isFinite(num(g.lng)) && (num(g.lat) || num(g.lng)))
        .map((g) => ({ lat: num(g.lat), lng: num(g.lng), count: num(g.count) || 1 })),
    [geography]
  );

  if (!points.length) {
    return (
      <div className="flex h-[320px] items-center justify-center rounded-xl border border-dashed border-border bg-muted/40">
        <EmptyState icon={MapPin} title={t("no_data_period")} />
      </div>
    );
  }

  return (
    <div className="h-[320px] overflow-hidden rounded-xl border border-border">
      <MapContainer
        center={[points[0].lat, points[0].lng]}
        zoom={12}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FitBounds points={points} />
        {points.map((p, i) => (
          <Marker key={i} position={[p.lat, p.lng]} icon={markerIcon} />
        ))}
      </MapContainer>
    </div>
  );
}

/* ------------------------------- lists --------------------------------- */

function RankedList({ items, render, emptyIcon }) {
  if (!items.length)
    return <EmptyState icon={emptyIcon} title={t("no_data_period")} />;
  return (
    <ul className="space-y-2">
      {items.map((it, i) => (
        <li
          key={i}
          className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-3 py-2.5"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-extrabold text-primary">
            {i + 1}
          </span>
          {render(it)}
        </li>
      ))}
    </ul>
  );
}

function RatingBars({ distribution, total }) {
  const reduce = useReducedMotion();
  return (
    <div className="space-y-2">
      {[5, 4, 3, 2, 1].map((star) => {
        const count = num(distribution?.[star]);
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return (
          <div key={star} className="flex items-center gap-3">
            <span className="flex w-9 shrink-0 items-center gap-0.5 text-xs font-bold text-foreground">
              {star}
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            </span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
              <motion.span
                className="block h-full rounded-full bg-amber-400"
                initial={reduce ? { width: `${pct}%` } : { width: 0 }}
                whileInView={{ width: `${pct}%` }}
                viewport={{ once: true }}
                transition={{ type: "spring", stiffness: 120, damping: 20 }}
              />
            </div>
            <span className="w-10 shrink-0 text-right text-xs font-semibold text-muted-foreground">
              {count}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ----------------------------- the page -------------------------------- */

export default function Dashboard() {
  const [period, setPeriod] = useState("day");
  const [date, setDate] = useState(todayISO());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [slowConn, setSlowConn] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.resolve().then(() => {
      if (alive) { setLoading(true); setSlowConn(false); }
    });
    const slowTimer = setTimeout(() => alive && setSlowConn(true), 5000);
    api
      .get("/admin/analytics", { params: { period, date } })
      .then((r) => alive && setData(r.data))
      .catch(() => alive && setData(null))
      .finally(() => { if (alive) { setLoading(false); setSlowConn(false); } });
    return () => {
      alive = false;
      clearTimeout(slowTimer);
    };
  }, [period, date]);

  const d = data || {};
  const revenue = d.revenue || {};
  const orders = d.orders || {};
  const statusCounts = d.status_counts || {};
  const payments = (Array.isArray(d.payments) ? d.payments : []).map((p) => ({
    ...p,
    count: num(p.count),
    percent: num(p.percent),
    sum: num(p.sum),
  }));
  const pieData = payments.filter((p) => p.percent > 0 || p.sum > 0);
  const leader = payments.length
    ? [...payments].sort((a, b) => b.percent - a.percent)[0]
    : null;
  const paymentTotals = payments.reduce(
    (acc, p) => ({ count: acc.count + p.count, sum: acc.sum + p.sum }),
    { count: 0, sum: 0 }
  );
  const topProducts = Array.isArray(d.top_products) ? d.top_products : [];
  const topCustomers = Array.isArray(d.top_customers) ? d.top_customers : [];
  const productViews = Array.isArray(d.product_views) ? d.product_views : [];
  const reviews = d.reviews || {};
  const reviewRecent = Array.isArray(reviews.recent) ? reviews.recent : [];
  const segments = Array.isArray(d.segments) ? d.segments : [];

  const segmentChart = segments.map((s) => ({
    name: s.name,
    short: s.name?.length > 10 ? s.name.slice(0, 10) + "…" : s.name,
    sales: num(s.sales_qty),
    sum: num(s.sum),
  }));

  return (
    <div>
      <PageHeader
        icon={LayoutDashboard}
        title={t("nav_analytics")}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <PeriodControl value={period} onChange={setPeriod} />
            <input
              type="date"
              value={date}
              max={todayISO()}
              onChange={(e) => setDate(e.target.value || todayISO())}
              className="h-9 rounded-xl border border-border bg-background px-3 text-sm font-semibold text-foreground shadow-soft transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        }
      />

      {loading ? (
        <>
          {slowConn ? (
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-amber-500" />
              {t("server_waking_up")}
            </div>
          ) : null}
          <DashboardSkeleton />
        </>
      ) : (
        <div className="space-y-6">
          {/* 2 — stat cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard
              index={0}
              icon={Wallet}
              tint="bg-primary/10 text-primary"
              label={t("stat_revenue")}
              value={revenue.total}
              format={soum}
              sublines={[
                { label: t("stat_revenue_products"), value: soum(revenue.products) },
                { label: t("stat_revenue_delivery"), value: soum(revenue.delivery) },
              ]}
            />
            <StatCard
              index={1}
              icon={Receipt}
              tint="bg-secondary/10 text-secondary"
              label={t("stat_orders")}
              value={orders.total}
              format={grouped}
              sublines={[
                { label: t("stat_orders_delivered"), value: grouped(orders.delivered) },
                { label: t("stat_peak_hour"), value: d.peak_hour || "—" },
              ]}
            />
            <StatCard
              index={2}
              icon={Package2}
              tint="bg-amber-500/10 text-amber-600"
              label={t("stat_packaging")}
              value={d.packaging_total}
              format={soum}
            />
            <StatCard
              index={3}
              icon={TrendingUp}
              tint="bg-sky-500/10 text-sky-600"
              label={t("stat_service_fee")}
              value={d.service_fee_total}
              format={soum}
            />
            <StatCard
              index={4}
              icon={Wallet}
              tint="bg-accent/10 text-accent"
              label={t("stat_avg_check")}
              value={d.avg_check}
              format={soum}
              sublines={[{ label: t("stat_period"), value: d.date || date }]}
            />
          </div>

          {/* 3 — status row */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {ANALYTICS_STATUSES.map((s, i) => (
              <motion.div
                key={s}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.04, type: "spring", stiffness: 300, damping: 26 }}
                className="flex items-center gap-2.5 rounded-xl border border-border bg-background px-3 py-2.5 shadow-soft"
              >
                <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", STATUS_DOT[s])} />
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-muted-foreground">
                    {t(`status_${s}`)}
                  </p>
                  <p className="font-display text-lg font-extrabold leading-tight text-foreground">
                    {grouped(statusCounts[s])}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* 4 — payments: donut + table */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Panel icon={PieIcon} title={t("payment_share")} index={0}>
              {pieData.length === 0 ? (
                <EmptyState icon={PieIcon} title={t("no_info")} />
              ) : (
                <div className="flex flex-col items-center gap-4 sm:flex-row">
                  <div className="relative h-52 w-52 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          dataKey="percent"
                          nameKey="label"
                          cx="50%"
                          cy="50%"
                          innerRadius={58}
                          outerRadius={84}
                          paddingAngle={2}
                          stroke="none"
                        >
                          {pieData.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<PieTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                        {t("payment_leader")}
                      </span>
                      <span className="font-display text-sm font-extrabold text-foreground">
                        {leader && leader.percent > 0 ? `${leader.percent}%` : t("no_info")}
                      </span>
                      {leader && leader.percent > 0 ? (
                        <span className="text-[11px] font-semibold text-muted-foreground">
                          {leader.label}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <ul className="flex-1 space-y-1.5 self-stretch">
                    {pieData.map((p, i) => (
                      <li key={p.type || i} className="flex items-center gap-2 text-sm">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                        />
                        <span className="flex-1 truncate font-semibold text-foreground">
                          {p.label}
                        </span>
                        <span className="font-bold text-muted-foreground">{p.percent}%</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Panel>

            <Panel icon={Wallet} title={t("payment_systems")} index={1}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    <tr className="border-b border-border">
                      <th className="py-2 pr-2">{t("col_num")}</th>
                      <th className="py-2 pr-2">{t("col_payment_type")}</th>
                      <th className="py-2 pr-2 text-right">{t("col_count")}</th>
                      <th className="py-2 pr-2 text-right">{t("col_percent")}</th>
                      <th className="py-2 text-right">{t("col_sum")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p, i) => (
                      <tr key={p.type || i} className="border-b border-border/70">
                        <td className="py-2 pr-2 text-muted-foreground">{i + 1}</td>
                        <td className="py-2 pr-2 font-semibold text-foreground">{p.label}</td>
                        <td className="py-2 pr-2 text-right text-muted-foreground">{p.count}</td>
                        <td className="py-2 pr-2 text-right text-muted-foreground">{p.percent}%</td>
                        <td className="py-2 text-right font-bold text-foreground">{grouped(p.sum)}</td>
                      </tr>
                    ))}
                    <tr className="bg-muted/50 font-bold">
                      <td className="py-2.5 pr-2" colSpan={2}>{t("total_row")}</td>
                      <td className="py-2.5 pr-2 text-right">{paymentTotals.count}</td>
                      <td className="py-2.5 pr-2 text-right">100%</td>
                      <td className="py-2.5 text-right">{grouped(paymentTotals.sum)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>

          {/* 5 — two hourly line charts */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Panel icon={TrendingUp} title={t("finance_by_hour")} index={0}>
              <HourlyChart data={d.hourly?.finance} color="#2563EB" money />
            </Panel>
            <Panel icon={Clock} title={t("orders_by_hour")} index={1}>
              <HourlyChart data={d.hourly?.orders} color="#059669" />
            </Panel>
          </div>

          {/* 6 — geography map + clients */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Panel icon={MapPin} title={t("orders_geography")} className="lg:col-span-2" index={0}>
              <GeographyMap geography={d.geography} />
            </Panel>
            <Panel icon={Users} title={t("clients_panel")} index={1}>
              <RankedList
                items={topCustomers.slice(0, 8)}
                emptyIcon={Users}
                render={(c) => (
                  <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                    <span className="truncate font-semibold text-foreground">{c.name || "—"}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {grouped(c.orders_count)} {t("orders_count_col")}
                    </span>
                  </div>
                )}
              />
            </Panel>
          </div>

          {/* 7 — three cards row */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Panel icon={BarChart3} title={t("popular_products")} index={0}>
              <RankedList
                items={topProducts.slice(0, 8)}
                emptyIcon={Package2}
                render={(p) => (
                  <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                    <span className="truncate font-semibold text-foreground">{p.name}</span>
                    <span className="shrink-0 text-right">
                      <span className="block text-xs text-muted-foreground">×{grouped(p.qty)}</span>
                      <span className="block text-xs font-bold text-foreground">{grouped(p.revenue)}</span>
                    </span>
                  </div>
                )}
              />
            </Panel>
            <Panel icon={Users} title={t("top_customers")} index={1}>
              <RankedList
                items={topCustomers.slice(0, 8)}
                emptyIcon={Users}
                render={(c) => (
                  <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                    <span className="truncate font-semibold text-foreground">{c.name || "—"}</span>
                    <span className="shrink-0 text-xs font-bold text-foreground">
                      {grouped(c.total_spent)}
                    </span>
                  </div>
                )}
              />
            </Panel>
            <Panel icon={Eye} title={t("product_views")} index={2}>
              <RankedList
                items={productViews.slice(0, 8)}
                emptyIcon={Eye}
                render={(p) => (
                  <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                    <span className="truncate font-semibold text-foreground">{p.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{grouped(p.views)}</span>
                  </div>
                )}
              />
            </Panel>
          </div>

          {/* 8 — reviews */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Panel icon={Star} title={t("product_reviews")} index={0}>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: t("review_average"), value: `${num(reviews.average).toFixed(1)}/5` },
                  { label: t("review_total"), value: grouped(reviews.count) },
                  { label: t("review_comment_share"), value: `${num(reviews.comment_share)}%` },
                  { label: t("review_low_share"), value: `${num(reviews.low_share)}%` },
                ].map((m, i) => (
                  <div key={i} className="rounded-xl border border-border bg-muted/30 p-3">
                    <p className="font-display text-lg font-extrabold text-foreground">{m.value}</p>
                    <p className="text-xs text-muted-foreground">{m.label}</p>
                  </div>
                ))}
              </div>
              {num(reviews.low_share) >= 20 ? (
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-xs font-bold text-destructive">
                  <AlertTriangle className="h-4 w-4" strokeWidth={2.3} />
                  {t("review_quality_risk")}
                </div>
              ) : null}
              <p className="mt-4 mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {t("review_distribution")}
              </p>
              <RatingBars distribution={reviews.distribution} total={num(reviews.count)} />
            </Panel>

            <Panel icon={MessageSquare} title={t("recent_reviews")} index={1}>
              {reviewRecent.length === 0 ? (
                <EmptyState icon={MessageSquare} title={t("no_data_period")} />
              ) : (
                <ul className="space-y-2">
                  {reviewRecent.slice(0, 6).map((r, i) => (
                    <li key={i} className="rounded-xl border border-border bg-muted/30 p-3">
                      <div className="flex items-center gap-1 text-amber-400">
                        {Array.from({ length: 5 }).map((_, s) => (
                          <Star
                            key={s}
                            className={cn(
                              "h-3.5 w-3.5",
                              s < num(r.rating) ? "fill-amber-400" : "text-muted-foreground/30"
                            )}
                          />
                        ))}
                      </div>
                      {r.comment ? (
                        <p className="mt-1.5 text-sm text-foreground">{r.comment}</p>
                      ) : null}
                      {r.author || r.product ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {[r.author, r.product].filter(Boolean).join(" · ")}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          {/* 9 — customer segments */}
          <Panel icon={Users} title={t("customer_segments")} index={0}>
            {segments.length === 0 ? (
              <EmptyState icon={Users} title={t("no_data_period")} />
            ) : (
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={segmentChart} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E4ECFC" vertical={false} />
                      <XAxis
                        dataKey="short"
                        tick={{ fill: "#64748B", fontSize: 11, fontWeight: 600 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: "#64748B", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        width={44}
                        tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)}
                      />
                      <Tooltip cursor={{ fill: "#F1F5FD" }} content={<SegmentTooltip />} />
                      <Bar dataKey="sales" radius={[8, 8, 0, 0]}>
                        {segmentChart.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      <tr className="border-b border-border">
                        <th className="py-2 pr-2">{t("col_segment")}</th>
                        <th className="py-2 pr-2 text-right">{t("col_customers")}</th>
                        <th className="py-2 pr-2 text-right">{t("col_sales_qty")}</th>
                        <th className="py-2 text-right">{t("col_sum")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {segments.map((s, i) => (
                        <tr key={i} className="border-b border-border/70">
                          <td className="py-2 pr-2 font-semibold text-foreground">{s.name}</td>
                          <td className="py-2 pr-2 text-right text-muted-foreground">{grouped(s.customers)}</td>
                          <td className="py-2 pr-2 text-right text-muted-foreground">{grouped(s.sales_qty)}</td>
                          <td className="py-2 text-right font-bold text-foreground">{grouped(s.sum)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}

function SegmentTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-xl border border-border bg-background px-3 py-2 text-xs shadow-lift">
      <p className="font-bold text-foreground">{p.name}</p>
      <p className="mt-0.5 text-muted-foreground">
        {t("col_sales_qty")}: <span className="font-bold text-foreground">{grouped(p.sales)}</span>
      </p>
      <p className="text-muted-foreground">
        {t("col_sum")}: <span className="font-bold text-foreground">{grouped(p.sum)}</span>
      </p>
    </div>
  );
}

function PeriodControl({ value, onChange }) {
  return (
    <div className="flex items-center rounded-xl border border-border bg-background p-0.5 shadow-soft">
      {PERIODS.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          className={cn(
            "relative rounded-lg px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm",
            value === p ? "text-primary-foreground" : "text-muted-foreground"
          )}
        >
          {value === p ? (
            <motion.span
              layoutId="analytics-period"
              className="absolute inset-0 -z-0 rounded-lg bg-gradient-to-r from-primary to-secondary"
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
            />
          ) : null}
          <span className="relative z-10">{t(`period_${p}`)}</span>
        </button>
      ))}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
      <Skeleton className="h-80 rounded-2xl" />
    </div>
  );
}
