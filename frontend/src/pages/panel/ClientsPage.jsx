import { useEffect, useState } from "react";
import api from "../../lib/api.js";
import { t } from "../../lib/i18n.js";
import Spinner from "../../components/Spinner.jsx";

const fmt = (n) => Number(n || 0).toLocaleString("ru-RU", { maximumFractionDigits: 0 });

export default function ClientsPage() {
  const [rows, setRows] = useState(null);

  useEffect(() => {
    api.get("/admin/customers").then((r) => setRows(r.data)).catch(() => setRows([]));
  }, []);

  if (!rows) return <Spinner />;

  return (
    <div className="card">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="h5 mb-0"><i className="bi bi-people me-2 text-primary" />{t("clients")}</h2>
          <span className="badge bg-primary rounded-pill">{rows.length}</span>
        </div>
        {rows.length === 0 ? (
          <div className="empty-state"><i className="bi bi-person-x" />{t("no_data")}</div>
        ) : (
          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead>
                <tr className="text-muted small text-uppercase">
                  <th>{t("name")}</th>
                  <th>{t("phone")}</th>
                  <th className="text-center">{t("orders")}</th>
                  <th className="text-end">{t("total")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id}>
                    <td className="fw-semibold">
                      <i className="bi bi-person-circle me-2 text-secondary" />
                      {c.full_name || "—"}
                    </td>
                    <td className="text-muted">{c.phone || "—"}</td>
                    <td className="text-center">
                      <span className="badge rounded-pill text-bg-light border">{c.orders_count}</span>
                    </td>
                    <td className="text-end fw-bold">{fmt(c.total_spent)} <span className="text-muted small fw-normal">so'm</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
