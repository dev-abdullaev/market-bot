import { useEffect, useState } from "react";
import api from "../../lib/api.js";
import { t } from "../../lib/i18n.js";
import Spinner from "../../components/Spinner.jsx";

const PERIODS = [["today", "today"], ["7d", "d7"], ["30d", "d30"], ["all", "all"]];

const fmt = (n) => {
  const v = Number(n || 0);
  return v.toLocaleString("ru-RU", { maximumFractionDigits: 0 });
};

const CARDS = [
  { key: "revenue", labelKey: "revenue", icon: "bi-cash-stack", tint: "#059669", bg: "#ECFDF5", suffix: " so'm" },
  { key: "orders_count", labelKey: "orders_count", icon: "bi-receipt", tint: "#2563EB", bg: "#EFF6FF", suffix: "" },
  { key: "avg_check", labelKey: "avg_check", icon: "bi-graph-up-arrow", tint: "#6366F1", bg: "#EEF2FF", suffix: " so'm" },
];

export default function Dashboard() {
  const [period, setPeriod] = useState("today");
  const [data, setData] = useState(null);

  useEffect(() => {
    let active = true;
    api.get(`/admin/stats?period=${period}`)
      .then((r) => { if (active) setData(r.data); })
      .catch(() => { if (active) setData({}); });
    return () => { active = false; };
  }, [period]);

  const top = data?.top_products || [];
  const maxQty = top.reduce((m, p) => Math.max(m, p.qty || 0), 0) || 1;

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <p className="section-eyebrow mb-0 text-muted">
          <i className="bi bi-bar-chart-line me-2" />{t("dashboard")}
        </p>
        <div className="seg-control" role="tablist" aria-label="Period">
          {PERIODS.map(([val, lab]) => (
            <button key={val} type="button" className={period === val ? "active" : ""}
              onClick={() => setPeriod(val)} aria-pressed={period === val}>{t(lab)}</button>
          ))}
        </div>
      </div>

      {!data ? <Spinner /> : (
        <>
          <div className="row g-3 mb-4">
            {CARDS.map((c) => (
              <div className="col-12 col-md-4" key={c.key}>
                <div className="card stat-card card-hover h-100">
                  <div className="card-body d-flex align-items-center gap-3">
                    <span className="icon-chip" style={{ background: c.bg, color: c.tint }}>
                      <i className={`bi ${c.icon}`} />
                    </span>
                    <div>
                      <div className="stat-label">{t(c.labelKey)}</div>
                      <div className="stat-value">{fmt(data[c.key])}<span className="fs-6 text-muted">{c.suffix}</span></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card-body">
              <h2 className="h5 mb-3"><i className="bi bi-trophy me-2 text-warning" />{t("top_products")}</h2>
              {top.length === 0 ? (
                <div className="empty-state"><i className="bi bi-inbox" />{t("no_data")}</div>
              ) : (
                <div className="table-responsive">
                  <table className="table align-middle mb-0">
                    <thead>
                      <tr className="text-muted small text-uppercase">
                        <th>{t("products")}</th>
                        <th style={{ width: "40%" }}>{t("qty")}</th>
                        <th className="text-end">{t("revenue")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {top.map((p, i) => (
                        <tr key={i}>
                          <td className="fw-semibold">{p.name}</td>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <div className="bar-track flex-grow-1">
                                <div className="bar-fill" style={{ width: `${(p.qty / maxQty) * 100}%` }} />
                              </div>
                              <span className="small fw-semibold" style={{ minWidth: 28 }}>{p.qty}</span>
                            </div>
                          </td>
                          <td className="text-end fw-semibold">{fmt(p.revenue)} <span className="text-muted small">so'm</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
