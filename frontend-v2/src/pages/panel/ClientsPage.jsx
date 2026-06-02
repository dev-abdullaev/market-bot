import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Phone, Users } from "lucide-react";
import api from "../../lib/api";
import { t } from "../../lib/i18n";
import { formatPrice } from "../../lib/format";
import { asList } from "../../lib/panel";
import { Badge } from "../../components/ui/Badge";
import { Card } from "../../components/ui/Card";
import {
  EmptyState,
  PageHeader,
  SkeletonList,
} from "../../components/panel/common";

function initials(name) {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

export default function ClientsPage() {
  const reduce = useReducedMotion();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api
      .get("/admin/customers")
      .then((r) => alive && setClients(asList(r.data)))
      .catch(() => alive && setClients([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div>
      <PageHeader icon={Users} title={t("nav_clients")} />

      {loading ? (
        <SkeletonList rows={5} />
      ) : clients.length === 0 ? (
        <EmptyState icon={Users} title={t("no_clients")} />
      ) : (
        <Card className="overflow-hidden">
          {/* Desktop table */}
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">{t("name")}</th>
                  <th className="px-5 py-3">{t("phone")}</th>
                  <th className="px-5 py-3 text-center">{t("orders_count_short")}</th>
                  <th className="px-5 py-3 text-right">{t("total_spent")}</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c, i) => (
                  <motion.tr
                    key={c.id}
                    initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 320,
                      damping: 28,
                      delay: Math.min(i * 0.025, 0.2),
                    }}
                    className="border-t border-border transition-colors hover:bg-muted/50"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-xs font-bold text-primary-foreground">
                          {initials(c.full_name)}
                        </span>
                        <span className="font-semibold text-foreground">
                          {c.full_name || "—"}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {c.phone || "—"}
                    </td>
                    <td className="px-5 py-3 text-center font-bold text-foreground">
                      {c.orders_count ?? 0}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Badge variant="accent">{formatPrice(c.total_spent || 0)}</Badge>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="divide-y divide-border sm:hidden">
            {clients.map((c, i) => (
              <motion.div
                key={c.id}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 320,
                  damping: 28,
                  delay: Math.min(i * 0.03, 0.2),
                }}
                className="flex items-center gap-3 p-4"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-xs font-bold text-primary-foreground">
                  {initials(c.full_name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-foreground">
                    {c.full_name || "—"}
                  </p>
                  {c.phone ? (
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" strokeWidth={2.2} />
                      {c.phone}
                    </p>
                  ) : null}
                </div>
                <div className="text-right">
                  <Badge variant="accent">{formatPrice(c.total_spent || 0)}</Badge>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {c.orders_count ?? 0} {t("orders_count_short")}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
