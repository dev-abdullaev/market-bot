import { useEffect, useState } from "react";
import api from "../../lib/api.js";
import { t } from "../../lib/i18n.js";
import Spinner from "../../components/Spinner.jsx";

const STATUSES = ["new", "preparing", "delivering", "delivered", "cancelled"];
const fmt = (n) => Number(n || 0).toLocaleString("ru-RU", { maximumFractionDigits: 0 });

export default function OrdersTab() {
  const [orders, setOrders] = useState(null);
  const load = () => api.get("/admin/orders").then((r) => setOrders(r.data)).catch(() => setOrders([]));
  useEffect(() => { load(); }, []);
  const setStatus = async (id, status) => { await api.patch(`/admin/orders/${id}/status`, { status }); load(); };

  if (!orders) return <Spinner />;
  if (orders.length === 0)
    return <div className="card"><div className="empty-state"><i className="bi bi-receipt" />{t("no_data")}</div></div>;

  return (
    <div className="row g-3">
      {orders.map((o) => (
        <div className="col-12 col-md-6 col-xl-4" key={o.id}>
          <div className="card card-hover h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div>
                  <div className="fw-bold">#{o.id}</div>
                  <div className="h5 mb-0">{fmt(o.total_amount)} <span className="text-muted small fw-normal">so'm</span></div>
                </div>
                <span className={`status-pill status-${o.status}`}>{o.status}</span>
              </div>
              <div className="small text-muted mb-2">
                <i className="bi bi-telephone me-1" />{o.customer_phone || "—"}
                {o.delivery_address && <><br /><i className="bi bi-geo-alt me-1" />{o.delivery_address}</>}
              </div>
              <ul className="list-unstyled small mb-3 border-top pt-2">
                {o.items.map((i) => (
                  <li key={i.id} className="d-flex justify-content-between">
                    <span>{i.product_name}</span><span className="text-muted">× {i.quantity}</span>
                  </li>
                ))}
              </ul>
              <select className="form-select form-select-sm" value={o.status}
                onChange={(e) => setStatus(o.id, e.target.value)} aria-label="Status">
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
