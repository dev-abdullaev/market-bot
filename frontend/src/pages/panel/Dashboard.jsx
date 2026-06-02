import { useEffect, useState } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart3,
  LayoutDashboard,
  Receipt,
  TrendingUp,
  Wallet,
} from "lucide-react";
import api from "../../lib/api";
import { t } from "../../lib/i18n";
import { formatPrice } from "../../lib/format";
import { cn } from "../../lib/cn";
import { PageHeader, EmptyState, Skeleton } from "../../components/panel/common";

const PERIODS = ["today", "7d", "30d", "all"];
const BAR_COLORS = ["#2563EB", "#6366F1", "#059669", "#0EA5E9", "#8B5CF6"];

/** Animated count-up that respects reduced motion and formats on the fly. */
function CountUp({ value, format }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => format(Math.round(v)));
  useEffect(() => {
    if (reduce) {
      mv.set(value);
      return;
    }
    const controls = animate(mv, value, { duration: 0.9, ease: "easeOut" });
    return () => controls.stop();
  }, [value, mv, reduce]);
  return <motion.span>{text}</motion.span>;
}

function StatCard({ icon: Icon, tint, label, value, format, index }) {
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
      className="rounded-2xl border border-border bg-background p-5 shadow-soft"
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-xl",
            tint
          )}
        >
          <Icon className="h-5 w-5" strokeWidth={2.3} />
        </span>
      </div>
      <p className="mt-4 font-display text-2xl font-extrabold tracking-tight text-foreground">
        <CountUp value={Number(value) || 0} format={format} />
      </p>
      <p className="mt-0.5 text-sm font-semibold text-muted-foreground">
        {label}
      </p>
    </motion.div>
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
              layoutId="period-active"
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

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-xl border border-border bg-background px-3 py-2 text-xs shadow-lift">
      <p className="font-bold text-foreground">{p.name}</p>
      <p className="mt-0.5 text-muted-foreground">
        {t("revenue")}: <span className="font-bold text-foreground">{formatPrice(p.revenue)}</span>
      </p>
      <p className="text-muted-foreground">
        {t("qty_short")}: <span className="font-bold text-foreground">{p.qty}</span>
      </p>
    </div>
  );
}

export default function Dashboard() {
  const reduce = useReducedMotion();
  const [period, setPeriod] = useState("today");
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    // Mark loading asynchronously so we don't trigger a synchronous cascade.
    Promise.resolve().then(() => {
      if (alive) setLoading(true);
    });
    api
      .get("/admin/stats", { params: { period } })
      .then((r) => {
        if (alive) setStats(r.data);
      })
      .catch(() => {
        if (alive) setStats(null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [period]);

  const top = Array.isArray(stats?.top_products) ? stats.top_products : [];
  const chartData = top.slice(0, 6).map((p) => ({
    name: p.name,
    short: p.name?.length > 12 ? p.name.slice(0, 12) + "…" : p.name,
    revenue: Number(p.revenue) || 0,
    qty: Number(p.qty) || 0,
  }));

  return (
    <div>
      <PageHeader
        icon={LayoutDashboard}
        title={t("nav_dashboard")}
        action={<PeriodControl value={period} onChange={setPeriod} />}
      />

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              index={0}
              icon={Wallet}
              tint="bg-primary/10 text-primary"
              label={t("revenue")}
              value={stats?.revenue}
              format={(v) => formatPrice(v)}
            />
            <StatCard
              index={1}
              icon={Receipt}
              tint="bg-secondary/10 text-secondary"
              label={t("orders_count")}
              value={stats?.orders_count}
              format={(v) => String(v)}
            />
            <StatCard
              index={2}
              icon={TrendingUp}
              tint="bg-accent/10 text-accent"
              label={t("avg_check")}
              value={stats?.avg_check}
              format={(v) => formatPrice(v)}
            />
          </div>

          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 26, delay: 0.18 }}
            className="rounded-2xl border border-border bg-background p-5 shadow-soft"
          >
            <div className="mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" strokeWidth={2.3} />
              <h2 className="font-display text-base font-extrabold text-foreground">
                {t("top_products")}
              </h2>
            </div>

            {chartData.length === 0 ? (
              <EmptyState icon={BarChart3} title={t("no_data")} />
            ) : (
              <>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#E4ECFC"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="short"
                        tick={{ fill: "#64748B", fontSize: 12, fontWeight: 600 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: "#64748B", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={56}
                        tickFormatter={(v) =>
                          v >= 1000 ? `${Math.round(v / 1000)}k` : v
                        }
                      />
                      <Tooltip
                        cursor={{ fill: "#F1F5FD" }}
                        content={<ChartTooltip />}
                      />
                      <Bar
                        dataKey="revenue"
                        radius={[8, 8, 0, 0]}
                        isAnimationActive={!reduce}
                        animationDuration={700}
                      >
                        {chartData.map((_, i) => (
                          <Cell
                            key={i}
                            fill={BAR_COLORS[i % BAR_COLORS.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-5 overflow-hidden rounded-xl border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2.5">{t("product")}</th>
                        <th className="px-4 py-2.5 text-right">{t("qty_short")}</th>
                        <th className="px-4 py-2.5 text-right">{t("revenue")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {top.map((p, i) => (
                        <tr
                          key={`${p.name}-${i}`}
                          className="border-t border-border"
                        >
                          <td className="px-4 py-2.5 font-semibold text-foreground">
                            {p.name}
                          </td>
                          <td className="px-4 py-2.5 text-right text-muted-foreground">
                            {p.qty}
                          </td>
                          <td className="px-4 py-2.5 text-right font-bold text-foreground">
                            {formatPrice(p.revenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
